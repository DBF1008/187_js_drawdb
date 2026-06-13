import { useCallback, useContext, useEffect, useState, useMemo } from "react";
import { IdContext } from "../../Workspace";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  Dropdown,
  Spin,
  Steps,
  Tag,
  Toast,
} from "@douyinfe/semi-ui";
import { IconPlus, IconMore } from "@douyinfe/semi-icons";
import {
  create,
  getCommitsWithFile,
  getVersion,
  patch,
  get,
  VERSION_FILENAME,
} from "../../../api/gists";
import _ from "lodash";
import { DateTime } from "luxon";
import {
  useAreas,
  useDiagram,
  useEnums,
  useLayout,
  useNotes,
  useTransform,
  useTypes,
} from "../../../hooks";
import useNavigateWithParams from "../../../hooks/useNavigateWithParams";
import { databases } from "../../../data/databases";
import { loadCache, saveCache } from "../../../utils/cache";
import { createDiagramBranch } from "../../../utils/createBranch";
import Migration from "./Migration";

const LIMIT = 10;

export default function Versions({ open, title, setTitle }) {
  const { gistId, setGistId, version, setVersion } = useContext(IdContext);
  const { areas, setAreas } = useAreas();
  const { setLayout } = useLayout();
  const { database, tables, relationships, setTables, setRelationships } =
    useDiagram();
  const { notes, setNotes } = useNotes();
  const { types, setTypes } = useTypes();
  const { enums, setEnums } = useEnums();
  const { transform } = useTransform();
  const { t, i18n } = useTranslation();
  const navigate = useNavigateWithParams();
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(null);
  const [compareSelection, setCompareSelection] = useState([]);
  const [migrationPair, setMigrationPair] = useState(null);

  const cacheRef = useMemo(() => loadCache(), []);

  const diagramToString = useCallback(() => {
    return JSON.stringify({
      title,
      tables,
      relationships: relationships,
      notes: notes,
      subjectAreas: areas,
      database: database,
      ...(databases[database].hasTypes && { types: types }),
      ...(databases[database].hasEnums && { enums: enums }),
      transform: transform,
    });
  }, [
    areas,
    notes,
    tables,
    relationships,
    database,
    title,
    enums,
    types,
    transform,
  ]);

  const currentStep = useMemo(() => {
    if (!version) return 0;
    return versions.findIndex((v) => v.version === version);
  }, [version, versions]);

  const loadVersion = useCallback(
    async (sha) => {
      try {
        setLoadingVersion(sha);
        const version = await getVersion(gistId, sha);
        setVersion(sha);
        setLayout((prev) => ({ ...prev, readOnly: true }));

        if (!version.data.files[VERSION_FILENAME]) {
          return;
        }

        const content = version.data.files[VERSION_FILENAME].content;
        const parsedDiagram = JSON.parse(content);

        setTables(parsedDiagram.tables);
        setRelationships(parsedDiagram.relationships);
        setAreas(parsedDiagram.subjectAreas);
        setNotes(parsedDiagram.notes);
        setTitle(parsedDiagram.title);

        if (databases[database].hasTypes) {
          setTypes(parsedDiagram.types);
        }

        if (databases[database].hasEnums) {
          setEnums(parsedDiagram.enums);
        }
      } catch (e) {
        Toast.error(t("failed_to_load_diagram"));
      } finally {
        setLoadingVersion(null);
      }
    },
    [
      t,
      gistId,
      setTables,
      setRelationships,
      setAreas,
      setVersion,
      setLayout,
      database,
      setNotes,
      setTypes,
      setEnums,
      setTitle,
    ],
  );

  const getRevisions = useCallback(
    async (cursorParam) => {
      try {
        if (!gistId) return;

        setIsLoading(true);

        const cached = cacheRef[gistId];
        if (cached && !cursorParam) {
          setVersions(cached.versions);
          setCursor(cached.cursor);
          setHasMore(cached.hasMore);
          setIsLoading(false);
          return;
        }

        const res = await getCommitsWithFile(
          gistId,
          VERSION_FILENAME,
          LIMIT,
          cursorParam,
        );

        const newVersions = cursorParam ? [...versions, ...res.data] : res.data;

        setVersions(newVersions);
        setHasMore(res.pagination.hasMore);
        setCursor(res.pagination.cursor);

        cacheRef[gistId] = {
          versions: newVersions,
          cursor: res.pagination.cursor,
          hasMore: res.pagination.hasMore,
        };
        saveCache(cacheRef);
      } catch (e) {
        Toast.error(t("oops_smth_went_wrong"));
      } finally {
        setIsLoading(false);
      }
    },
    [gistId, versions, t, cacheRef],
  );

  const hasDiagramChanged = async () => {
    if (!gistId) return true;

    const previousVersion = await get(gistId);

    if (!previousVersion.data.files[VERSION_FILENAME]) {
      return true;
    }

    const previousDiagram = JSON.parse(
      previousVersion.data.files[VERSION_FILENAME]?.content,
    );
    const currentDiagram = {
      title,
      tables,
      relationships: relationships,
      notes: notes,
      subjectAreas: areas,
      database: database,
      ...(databases[database].hasTypes && { types: types }),
      ...(databases[database].hasEnums && { enums: enums }),
      transform: transform,
    };

    return !_.isEqual(previousDiagram, currentDiagram);
  };

  const recordVersion = async () => {
    try {
      setIsRecording(true);
      const hasChanges = await hasDiagramChanged();
      if (!hasChanges) {
        Toast.info(t("no_changes_to_record"));
        return;
      }
      if (gistId) {
        await patch(gistId, VERSION_FILENAME, diagramToString());
      } else {
        const id = await create(VERSION_FILENAME, diagramToString());
        setGistId(id);
      }

      delete cacheRef[gistId];
      saveCache(cacheRef);

      await getRevisions();
    } catch (e) {
      Toast.error(t("failed_to_record_version"));
    } finally {
      setIsRecording(false);
    }
  };

  // Resolve the predecessor (chronologically older) of a given version. Returns
  // its sha, or null when `sha` is the oldest version (→ full CREATE migration).
  // Keeps the edge-case fetch for when the target is the last loaded item and
  // more history is available on the server.
  const resolvePreviousVersion = useCallback(
    async (sha) => {
      const currentIndex = versions.findIndex((v) => v.version === sha);
      if (currentIndex === -1) return null;

      if (currentIndex === versions.length - 1 && hasMore) {
        const res = await getCommitsWithFile(
          gistId,
          VERSION_FILENAME,
          1,
          cursor,
        );
        const prev = res.data.length ? res.data[0].version : null;
        if (prev === sha) return null;
        return prev;
      }

      return versions[currentIndex + 1]?.version ?? null;
    },
    [versions, gistId, cursor, hasMore],
  );

  // Selection order, max 2. Selecting a 3rd drops the oldest selection.
  const toggleCompare = useCallback((sha) => {
    setCompareSelection((prev) => {
      if (prev.includes(sha)) return prev.filter((s) => s !== sha);
      const next = [...prev, sha];
      if (next.length > 2) next.shift();
      return next;
    });
  }, []);

  // Order the two selected versions chronologically: in `versions` a lower
  // index is newer, so the higher-index sha is the base (from) and the
  // lower-index sha is the target (to).
  const orderedCompare = useMemo(() => {
    if (compareSelection.length < 2) return null;
    const [a, b] = compareSelection;
    const ia = versions.findIndex((v) => v.version === a);
    const ib = versions.findIndex((v) => v.version === b);
    const from = ia > ib ? a : b;
    const to = ia > ib ? b : a;
    return { from, to };
  }, [compareSelection, versions]);

  const openCompareSelection = () => {
    if (!orderedCompare) return;
    setMigrationPair(orderedCompare);
  };

  const openCompareWithPrevious = useCallback(
    async (sha) => {
      const prev = await resolvePreviousVersion(sha);
      setMigrationPair({ from: prev, to: sha });
    },
    [resolvePreviousVersion],
  );

  // Fork a historical version into a brand-new editable diagram. The new
  // diagram starts its own version history and records provenance, leaving the
  // original diagram and its history untouched.
  const restoreVersionAsBranch = useCallback(
    async (sha) => {
      try {
        setLoadingVersion(sha);
        const res = await getVersion(gistId, sha);
        const file = res.data.files[VERSION_FILENAME];
        if (!file) {
          Toast.error(t("failed_to_load_diagram"));
          return;
        }
        const parsed = JSON.parse(file.content);
        const newId = await createDiagramBranch(parsed, {
          loadedFromGistId: gistId,
          nameSuffix: " (restored)",
        });
        setVersion(null);
        setLayout((prev) => ({ ...prev, readOnly: false }));
        Toast.success(t("restore_as_new_success"));
        navigate(`/editor/diagrams/${newId}`);
      } catch (e) {
        Toast.error(t("failed_to_load_diagram"));
      } finally {
        setLoadingVersion(null);
      }
    },
    [gistId, navigate, setVersion, setLayout, t],
  );

  useEffect(() => {
    if (gistId && open) {
      getRevisions();
    }
  }, [gistId, open, getRevisions]);

  return (
    <div className="mx-5 relative h-full">
      <div className="sticky top-0 z-10 sidesheet-theme pb-2">
        <Button
          block
          icon={isRecording ? <Spin /> : <IconPlus />}
          disabled={isLoading || isRecording}
          onClick={recordVersion}
        >
          {t("record_version")}
        </Button>

        {versions.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-2 text-xs">
            <div className="opacity-70 truncate">
              {orderedCompare ? (
                <span className="font-mono">
                  {orderedCompare.from.substring(0, 7)} →{" "}
                  {orderedCompare.to.substring(0, 7)}
                </span>
              ) : (
                t("select_two_versions")
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="small"
                disabled={!orderedCompare}
                onClick={openCompareSelection}
              >
                {t("compare_versions")}
              </Button>
              {compareSelection.length > 0 && (
                <Button
                  size="small"
                  theme="borderless"
                  onClick={() => setCompareSelection([])}
                >
                  {t("clear_selection")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {(!gistId || !versions.length) && !isLoading && (
        <div className="my-3">{t("no_saved_versions")}</div>
      )}
      {gistId && (
        <div className="my-2 overflow-y-auto">
          <Steps direction="vertical" type="basic" current={currentStep}>
            {versions.map((r) => (
              <Steps.Step
                key={r.version}
                onClick={() => loadVersion(r.version)}
                className="group hover-1 first:!pt-2"
                title={
                  <div className="flex justify-between items-center w-full gap-2">
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={compareSelection.includes(r.version)}
                        onChange={() => toggleCompare(r.version)}
                      />
                      <Tag>{r.version.substring(0, 7)}</Tag>
                    </div>
                    <Dropdown
                      trigger="click"
                      position="bottomRight"
                      render={
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => loadVersion(r.version)}
                          >
                            {t("view_this_version")}
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => openCompareWithPrevious(r.version)}
                          >
                            {t("compare_with_previous")}
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => restoreVersionAsBranch(r.version)}
                          >
                            {t("restore_as_new")}
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      }
                    >
                      <Button
                        size="small"
                        theme="borderless"
                        icon={<IconMore />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  </div>
                }
                description={`${t("committed_at")} ${DateTime.fromISO(
                  r.committed_at,
                )
                  .setLocale(i18n.language)
                  .toLocaleString(DateTime.DATETIME_MED)}`}
                icon={
                  r.version === loadingVersion ? (
                    <Spin size="small" />
                  ) : (
                    <i className="text-sm fa-solid fa-asterisk ms-1" />
                  )
                }
              />
            ))}
          </Steps>
        </div>
      )}
      {isLoading && !isRecording && (
        <div className="text-blue-500 text-center my-3">
          <Spin size="middle" />
          <div>{t("loading")}</div>
        </div>
      )}
      {hasMore && !isLoading && (
        <div className="text-center">
          <Button onClick={() => getRevisions(cursor)}>{t("load_more")}</Button>
        </div>
      )}

      {migrationPair && (
        <Migration
          gistId={gistId}
          from={migrationPair.from}
          to={migrationPair.to}
          database={database}
          onClose={() => setMigrationPair(null)}
        />
      )}
    </div>
  );
}

import { useCallback, useContext, useEffect, useState, useMemo, useRef } from "react";
import { IdContext } from "../../Workspace";
import { useTranslation } from "react-i18next";
import { Button, Toast } from "@douyinfe/semi-ui";
import {
  create,
  getCommitsWithFile,
  getVersion,
  patch,
  get,
  compare,
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
import { databases } from "../../../data/databases";
import { loadCache, saveCache } from "../../../utils/cache";
import Migration from "./Migration";
import { DB } from "../../../data/constants";
import { deepDiff } from "../../../utils/diff";
import { computeDiffSummary } from "../../../utils/diffSummary";
import { generateMigrationSQL } from "../../../utils/migrations/diffToSQL";
import * as JSZip from "jszip";
import { saveAs } from "file-saver";

import VersionList from "./VersionList";
import CompareSelector from "./CompareSelector";
import ComparisonPanel from "./ComparisonPanel";
import BranchDialog from "./BranchDialog";

const LIMIT = 10;

const KEYS_TO_IGNORE = [
  "x",
  "y",
  "width",
  "height",
  "locked",
  "color",
  "title",
  "transform",
  "notes",
  "subjectAreas",
  "database",
];

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

  // ── Existing state ──
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionToCompareTo, setVersionToCompareTo] = useState(null);

  // ── New comparison state ──
  const [mode, setMode] = useState("list");
  const [versionA, setVersionA] = useState(null);
  const [versionB, setVersionB] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState(new Set());
  const [diagramA, setDiagramA] = useState(null);
  const [diffSummary, setDiffSummary] = useState(null);
  const [migrationSQL, setMigrationSQL] = useState({ up: "", down: "" });
  const [contentA, setContentA] = useState("");
  const [contentB, setContentB] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [filename, setFilename] = useState(
    `${DateTime.now().toFormat("yyyyMMddHHmmss")}-migration`,
  );
  const [branchTarget, setBranchTarget] = useState(null);
  const comparisonRef = useRef(0);

  const cacheRef = useMemo(() => loadCache(), []);

  // ── Existing functions (unchanged) ──

  const diagramToString = useCallback(() => {
    return JSON.stringify({
      title,
      tables,
      relationships,
      notes,
      subjectAreas: areas,
      database,
      ...(databases[database].hasTypes && { types }),
      ...(databases[database].hasEnums && { enums }),
      transform,
    });
  }, [areas, notes, tables, relationships, database, title, enums, types, transform]);

  const currentStep = useMemo(() => {
    if (!version) return 0;
    return versions.findIndex((v) => v.version === version);
  }, [version, versions]);

  const loadVersion = useCallback(
    async (sha) => {
      try {
        setLoadingVersion(sha);
        const ver = await getVersion(gistId, sha);
        setVersion(sha);
        setLayout((prev) => ({ ...prev, readOnly: true }));

        if (!ver.data.files[VERSION_FILENAME]) return;

        const content = ver.data.files[VERSION_FILENAME].content;
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
      } catch {
        Toast.error(t("failed_to_load_diagram"));
      } finally {
        setLoadingVersion(null);
      }
    },
    [
      t, gistId, setTables, setRelationships, setAreas, setVersion,
      setLayout, database, setNotes, setTypes, setEnums, setTitle,
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

        const newVersions = cursorParam
          ? [...versions, ...res.data]
          : res.data;

        setVersions(newVersions);
        setHasMore(res.pagination.hasMore);
        setCursor(res.pagination.cursor);

        cacheRef[gistId] = {
          versions: newVersions,
          cursor: res.pagination.cursor,
          hasMore: res.pagination.hasMore,
        };
        saveCache(cacheRef);
      } catch {
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
    if (!previousVersion.data.files[VERSION_FILENAME]) return true;

    const previousDiagram = JSON.parse(
      previousVersion.data.files[VERSION_FILENAME]?.content,
    );
    const currentDiagram = {
      title,
      tables,
      relationships,
      notes,
      subjectAreas: areas,
      database,
      ...(databases[database].hasTypes && { types }),
      ...(databases[database].hasEnums && { enums }),
      transform,
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
    } catch {
      Toast.error(t("failed_to_record_version"));
    } finally {
      setIsRecording(false);
    }
  };

  const getVersionToCompareTo = useCallback(async () => {
    if (!selectedVersion) return null;
    const currentIndex = versions.findIndex(
      (v) => v.version === selectedVersion,
    );
    if (currentIndex === -1) return null;

    if (currentIndex === versions.length - 1 && hasMore) {
      const res = await getCommitsWithFile(
        gistId,
        VERSION_FILENAME,
        1,
        cursor,
      );
      const ver = res.data.length ? res.data[0].version : "null";
      if (ver === selectedVersion) return null;
      return ver;
    }
    return versions[currentIndex + 1]?.version || "null";
  }, [selectedVersion, versions, gistId, cursor, hasMore]);

  useEffect(() => {
    const getVersionToCompare = async () => {
      const v = await getVersionToCompareTo();
      setVersionToCompareTo(v);
    };
    getVersionToCompare();
  }, [selectedVersion, getVersionToCompareTo]);

  useEffect(() => {
    if (gistId && open) {
      getRevisions();
    }
  }, [gistId, open, getRevisions]);

  // ── New comparison functions ──

  const runComparison = useCallback(async () => {
    if (!versionA || !versionB || !gistId) return;

    const thisRun = ++comparisonRef.current;
    setIsComparing(true);

    try {
      const { data } = await compare(
        gistId,
        VERSION_FILENAME,
        versionA,
        versionB,
      );

      if (thisRun !== comparisonRef.current) return;

      const parsedA = data.contentA ? JSON.parse(data.contentA) : {};
      const parsedB = data.contentB ? JSON.parse(data.contentB) : {};

      setDiagramA(parsedA);
      setContentA(JSON.stringify(parsedA, null, 2));
      setContentB(
        data.contentB
          ? JSON.stringify(JSON.parse(data.contentB), null, 2)
          : "",
      );

      const diffObj = {};
      deepDiff(parsedB, parsedA, diffObj, KEYS_TO_IGNORE);
      setDiffSummary(computeDiffSummary(diffObj));

      const db = parsedA.database || parsedB.database;
      if (db && db !== DB.GENERIC) {
        setMigrationSQL(
          generateMigrationSQL(diffObj, db, {
            from: parsedB,
            to: parsedA,
          }),
        );
      } else {
        setMigrationSQL({ up: "", down: "" });
      }

      setFilename(
        `${DateTime.now().toFormat("yyyyMMddHHmmss")}-migration`,
      );
      setActiveTab("summary");
      setMode("compare");
    } catch {
      if (thisRun === comparisonRef.current) {
        Toast.error(t("failed_to_compare"));
      }
    } finally {
      if (thisRun === comparisonRef.current) {
        setIsComparing(false);
      }
    }
  }, [gistId, versionA, versionB, t]);

  const toggleVersionSelect = useCallback((sha) => {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) {
        next.delete(sha);
      } else {
        if (next.size >= 2) {
          const first = next.values().next().value;
          next.delete(first);
        }
        next.add(sha);
      }
      return next;
    });
  }, []);

  const handleGenerateMigration = useCallback(
    (sha) => {
      const idx = versions.findIndex((v) => v.version === sha);
      const neighbor = versions[idx + 1]?.version || "null";
      setVersionA(sha);
      setVersionB(neighbor);
      // Use setTimeout to allow state updates before running
      setTimeout(() => {
        comparisonRef.current++;
        const thisRun = comparisonRef.current;
        setIsComparing(true);

        compare(gistId, VERSION_FILENAME, sha, neighbor)
          .then(({ data }) => {
            if (thisRun !== comparisonRef.current) return;

            const parsedA = data.contentA ? JSON.parse(data.contentA) : {};
            const parsedB = data.contentB
              ? JSON.parse(data.contentB)
              : {};

            setDiagramA(parsedA);
            setContentA(JSON.stringify(parsedA, null, 2));
            setContentB(
              data.contentB
                ? JSON.stringify(JSON.parse(data.contentB), null, 2)
                : "",
            );

            const diffObj = {};
            deepDiff(parsedB, parsedA, diffObj, KEYS_TO_IGNORE);
            setDiffSummary(computeDiffSummary(diffObj));

            const db = parsedA.database || parsedB.database;
            if (db && db !== DB.GENERIC) {
              setMigrationSQL(
                generateMigrationSQL(diffObj, db, {
                  from: parsedB,
                  to: parsedA,
                }),
              );
            } else {
              setMigrationSQL({ up: "", down: "" });
            }

            setFilename(
              `${DateTime.now().toFormat("yyyyMMddHHmmss")}-migration`,
            );
            setActiveTab("summary");
            setMode("compare");
          })
          .catch(() => {
            if (thisRun === comparisonRef.current) {
              Toast.error(t("failed_to_compare"));
            }
          })
          .finally(() => {
            if (thisRun === comparisonRef.current) {
              setIsComparing(false);
            }
          });
      }, 0);
    },
    [versions, gistId, t],
  );

  const handleCompareFromSelection = useCallback(() => {
    const shas = [...selectedVersions];
    if (shas.length !== 2) return;
    setVersionA(shas[1]);
    setVersionB(shas[0]);
    setTimeout(() => {
      comparisonRef.current++;
      const thisRun = comparisonRef.current;
      setIsComparing(true);

      compare(gistId, VERSION_FILENAME, shas[1], shas[0])
        .then(({ data }) => {
          if (thisRun !== comparisonRef.current) return;

          const parsedA = data.contentA ? JSON.parse(data.contentA) : {};
          const parsedB = data.contentB
            ? JSON.parse(data.contentB)
            : {};

          setDiagramA(parsedA);
          setContentA(JSON.stringify(parsedA, null, 2));
          setContentB(
            data.contentB
              ? JSON.stringify(JSON.parse(data.contentB), null, 2)
              : "",
          );

          const diffObj = {};
          deepDiff(parsedB, parsedA, diffObj, KEYS_TO_IGNORE);
          setDiffSummary(computeDiffSummary(diffObj));

          const db = parsedA.database || parsedB.database;
          if (db && db !== DB.GENERIC) {
            setMigrationSQL(
              generateMigrationSQL(diffObj, db, {
                from: parsedB,
                to: parsedA,
              }),
            );
          } else {
            setMigrationSQL({ up: "", down: "" });
          }

          setFilename(
            `${DateTime.now().toFormat("yyyyMMddHHmmss")}-migration`,
          );
          setActiveTab("summary");
          setMode("compare");
        })
        .catch(() => {
          if (thisRun === comparisonRef.current) {
            Toast.error(t("failed_to_compare"));
          }
        })
        .finally(() => {
          if (thisRun === comparisonRef.current) {
            setIsComparing(false);
          }
        });
    }, 0);
  }, [selectedVersions, gistId, t]);

  const handleDownloadZip = useCallback(() => {
    if (!migrationSQL?.up) return;
    const JSZipConstructor = JSZip.default || JSZip;
    const zip = new JSZipConstructor();
    zip.file(`${filename}.up.sql`, migrationSQL.up);
    zip.file(`${filename}.down.sql`, migrationSQL.down);
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${filename}.zip`);
    });
  }, [filename, migrationSQL]);

  const handleOpenFullMigration = useCallback(() => {
    setSelectedVersion(versionA);
    setVersionToCompareTo(versionB);
  }, [versionA, versionB]);

  const handleBackToList = useCallback(() => {
    setMode("list");
    setSelectedVersions(new Set());
  }, []);

  const handleSwap = useCallback(() => {
    setVersionA(versionB);
    setVersionB(versionA);
  }, [versionA, versionB]);

  // ── Render ──

  return (
    <div className="mx-5 relative h-full">
      {mode === "list" ? (
        <>
          {gistId && (
            <VersionList
              versions={versions}
              currentStep={currentStep}
              loadingVersion={loadingVersion}
              hasMore={hasMore}
              isLoading={isLoading}
              isRecording={isRecording}
              selectedVersions={selectedVersions}
              database={database}
              onToggleSelect={toggleVersionSelect}
              onLoadVersion={loadVersion}
              onRecordVersion={recordVersion}
              onLoadMore={() => getRevisions(cursor)}
              onGenerateMigration={handleGenerateMigration}
              onBranch={setBranchTarget}
            />
          )}
          {(!gistId || !versions.length) && !isLoading && (
            <>
              <div className="sticky top-0 z-10 sidesheet-theme pb-2">
                <Button
                  block
                  disabled={isLoading || isRecording}
                  onClick={recordVersion}
                >
                  {isRecording ? t("loading") : t("record_version")}
                </Button>
              </div>
              <div className="my-3">{t("no_saved_versions")}</div>
            </>
          )}
          {selectedVersions.size === 2 && (
            <div className="sticky bottom-0 z-10 sidesheet-theme pt-2">
              <Button
                block
                theme="solid"
                type="primary"
                onClick={handleCompareFromSelection}
              >
                {t("compare_versions")}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <CompareSelector
            versionA={versionA}
            versionB={versionB}
            versions={versions}
            onChangeA={setVersionA}
            onChangeB={setVersionB}
            onSwap={handleSwap}
            onCompare={runComparison}
            onBack={handleBackToList}
            isComparing={isComparing}
          />
          <ComparisonPanel
            diffSummary={diffSummary}
            migrationSQL={migrationSQL}
            contentA={contentA}
            contentB={contentB}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filename={filename}
            setFilename={setFilename}
            onDownloadZip={handleDownloadZip}
            isComparing={isComparing}
            onOpenFullMigration={handleOpenFullMigration}
          />
        </>
      )}

      {branchTarget && (
        <BranchDialog
          sha={branchTarget}
          gistId={gistId}
          visible={!!branchTarget}
          onClose={() => setBranchTarget(null)}
          title={title}
        />
      )}

      <Migration
        gistId={gistId}
        selectedVersion={selectedVersion}
        versionToCompareTo={versionToCompareTo || ""}
        setSelectedVersion={setSelectedVersion}
      />
    </div>
  );
}

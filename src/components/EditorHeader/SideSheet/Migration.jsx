import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabPane, Modal, Input, Tag, Spin, Collapse } from "@douyinfe/semi-ui";
import { DiffEditor } from "@monaco-editor/react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../hooks";
import { compare, VERSION_FILENAME } from "../../../api/gists";
import { deepDiff } from "../../../utils/diff";
import { summarizeDiff } from "../../../utils/migrations/diffSummary";
import { DateTime } from "luxon";
import CodeEditor from "../../CodeEditor";
import { generateMigrationSQL } from "../../../utils/migrations/diffToSQL";
import * as JSZip from "jszip";
import { saveAs } from "file-saver";

const SECTION_KEYS = [
  "tables",
  "fields",
  "indices",
  "relationships",
  "types",
  "enums",
];

function itemLabel(item) {
  if (typeof item === "string") return item;
  const base = item.table ? `${item.table}.${item.name}` : item.name;
  if (item.changes?.length) return `${base} · ${item.changes.join(", ")}`;
  return base;
}

function ChangeRow({ label, color, items }) {
  if (!items.length) return null;
  return (
    <div className="mb-2 last:mb-0">
      <div className="text-xs font-semibold opacity-60 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <Tag key={i} color={color} size="small">
            {itemLabel(it)}
          </Tag>
        ))}
      </div>
    </div>
  );
}

function Loader({ label }) {
  return (
    <div className="text-blue-500 flex flex-col gap-2 justify-center items-center h-[24rem]">
      <Spin size="middle" />
      <div>{label}</div>
    </div>
  );
}

export default function Migration({ gistId, from, to, database, onClose }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [contentA, setContentA] = useState(""); // newer (to)
  const [contentB, setContentB] = useState(""); // older (from)
  const [summary, setSummary] = useState(null);
  const [filename, setFilename] = useState(
    `${DateTime.now().toFormat("yyyyMMddHHmmss")}-migration`,
  );
  const [migrationSQL, setMigrationSQL] = useState({
    up: "",
    down: "",
  });

  const getDiff = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await compare(
        gistId,
        VERSION_FILENAME,
        to,
        from || "null",
      );

      const diagramTo = data.contentA ? JSON.parse(data.contentA) : {};
      const diagramFrom = data.contentB ? JSON.parse(data.contentB) : {};

      setContentA(JSON.stringify(diagramTo, null, 2));
      setContentB(data.contentB ? JSON.stringify(diagramFrom, null, 2) : "");

      const effectiveDb = diagramTo.database ?? diagramFrom.database ?? database;

      const keysToIgnore = [
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

      const diff = {};
      deepDiff(diagramFrom, diagramTo, diff, keysToIgnore);

      setMigrationSQL(
        generateMigrationSQL(diff, effectiveDb, {
          from: diagramFrom,
          to: diagramTo,
        }),
      );
      setSummary(summarizeDiff(diagramFrom, diagramTo, effectiveDb));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [gistId, from, to, database]);

  const handleConfirm = () => {
    if (!migrationSQL?.up) {
      onClose();
      return;
    }

    const JSZipConstructor = JSZip.default || JSZip;
    const zip = new JSZipConstructor();

    zip.file(`${filename}.up.sql`, migrationSQL.up);
    zip.file(`${filename}.down.sql`, migrationSQL.down);

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, `${filename}.zip`);
    });

    onClose();
  };

  useEffect(() => {
    if (!gistId || !to) return;
    getDiff();
  }, [getDiff, gistId, to]);

  const activeSummaryKeys = useMemo(() => {
    if (!summary) return [];
    return SECTION_KEYS.filter((k) => summary[k] && summary.counts[k] > 0);
  }, [summary]);

  if (!to) return null;

  return (
    <Modal
      centered
      size="medium"
      title={
        <div>
          <div className="flex items-center gap-2">
            {t("migrations")} <Tag color="blue">Beta</Tag>
          </div>
          <div className="text-xs font-normal opacity-60 mt-1">
            {t("comparing_versions")} {from ? from.substring(0, 7) : "∅"} →{" "}
            {to.substring(0, 7)}
          </div>
        </div>
      }
      visible={!!to}
      onCancel={onClose}
      onOk={handleConfirm}
    >
      <Tabs
        lazyRender
        keepDOM={false}
        className="h-[26rem] -mt-3"
        defaultActiveKey="summary"
      >
        <TabPane tab={t("summary")} itemKey="summary">
          {loading && <Loader label={t("loading")} />}

          {!loading && summary && summary.hasChanges && (
            <div className="h-[24rem] overflow-y-auto pr-1">
              <Collapse defaultActiveKey={activeSummaryKeys}>
                {SECTION_KEYS.map((key) => {
                  const section = summary[key];
                  if (!section) return null;
                  const count = summary.counts[key];
                  if (!count) return null;
                  return (
                    <Collapse.Panel
                      key={key}
                      itemKey={key}
                      header={`${t(key)} (${count})`}
                    >
                      <ChangeRow
                        label={t("added")}
                        color="green"
                        items={section.added}
                      />
                      <ChangeRow
                        label={t("removed")}
                        color="red"
                        items={section.removed}
                      />
                      <ChangeRow
                        label={t("modified")}
                        color="amber"
                        items={section.modified}
                      />
                    </Collapse.Panel>
                  );
                })}
              </Collapse>
            </div>
          )}

          {!loading && summary && !summary.hasChanges && (
            <div className="text-center opacity-60 mt-44">
              {t("no_changes_detected")}
            </div>
          )}
        </TabPane>

        <TabPane tab={t("scripts")} itemKey="scripts">
          {loading && <Loader label={t("loading")} />}

          {!loading && migrationSQL?.up && (
            <>
              <CodeEditor
                language="sql"
                height="9rem"
                filename={`${filename}.up.sql`}
                value={migrationSQL.up}
                options={{ readOnly: true }}
              />
              <CodeEditor
                language="sql"
                height="9rem"
                filename={`${filename}.down.sql`}
                value={migrationSQL.down}
                className="mt-2"
                options={{ readOnly: true }}
              />
            </>
          )}

          {!loading && !migrationSQL?.up && (
            <div className="text-center opacity-60 mt-44">
              {t("no_migration_needed")}
            </div>
          )}
        </TabPane>

        <TabPane tab={t("json_diff")} itemKey="json_diff">
          {!loading && (
            <DiffEditor
              original={contentB}
              modified={contentA}
              options={{ readOnly: true }}
              height="22rem"
              theme={settings.mode === "light" ? "vs" : "vs-dark"}
              language="json"
            />
          )}
          {loading && <Loader label={t("loading")} />}
        </TabPane>
      </Tabs>
      <div className="text-sm font-semibold mt-2">{t("filename")}:</div>
      <Input
        value={filename}
        placeholder={t("filename")}
        suffix={<div className="p-2">.zip</div>}
        onChange={(value) => setFilename(value)}
        field="filename"
      />
    </Modal>
  );
}

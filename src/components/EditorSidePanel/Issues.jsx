import { useState, useEffect } from "react";
import { Collapse, Badge, Button, Tooltip, Toast } from "@douyinfe/semi-ui";
import { arrayIsEqual, getTableHeight } from "../../utils/utils";
import { getIssues, IssueSeverity, IssueCategory } from "../../utils/issues";
import {
  useEnums,
  useSettings,
  useDiagram,
  useTypes,
  useSelect,
  useTransform,
  useUndoRedo,
  useLayout,
} from "../../hooks";
import {
  Action,
  ObjectType,
  tableWidth as defaultTableWidth,
} from "../../data/constants";
import { useTranslation } from "react-i18next";

const CATEGORY_ORDER = [
  IssueCategory.TABLE,
  IssueCategory.FIELD,
  IssueCategory.INDEX,
  IssueCategory.TYPE,
  IssueCategory.ENUM,
  IssueCategory.RELATIONSHIP,
];

const SEVERITY_ORDER = [IssueSeverity.ERROR, IssueSeverity.WARNING];

function groupIssues(list, mode, labels) {
  const order = mode === "severity" ? SEVERITY_ORDER : CATEGORY_ORDER;
  const keyOf =
    mode === "severity" ? (i) => i.severity : (i) => i.category;
  const buckets = {};
  list.forEach((issue) => {
    const key = keyOf(issue);
    (buckets[key] ||= []).push(issue);
  });
  return order
    .filter((key) => buckets[key]?.length)
    .map((key) => ({ key, label: labels[key], items: buckets[key] }));
}

function IssueRow({ issue, onLocate, onFix, readOnly, t }) {
  const isError = issue.severity === IssueSeverity.ERROR;
  return (
    <div
      className="group flex items-center gap-2 py-1 px-1 rounded-sm hover-1 cursor-pointer"
      onClick={() => onLocate(issue)}
      title={issue.message}
    >
      <i
        className={`fa-solid text-xs ${
          isError
            ? "fa-circle-exclamation text-red-500"
            : "fa-triangle-exclamation text-yellow-500"
        }`}
      />
      <div className="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
        {issue.message}
      </div>
      {issue.fix && !readOnly && (
        <Tooltip content={t("issue_fix")}>
          <Button
            size="small"
            theme="borderless"
            type="tertiary"
            className="opacity-0 group-hover:opacity-100"
            icon={<i className="fa-solid fa-wand-magic-sparkles" />}
            onClick={(e) => {
              e.stopPropagation();
              onFix(issue);
            }}
          />
        </Tooltip>
      )}
      <Tooltip content={t("issue_locate")}>
        <Button
          size="small"
          theme="borderless"
          type="tertiary"
          className="opacity-60 group-hover:opacity-100"
          icon={<i className="fa-solid fa-crosshairs" />}
          onClick={(e) => {
            e.stopPropagation();
            onLocate(issue);
          }}
        />
      </Tooltip>
    </div>
  );
}

function FilterChip({ active, color, onClick, children }) {
  const activeClass =
    color === "red"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : color === "amber"
        ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
        : "segmented-item-active shadow-sm";
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-sm text-xs whitespace-nowrap transition-all ${
        active ? activeClass : "opacity-60 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function Issues() {
  const { types } = useTypes();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { enums } = useEnums();
  const { tables, relationships, database, updateField, updateTable } =
    useDiagram();
  const { setSelectedElement } = useSelect();
  const { setTransform } = useTransform();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { layout } = useLayout();
  const [issues, setIssues] = useState([]);
  const [groupBy, setGroupBy] = useState("category");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    const findIssues = async () => {
      const newIssues = getIssues({
        tables: tables,
        relationships: relationships,
        types: types,
        database: database,
        enums: enums,
      });

      if (!arrayIsEqual(newIssues, issues)) {
        setIssues(newIssues);
      }
    };

    findIssues();
  }, [tables, relationships, issues, types, database, enums]);

  const errorCount = issues.filter(
    (i) => i.severity === IssueSeverity.ERROR,
  ).length;
  const warningCount = issues.length - errorCount;

  const visibleIssues =
    severityFilter === "all"
      ? issues
      : issues.filter((i) => i.severity === severityFilter);

  const categoryLabel = {
    [IssueCategory.TABLE]: t("issue_cat_table"),
    [IssueCategory.FIELD]: t("issue_cat_field"),
    [IssueCategory.INDEX]: t("issue_cat_index"),
    [IssueCategory.TYPE]: t("issue_cat_type"),
    [IssueCategory.ENUM]: t("issue_cat_enum"),
    [IssueCategory.RELATIONSHIP]: t("issue_cat_relationship"),
  };
  const severityLabel = {
    [IssueSeverity.ERROR]: t("severity_error"),
    [IssueSeverity.WARNING]: t("severity_warning"),
  };

  const groups = groupIssues(
    visibleIssues,
    groupBy,
    groupBy === "severity" ? severityLabel : categoryLabel,
  );

  const focusCanvasOn = (target) => {
    const width = settings.tableWidth ?? defaultTableWidth;
    let focusTable = null;

    if (target.element === ObjectType.TABLE) {
      focusTable = tables.find((tb) => tb.id === target.id);
    } else if (target.element === ObjectType.RELATIONSHIP) {
      const rel = relationships.find((r) => r.id === target.id);
      if (rel) focusTable = tables.find((tb) => tb.id === rel.startTableId);
    }

    if (!focusTable) return;

    const height = getTableHeight(
      focusTable,
      width,
      settings.showComments,
      relationships,
    );
    setTransform((prev) => ({
      ...prev,
      pan: { x: focusTable.x + width / 2, y: focusTable.y + height / 2 },
    }));
  };

  const locate = (issue) => {
    const { target } = issue;
    setSelectedElement((prev) => ({
      ...prev,
      currentTab: target.tab,
      element: target.element,
      id: target.id,
      open: true,
    }));
    focusCanvasOn(target);
    setTimeout(() => {
      document
        .getElementById(target.scrollId)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (target.fieldIndex != null) {
        document
          .getElementById(`scroll_table_${target.id}_input_${target.fieldIndex}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 60);
  };

  const applyFix = (issue) => {
    if (layout.readOnly || !issue.fix) return;
    const fix = issue.fix;

    if (fix.kind === "CLEAR_FIELD_DEFAULT") {
      const table = tables.find((tb) => tb.id === fix.tableId);
      const field = table?.fields.find((f) => f.id === fix.fieldId);
      if (!field || field.default === "") return;

      setUndoStack((prev) => [
        ...prev,
        {
          action: Action.EDIT,
          element: ObjectType.TABLE,
          component: "field",
          tid: fix.tableId,
          fid: fix.fieldId,
          undo: { default: field.default },
          redo: { default: "" },
          message: t("edit_table", {
            tableName: table.name,
            extra: "[field]",
          }),
        },
      ]);
      setRedoStack([]);
      updateField(fix.tableId, fix.fieldId, { default: "" });
      Toast.success(t("issue_fixed"));
    } else if (fix.kind === "REMOVE_INDEX") {
      const table = tables.find((tb) => tb.id === fix.tableId);
      if (!table) return;
      const oldIndices = table.indices;
      const newIndices = oldIndices.filter(
        (idx, i) => !(i === fix.indexPos && idx.fields.length === 0),
      );
      if (newIndices.length === oldIndices.length) return;

      setUndoStack((prev) => [
        ...prev,
        {
          action: Action.EDIT,
          element: ObjectType.TABLE,
          component: "self",
          tid: fix.tableId,
          undo: { indices: oldIndices },
          redo: { indices: newIndices },
          message: t("edit_table", {
            tableName: table.name,
            extra: "[delete index]",
          }),
        },
      ]);
      setRedoStack([]);
      updateTable(fix.tableId, { indices: newIndices });
      Toast.success(t("issue_fixed"));
    }
  };

  return (
    <Collapse lazyRender keepDOM={false} style={{ width: "100%" }}>
      <Collapse.Panel
        header={
          <Badge
            type={issues.length > 0 ? "danger" : "primary"}
            count={settings.strictMode ? null : issues.length}
            overflowCount={99}
            className="mt-1"
          >
            <div className="pe-3 select-none">
              <i className="fa-solid fa-triangle-exclamation me-2 text-yellow-500" />
              {t("issues")}
            </div>
          </Badge>
        }
        itemKey="1"
      >
        {settings.strictMode ? (
          <div className="max-h-[160px] overflow-y-auto">
            <div className="mb-1">{t("strict_mode_is_on_no_issues")}</div>
          </div>
        ) : issues.length === 0 ? (
          <div className="max-h-[160px] overflow-y-auto">
            <div>{t("no_issues")}</div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="segmented-bg inline-flex items-center p-0.5 rounded-sm text-xs">
                <button
                  className={`segmented-item px-2 py-0.5 rounded-sm transition-all ${
                    groupBy === "category"
                      ? "segmented-item-active font-medium shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  onClick={() => setGroupBy("category")}
                >
                  {t("issues_by_type")}
                </button>
                <button
                  className={`segmented-item px-2 py-0.5 rounded-sm transition-all ${
                    groupBy === "severity"
                      ? "segmented-item-active font-medium shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  onClick={() => setGroupBy("severity")}
                >
                  {t("issues_by_severity")}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <FilterChip
                  active={severityFilter === "all"}
                  onClick={() => setSeverityFilter("all")}
                >
                  {t("issues_all")} ({issues.length})
                </FilterChip>
                <FilterChip
                  active={severityFilter === IssueSeverity.ERROR}
                  color="red"
                  onClick={() => setSeverityFilter(IssueSeverity.ERROR)}
                >
                  {t("issues_errors")} ({errorCount})
                </FilterChip>
                <FilterChip
                  active={severityFilter === IssueSeverity.WARNING}
                  color="amber"
                  onClick={() => setSeverityFilter(IssueSeverity.WARNING)}
                >
                  {t("issues_warnings")} ({warningCount})
                </FilterChip>
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto pe-1">
              {visibleIssues.length === 0 ? (
                <div className="py-2 opacity-60">{t("no_issues")}</div>
              ) : (
                groups.map((group) => (
                  <div key={group.key} className="mb-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-50 mb-1 px-1">
                      <span>{group.label}</span>
                      <span>({group.items.length})</span>
                    </div>
                    {group.items.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        onLocate={locate}
                        onFix={applyFix}
                        readOnly={layout.readOnly}
                        t={t}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Collapse.Panel>
    </Collapse>
  );
}

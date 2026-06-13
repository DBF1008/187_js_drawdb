import { useState, useEffect, useMemo, useCallback } from "react";
import { Collapse, Badge, Tag, Checkbox, Tooltip, Button } from "@douyinfe/semi-ui";
import { IconBolt, IconExternalOpen } from "@douyinfe/semi-icons";
import { getIssues } from "../../utils/issues";
import { navigateToIssue } from "../../utils/issueNavigation";
import { applyAutoFix, getAutoFixLabel } from "../../utils/issueAutoFix";
import { ObjectType } from "../../data/constants";
import {
  useEnums,
  useSettings,
  useDiagram,
  useTypes,
  useSelect,
  useTransform,
} from "../../hooks";
import { useTranslation } from "react-i18next";

const severityColors = {
  error: "red",
  warning: "orange",
};

const objectTypeLabels = {
  [ObjectType.TABLE]: "tables",
  [ObjectType.RELATIONSHIP]: "relationships",
  [ObjectType.TYPE]: "types",
  [ObjectType.ENUM]: "enums",
};

export default function Issues() {
  const { types } = useTypes();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { enums, updateEnum } = useEnums();
  const { tables, relationships, database, updateTable, updateField } =
    useDiagram();
  const { setSelectedElement } = useSelect();
  const { setTransform } = useTransform();
  const [issues, setIssues] = useState([]);

  const [severityFilter, setSeverityFilter] = useState({
    error: true,
    warning: true,
  });
  const [typeFilter, setTypeFilter] = useState({
    [ObjectType.TABLE]: true,
    [ObjectType.RELATIONSHIP]: true,
    [ObjectType.TYPE]: true,
    [ObjectType.ENUM]: true,
  });

  useEffect(() => {
    const newIssues = getIssues({
      tables,
      relationships,
      types,
      database,
      enums,
    });

    // Compare by issue IDs to avoid unnecessary re-renders
    const newIds = newIssues.map((i) => i.id).sort().join(",");
    const oldIds = issues.map((i) => i.id).sort().join(",");
    if (newIds !== oldIds) {
      setIssues(newIssues);
    }
  }, [tables, relationships, types, database, enums]);

  const severityCounts = useMemo(() => {
    return issues.reduce(
      (acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      },
      { error: 0, warning: 0 },
    );
  }, [issues]);

  const typeCounts = useMemo(() => {
    return issues.reduce((acc, issue) => {
      acc[issue.objectType] = (acc[issue.objectType] || 0) + 1;
      return acc;
    }, {});
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(
      (issue) =>
        severityFilter[issue.severity] && typeFilter[issue.objectType],
    );
  }, [issues, severityFilter, typeFilter]);

  const handleNavigate = useCallback(
    (issue) => {
      navigateToIssue(issue, {
        setSelectedElement,
        setTransform,
        tables,
      });
    },
    [setSelectedElement, setTransform, tables],
  );

  const handleAutoFix = useCallback(
    (issue, e) => {
      e.stopPropagation();
      applyAutoFix(issue, {
        updateTable,
        updateField,
        updateEnum,
        tables,
        enums,
      });
    },
    [updateTable, updateField, updateEnum, tables, enums],
  );

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
        <div className="max-h-[300px] overflow-y-auto">
          {settings.strictMode ? (
            <div className="mb-1">{t("strict_mode_is_on_no_issues")}</div>
          ) : issues.length > 0 ? (
            <>
              {/* Filter bar */}
              <div className="mb-2 space-y-1.5">
                {/* Severity filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Checkbox
                    checked={severityFilter.error}
                    onChange={(e) =>
                      setSeverityFilter((prev) => ({
                        ...prev,
                        error: e.target.checked,
                      }))
                    }
                  >
                    <Tag
                      color={severityColors.error}
                      size="small"
                      className="me-1"
                    >
                      {severityCounts.error}
                    </Tag>
                    {t("issue_errors")}
                  </Checkbox>
                  <Checkbox
                    checked={severityFilter.warning}
                    onChange={(e) =>
                      setSeverityFilter((prev) => ({
                        ...prev,
                        warning: e.target.checked,
                      }))
                    }
                  >
                    <Tag
                      color={severityColors.warning}
                      size="small"
                      className="me-1"
                    >
                      {severityCounts.warning}
                    </Tag>
                    {t("issue_warnings")}
                  </Checkbox>
                </div>
                {/* Type filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    ObjectType.TABLE,
                    ObjectType.RELATIONSHIP,
                    ObjectType.TYPE,
                    ObjectType.ENUM,
                  ].map((type) => {
                    if (!typeCounts[type]) return null;
                    return (
                      <Checkbox
                        key={type}
                        checked={typeFilter[type]}
                        onChange={(e) =>
                          setTypeFilter((prev) => ({
                            ...prev,
                            [type]: e.target.checked,
                          }))
                        }
                      >
                        <Tag size="small" className="me-1">
                          {typeCounts[type]}
                        </Tag>
                        {t(objectTypeLabels[type])}
                      </Checkbox>
                    );
                  })}
                </div>
              </div>

              {/* Issue list */}
              {filteredIssues.length === 0 ? (
                <div className="py-2 text-sm opacity-60">
                  {t("no_matching_issues")}
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onNavigate={handleNavigate}
                    onAutoFix={handleAutoFix}
                    t={t}
                  />
                ))
              )}
            </>
          ) : (
            <div>{t("no_issues")}</div>
          )}
        </div>
      </Collapse.Panel>
    </Collapse>
  );
}

function IssueRow({ issue, onNavigate, onAutoFix, t }) {
  const autoFixLabelKey = issue.autoFixable
    ? getAutoFixLabel(issue.issueType)
    : null;

  return (
    <div
      className="flex items-start gap-1.5 py-1.5 px-1 rounded cursor-pointer hover:bg-semi-grey-1 transition-colors group"
      onClick={() => onNavigate(issue)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(issue);
        }
      }}
    >
      <Tag
        color={severityColors[issue.severity]}
        size="small"
        className="mt-0.5 shrink-0"
      >
        {issue.severity === "error" ? t("issue_error") : t("issue_warning")}
      </Tag>
      <span className="text-sm flex-1 min-w-0">{issue.message}</span>
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip content={t("click_to_navigate")}>
          <IconExternalOpen
            size="extra-small"
            className="text-semi-grey-6 cursor-pointer"
          />
        </Tooltip>
        {issue.autoFixable && (
          <Tooltip content={t(autoFixLabelKey)}>
            <Button
              theme="borderless"
              size="small"
              type="primary"
              icon={<IconBolt size="small" />}
              onClick={(e) => onAutoFix(issue, e)}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

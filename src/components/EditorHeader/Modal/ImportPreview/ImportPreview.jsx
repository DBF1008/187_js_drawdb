import { useMemo, useCallback } from "react";
import { Tabs, TabPane, Banner } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { databases } from "../../../../data/databases";
import { useDiagram } from "../../../../hooks";
import { getComparisonStats } from "../../../../utils/importPreview";
import CategoryTab from "./CategoryTab";

/**
 * ImportPreview - Main preview container showing tabbed categories of import items.
 *
 * @param {{
 *   comparison: object,    // from buildComparison()
 *   setComparison: (fn: (prev) => object) => void,
 * }} props
 */
export default function ImportPreview({ comparison, setComparison }) {
  const { t } = useTranslation();
  const { database } = useDiagram();
  const dbInfo = databases[database];

  const stats = useMemo(() => getComparisonStats(comparison), [comparison]);

  // Determine which categories to show
  const categories = useMemo(() => {
    const cats = [
      { key: "tables", label: t("tables") },
      { key: "relationships", label: t("relationships") },
    ];

    if (dbInfo.hasTypes) {
      cats.push({ key: "types", label: t("types") });
    }
    if (dbInfo.hasEnums) {
      cats.push({ key: "enums", label: t("enums") });
    }

    // Always show areas and notes tabs if there's data
    if ((comparison.areas ?? []).length > 0) {
      cats.push({ key: "areas", label: t("subject_areas") });
    }
    if ((comparison.notes ?? []).length > 0) {
      cats.push({ key: "notes", label: t("notes") });
    }

    return cats.filter((c) => (comparison[c.key] ?? []).length > 0);
  }, [comparison, dbInfo, t]);

  // Find first category with data for default tab
  const defaultTab = categories.length > 0 ? categories[0].key : "tables";

  const handleUpdateItem = useCallback(
    (category, index, patch) => {
      setComparison((prev) => {
        const updated = [...prev[category]];
        updated[index] = { ...updated[index], ...patch };
        return { ...prev, [category]: updated };
      });
    },
    [setComparison],
  );

  // Count overwrite items for summary
  const overwriteCount = useMemo(() => {
    let count = 0;
    for (const cat of Object.values(comparison)) {
      for (const item of cat) {
        if (
          item.selected &&
          item.status === "conflict" &&
          (item.action === "overwrite" || item.action === "rename")
        ) {
          count++;
        }
      }
    }
    return count;
  }, [comparison]);

  if (categories.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-500">
        {t("no_items_to_import")}
      </div>
    );
  }

  return (
    <div>
      {/* Summary banner */}
      <div className="mb-3">
        <Banner
          type="info"
          fullMode={false}
          description={
            <div className="text-sm">
              {t("import_summary", {
                newCount: stats.newCount,
                overwriteCount,
              })}
              {stats.conflictCount > 0 && (
                <span className="ml-2 text-zinc-500">
                  ({t("conflicts_count", { count: stats.conflictCount })})
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Category tabs */}
      <Tabs type="card" defaultActiveKey={defaultTab} size="small">
        {categories.map((cat) => (
          <TabPane
            key={cat.key}
            tab={`${cat.label} (${(comparison[cat.key] ?? []).length})`}
            itemKey={cat.key}
          >
            <div className="pt-2">
              <CategoryTab
                items={comparison[cat.key] ?? []}
                category={cat.key}
                onUpdateItem={(index, patch) =>
                  handleUpdateItem(cat.key, index, patch)
                }
              />
            </div>
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Input, Button } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import ItemRow from "./ItemRow";

/**
 * CategoryTab - Per-category tab showing a filterable, selectable list of items.
 *
 * @param {{
 *   items: Array,          // ComparisonItems for this category
 *   category: string,      // "tables" | "relationships" | etc.
 *   onUpdateItem: (index: number, patch: object) => void,
 * }} props
 */
export default function CategoryTab({ items, category, onUpdateItem }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");

  const filteredItems = useMemo(() => {
    if (!filter) return items;
    const lowerFilter = filter.toLowerCase();
    return items.filter((item) => {
      const name =
        category === "notes"
          ? item.incoming.title ?? item.incoming.name
          : item.incoming.name;
      return (name ?? "").toLowerCase().includes(lowerFilter);
    });
  }, [items, filter, category]);

  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const noneSelected = items.every((i) => !i.selected);

  const handleSelectAll = () => {
    items.forEach((item, idx) => {
      if (!item.selected) {
        onUpdateItem(idx, { selected: true });
      }
    });
  };

  const handleDeselectAll = () => {
    items.forEach((item, idx) => {
      if (item.selected) {
        onUpdateItem(idx, { selected: false });
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-500 text-sm">
        {t("no_items_to_import")}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2 mb-3 items-center">
        <div className="flex-1">
          <Input
            prefix={<IconSearch />}
            placeholder={t("search")}
            value={filter}
            onChange={setFilter}
            size="small"
          />
        </div>
        <Button
          size="small"
          theme="borderless"
          type="tertiary"
          onClick={handleSelectAll}
          disabled={allSelected}
        >
          {t("select_all")}
        </Button>
        <Button
          size="small"
          theme="borderless"
          type="tertiary"
          onClick={handleDeselectAll}
          disabled={noneSelected}
        >
          {t("deselect_all")}
        </Button>
      </div>

      {/* Item list */}
      <div className="space-y-0.5 max-h-[320px] overflow-auto">
        {filteredItems.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-sm">
            {t("no_items_to_import")}
          </div>
        ) : (
          filteredItems.map((item) => {
            const originalIndex = items.indexOf(item);
            return (
              <ItemRow
                key={`${category}-${item.incoming.id}-${originalIndex}`}
                item={item}
                category={category}
                onToggle={(selected) =>
                  onUpdateItem(originalIndex, { selected })
                }
                onActionChange={(action) =>
                  onUpdateItem(originalIndex, { action, selected: true })
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}

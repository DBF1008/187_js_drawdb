import { Checkbox, Tag, Select, Button, Popover } from "@douyinfe/semi-ui";
import { IconEyeOpened } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { CONFLICT_ACTION } from "../../../../utils/importPreview";
import DiffView from "./DiffView";

/**
 * ItemRow - A single row in the import preview list.
 * Shows checkbox, name, status tag, and conflict resolution controls.
 *
 * @param {{
 *   item: object,           // ComparisonItem from buildComparison
 *   category: string,       // "tables" | "relationships" | etc.
 *   onToggle: (selected: boolean) => void,
 *   onActionChange: (action: string) => void,
 * }} props
 */
export default function ItemRow({
  item,
  category,
  onToggle,
  onActionChange,
}) {
  const { t } = useTranslation();

  const getSubtitle = () => {
    switch (category) {
      case "tables":
        return item.incoming.fields
          ? t("fields_count", { count: item.incoming.fields.length })
          : "";
      case "relationships":
        return item.incoming.cardinality
          ? item.incoming.cardinality.replace(/_/g, " ")
          : "";
      case "enums":
        return item.incoming.values
          ? t("values_count", { count: item.incoming.values.length })
          : "";
      case "types":
        return item.incoming.fields
          ? t("fields_count", { count: item.incoming.fields.length })
          : "";
      case "areas":
        return "";
      case "notes":
        return item.incoming.title ?? item.incoming.name ?? "";
      default:
        return "";
    }
  };

  const displayName =
    category === "notes"
      ? item.incoming.title ?? item.incoming.name
      : item.incoming.name;

  const subtitle = getSubtitle();

  return (
    <div className="flex items-center gap-2 py-2 px-1 hover-1 rounded">
      <Checkbox
        checked={item.selected}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`select ${displayName}`}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{displayName}</div>
        {subtitle && (
          <div className="text-xs text-zinc-500 truncate">{subtitle}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.status === "new" ? (
          <Tag color="green" size="small">
            {t("new_item")}
          </Tag>
        ) : (
          <>
            <Tag color="orange" size="small">
              {t("conflict")}
            </Tag>
            <Select
              size="small"
              value={item.action}
              onChange={onActionChange}
              style={{ width: 120 }}
              disabled={!item.selected}
            >
              <Select.Option value={CONFLICT_ACTION.SKIP}>
                {t("skip")}
              </Select.Option>
              <Select.Option value={CONFLICT_ACTION.OVERWRITE}>
                {t("overwrite")}
              </Select.Option>
              <Select.Option value={CONFLICT_ACTION.RENAME}>
                {t("rename_import")}
              </Select.Option>
            </Select>
            {item.diff && (
              <Popover
                content={
                  <DiffView diff={item.diff} category={category} />
                }
                position="leftTop"
                showArrow
              >
                <Button
                  icon={<IconEyeOpened />}
                  size="small"
                  theme="borderless"
                  type="tertiary"
                />
              </Popover>
            )}
          </>
        )}
      </div>
    </div>
  );
}

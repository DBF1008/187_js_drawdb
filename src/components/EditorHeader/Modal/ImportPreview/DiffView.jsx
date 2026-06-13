import { Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";

/**
 * DiffView - Shows a field-level diff for a single item in a popover.
 * @param {{ diff: object, category: string }} props
 */
export default function DiffView({ diff }) {
  const { t } = useTranslation();

  if (!diff || Object.keys(diff).length === 0) {
    return (
      <div className="p-2 text-sm text-zinc-500">
        {t("no_changes_preview")}
      </div>
    );
  }

  const entries = Object.entries(diff);

  return (
    <div className="p-2 max-w-[400px] max-h-[300px] overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-color">
            <th className="text-start py-1 pr-2 font-semibold text-zinc-500">
              {t("name")}
            </th>
            <th className="text-start py-1 pr-2 font-semibold text-zinc-500">
              {t("current")}
            </th>
            <th className="text-start py-1 font-semibold text-zinc-500">
              {t("incoming")}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([path, change]) => {
            const fromStr = formatValue(change.from);
            const toStr = formatValue(change.to);
            const isAdd = change.from === null || change.from === undefined;
            const isRemove =
              change.to === null || change.to === undefined;

            return (
              <tr key={path} className="border-b border-color/50">
                <td className="py-1 pr-2 font-mono text-zinc-600 max-w-[120px] truncate">
                  {path.split("#").pop()}
                </td>
                <td className="py-1 pr-2">
                  {isAdd ? (
                    <span className="text-zinc-400">-</span>
                  ) : (
                    <span className="text-red-600">{fromStr}</span>
                  )}
                </td>
                <td className="py-1">
                  {isRemove ? (
                    <Tag color="red" size="small">
                      {t("removed")}
                    </Tag>
                  ) : isAdd ? (
                    <span className="text-green-600">{toStr}</span>
                  ) : (
                    <span className="text-orange-600">{toStr}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return "-";
  if (typeof val === "object") {
    try {
      const str = JSON.stringify(val);
      return str.length > 60 ? str.slice(0, 57) + "..." : str;
    } catch {
      return String(val);
    }
  }
  const str = String(val);
  return str.length > 40 ? str.slice(0, 37) + "..." : str;
}

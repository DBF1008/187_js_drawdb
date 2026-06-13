import { Button, Select } from "@douyinfe/semi-ui";
import { IconDoubleChevronLeft } from "@douyinfe/semi-icons";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

export default function CompareSelector({
  versionA,
  versionB,
  versions,
  onChangeA,
  onChangeB,
  onSwap,
  onCompare,
  onBack,
  isComparing,
}) {
  const { t } = useTranslation();

  const versionOptions = versions.map((v) => ({
    value: v.version,
    label: `${v.version.substring(0, 7)} — ${DateTime.fromISO(v.committed_at).toLocaleString(DateTime.DATETIME_SHORT)}`,
  }));

  return (
    <div className="space-y-3 pb-3 border-b border-semi-color-border">
      <Button
        theme="borderless"
        icon={<IconDoubleChevronLeft />}
        onClick={onBack}
        size="small"
      >
        {t("back_to_list")}
      </Button>

      <div>
        <div className="text-xs font-semibold mb-1">{t("version_from")}</div>
        <Select
          placeholder={t("version_from")}
          value={versionA}
          onChange={onChangeA}
          optionList={versionOptions}
          style={{ width: "100%" }}
          filter
        />
      </div>

      <div className="text-center">
        <Button
          size="small"
          theme="borderless"
          icon={<i className="fa-solid fa-arrow-up-arrow-down text-xs" />}
          onClick={onSwap}
          disabled={!versionA || !versionB}
        >
          {t("swap_versions")}
        </Button>
      </div>

      <div>
        <div className="text-xs font-semibold mb-1">{t("version_to")}</div>
        <Select
          placeholder={t("version_to")}
          value={versionB}
          onChange={onChangeB}
          optionList={versionOptions}
          style={{ width: "100%" }}
          filter
        />
      </div>

      <Button
        block
        theme="solid"
        type="primary"
        loading={isComparing}
        disabled={!versionA || !versionB || versionA === versionB}
        onClick={onCompare}
      >
        {t("compare")}
      </Button>
    </div>
  );
}

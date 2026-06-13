import { Button, Input, Spin, Tabs, TabPane } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import StructuralSummary from "./StructuralSummary";
import MigrationPreview from "./MigrationPreview";
import JsonDiffView from "./JsonDiffView";

export default function ComparisonPanel({
  diffSummary,
  migrationSQL,
  contentA,
  contentB,
  activeTab,
  setActiveTab,
  filename,
  setFilename,
  onDownloadZip,
  isComparing,
  onOpenFullMigration,
}) {
  const { t } = useTranslation();

  if (isComparing) {
    return (
      <div className="text-blue-500 flex flex-col gap-2 justify-center items-center py-12">
        <Spin size="middle" />
        <div>{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="pt-3">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        lazyRender
        keepDOM={false}
        className="comparison-tabs"
      >
        <TabPane tab={t("summary")} itemKey="summary">
          <div className="max-h-[22rem] overflow-y-auto">
            <StructuralSummary summary={diffSummary} />
          </div>
        </TabPane>

        <TabPane tab={t("sql_migration")} itemKey="sql">
          <MigrationPreview
            migrationSQL={migrationSQL}
            filename={filename}
            onOpenFull={onOpenFullMigration}
          />
        </TabPane>

        <TabPane tab={t("json_diff")} itemKey="json">
          <JsonDiffView contentA={contentA} contentB={contentB} />
        </TabPane>
      </Tabs>

      {migrationSQL?.up && (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold">{t("filename")}:</div>
          <Input
            value={filename}
            placeholder={t("filename")}
            suffix={<div className="p-2">.zip</div>}
            onChange={setFilename}
          />
          <Button block theme="solid" onClick={onDownloadZip}>
            {t("download_zip")}
          </Button>
        </div>
      )}
    </div>
  );
}

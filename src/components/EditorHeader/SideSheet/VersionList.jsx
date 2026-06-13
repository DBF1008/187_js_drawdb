import { Button, Checkbox, Spin, Steps, Tag, Tooltip } from "@douyinfe/semi-ui";
import { IconPlus } from "@douyinfe/semi-icons";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { DB } from "../../../data/constants";

export default function VersionList({
  versions,
  currentStep,
  loadingVersion,
  hasMore,
  isLoading,
  isRecording,
  selectedVersions,
  database,
  onToggleSelect,
  onLoadVersion,
  onRecordVersion,
  onLoadMore,
  onGenerateMigration,
  onBranch,
}) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <div className="sticky top-0 z-10 sidesheet-theme pb-2">
        <Button
          block
          icon={isRecording ? <Spin /> : <IconPlus />}
          disabled={isLoading || isRecording}
          onClick={onRecordVersion}
        >
          {t("record_version")}
        </Button>
      </div>

      {(!versions.length) && !isLoading && (
        <div className="my-3">{t("no_saved_versions")}</div>
      )}

      {versions.length > 0 && (
        <div className="my-2 overflow-y-auto">
          <Steps direction="vertical" type="basic" current={currentStep}>
            {versions.map((r) => (
              <Steps.Step
                key={r.version}
                onClick={() => onLoadVersion(r.version)}
                className="group hover-1 first:!pt-2"
                title={
                  <div className="flex items-center gap-2 w-full">
                    <Checkbox
                      checked={selectedVersions.has(r.version)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect(r.version);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Tag className="shrink-0">
                      {r.version.substring(0, 7)}
                    </Tag>
                    <div className="flex-1" />
                    <Tooltip content={t("branch_from_version")}>
                      <Button
                        size="small"
                        theme="borderless"
                        icon={
                          <i className="fa-solid fa-code-branch text-xs" />
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onBranch(r.version);
                        }}
                      />
                    </Tooltip>
                    {database === DB.GENERIC ? (
                      <Tooltip content={t("migration_not_supported_generic")}>
                        <Button
                          size="small"
                          theme="borderless"
                          className="!text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateMigration(r.version);
                          }}
                          disabled
                        >
                          {t("generate_migration")}
                        </Button>
                      </Tooltip>
                    ) : (
                      <Button
                        size="small"
                        theme="borderless"
                        className="!text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateMigration(r.version);
                        }}
                      >
                        {t("generate_migration")}
                      </Button>
                    )}
                  </div>
                }
                description={`${t("committed_at")} ${DateTime.fromISO(
                  r.committed_at,
                )
                  .setLocale(i18n.language)
                  .toLocaleString(DateTime.DATETIME_MED)}`}
                icon={
                  r.version === loadingVersion ? (
                    <Spin size="small" />
                  ) : (
                    <i className="text-sm fa-solid fa-asterisk ms-1" />
                  )
                }
              />
            ))}
          </Steps>
        </div>
      )}

      {isLoading && !isRecording && (
        <div className="text-blue-500 text-center my-3">
          <Spin size="middle" />
          <div>{t("loading")}</div>
        </div>
      )}
      {hasMore && !isLoading && (
        <div className="text-center">
          <Button onClick={onLoadMore}>{t("load_more")}</Button>
        </div>
      )}
    </>
  );
}

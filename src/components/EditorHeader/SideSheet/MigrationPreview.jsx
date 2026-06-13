import { Button } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import CodeEditor from "../../CodeEditor";

export default function MigrationPreview({
  migrationSQL,
  filename,
  onOpenFull,
}) {
  const { t } = useTranslation();

  if (!migrationSQL?.up) {
    return (
      <div className="text-center opacity-60 py-12">
        {t("no_migration_needed")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <CodeEditor
        language="sql"
        height="10rem"
        filename={`${filename}.up.sql`}
        value={migrationSQL.up}
        options={{ readOnly: true }}
      />
      <CodeEditor
        language="sql"
        height="10rem"
        filename={`${filename}.down.sql`}
        value={migrationSQL.down}
        options={{ readOnly: true }}
      />
      {onOpenFull && (
        <Button size="small" theme="borderless" onClick={onOpenFull}>
          {t("open_in_modal")}
        </Button>
      )}
    </div>
  );
}

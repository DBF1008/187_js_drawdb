import { Badge, Collapse } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";

function ChangeItem({ label, name, color }) {
  return (
    <div className={`flex items-center gap-2 py-0.5 text-sm ${color}`}>
      <span className="text-xs">{label}</span>
      <span className="font-medium">{name}</span>
    </div>
  );
}

function ModifiedDetail({ entry }) {
  const allChanges = [
    ...entry.fieldChanges,
    ...entry.indexChanges,
    ...entry.otherChanges,
  ];

  if (allChanges.length === 0) return null;

  return (
    <div className="ml-4 text-xs opacity-75 space-y-0.5">
      {entry.fieldChanges.length > 0 && (
        <div className="font-semibold mt-1">Fields</div>
      )}
      {entry.fieldChanges.map((c, i) => (
        <div key={`f-${i}`} className="ml-2">
          {c.path}
        </div>
      ))}
      {entry.indexChanges.length > 0 && (
        <div className="font-semibold mt-1">Indices</div>
      )}
      {entry.indexChanges.map((c, i) => (
        <div key={`i-${i}`} className="ml-2">
          {c.path}
        </div>
      ))}
      {entry.otherChanges.length > 0 && (
        <div className="font-semibold mt-1">Other</div>
      )}
      {entry.otherChanges.map((c, i) => (
        <div key={`o-${i}`} className="ml-2">
          {c.path}
        </div>
      ))}
    </div>
  );
}

function SectionContent({ items, t }) {
  if (items.added.length === 0 && items.removed.length === 0 && items.modified.length === 0) {
    return <div className="text-sm opacity-50 py-1">{t("no_changes")}</div>;
  }

  return (
    <div>
      {items.added.map((item, i) => (
        <ChangeItem key={`a-${i}`} label="+ " name={item.name} color="text-green-600" />
      ))}
      {items.removed.map((item, i) => (
        <ChangeItem key={`r-${i}`} label="- " name={item.name} color="text-red-500" />
      ))}
      {items.modified.map((item, i) => (
        <div key={`m-${i}`}>
          <ChangeItem label="~ " name={item.name} color="text-amber-600" />
          <ModifiedDetail entry={item} />
        </div>
      ))}
    </div>
  );
}

export default function StructuralSummary({ summary }) {
  const { t } = useTranslation();

  if (!summary) return null;

  const totalCount =
    summary.tables.count +
    summary.relationships.count +
    summary.types.count +
    summary.enums.count;

  if (totalCount === 0) {
    return (
      <div className="text-center opacity-60 py-8">
        {t("no_structural_changes")}
      </div>
    );
  }

  const defaultKeys = [];
  if (summary.tables.count > 0) defaultKeys.push("tables");
  if (summary.relationships.count > 0) defaultKeys.push("relationships");
  if (summary.types.count > 0) defaultKeys.push("types");
  if (summary.enums.count > 0) defaultKeys.push("enums");

  return (
    <Collapse defaultActiveKey={defaultKeys} className="!border-0">
      <Collapse.Panel
        header={
          <span className="flex items-center gap-2">
            {t("tables")}
            {summary.tables.count > 0 && (
              <Badge count={summary.tables.count} type="primary" />
            )}
          </span>
        }
        itemKey="tables"
      >
        <SectionContent items={summary.tables} t={t} />
      </Collapse.Panel>

      <Collapse.Panel
        header={
          <span className="flex items-center gap-2">
            {t("relationships")}
            {summary.relationships.count > 0 && (
              <Badge count={summary.relationships.count} type="primary" />
            )}
          </span>
        }
        itemKey="relationships"
      >
        <SectionContent items={summary.relationships} t={t} />
      </Collapse.Panel>

      <Collapse.Panel
        header={
          <span className="flex items-center gap-2">
            {t("types")}
            {summary.types.count > 0 && (
              <Badge count={summary.types.count} type="primary" />
            )}
          </span>
        }
        itemKey="types"
      >
        <SectionContent items={summary.types} t={t} />
      </Collapse.Panel>

      <Collapse.Panel
        header={
          <span className="flex items-center gap-2">
            {t("enums")}
            {summary.enums.count > 0 && (
              <Badge count={summary.enums.count} type="primary" />
            )}
          </span>
        }
        itemKey="enums"
      >
        <SectionContent items={summary.enums} t={t} />
      </Collapse.Panel>
    </Collapse>
  );
}

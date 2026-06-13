import { IssueType } from "./issues";
import { nanoid } from "nanoid";

export function applyAutoFix(issue, { updateTable, updateField, updateEnum, tables, enums }) {
  switch (issue.issueType) {
    case IssueType.NO_PRIMARY_KEY: {
      const table = tables.find((t) => t.id === issue.objectId);
      if (!table) return false;
      const newField = {
        name: "id",
        type: "INT",
        default: "",
        check: "",
        primary: true,
        unique: false,
        unsigned: false,
        notNull: true,
        increment: true,
        comment: "",
        id: nanoid(),
        size: "",
        values: [],
      };
      updateTable(table.id, {
        fields: [newField, ...table.fields],
      });
      return true;
    }

    case IssueType.EMPTY_FIELD_NAME: {
      const table = tables.find((t) => t.id === issue.objectId);
      if (!table) return false;
      const field = table.fields.find((f) => f.id === issue.childId);
      if (!field) return false;
      const fieldIndex = table.fields.indexOf(field);
      updateField(table.id, field.id, {
        name: `field_${fieldIndex + 1}`,
      });
      return true;
    }

    case IssueType.NOT_NULL_IS_NULL: {
      const table = tables.find((t) => t.id === issue.objectId);
      if (!table) return false;
      const field = table.fields.find((f) => f.id === issue.childId);
      if (!field) return false;
      updateField(table.id, field.id, {
        default: "",
      });
      return true;
    }

    case IssueType.EMPTY_INDEX: {
      const table = tables.find((t) => t.id === issue.objectId);
      if (!table) return false;
      const indexIdx = issue.context?.indexIdx;
      if (indexIdx === undefined) return false;
      const newIndices = table.indices.filter((_, i) => i !== indexIdx);
      updateTable(table.id, { indices: newIndices });
      return true;
    }

    case IssueType.ENUM_NO_VALUES: {
      const enumItem = enums.find((e) => e.id === issue.objectId);
      if (!enumItem) return false;
      updateEnum(enumItem.id, { values: ["VALUE_1"] });
      return true;
    }

    default:
      return false;
  }
}

export function getAutoFixLabel(issueType) {
  const labels = {
    [IssueType.NO_PRIMARY_KEY]: "add_primary_key",
    [IssueType.EMPTY_FIELD_NAME]: "set_default_name",
    [IssueType.NOT_NULL_IS_NULL]: "clear_default",
    [IssueType.EMPTY_INDEX]: "remove_empty_index",
    [IssueType.ENUM_NO_VALUES]: "add_placeholder_value",
  };
  return labels[issueType] || "auto_fix";
}

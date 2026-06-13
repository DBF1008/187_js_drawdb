import { dbToTypes } from "../data/datatypes";
import i18n from "../i18n/i18n";
import { isFunction } from "./utils";
import { ObjectType } from "../data/constants";

export const IssueType = {
  TABLE_NO_NAME: "table_no_name",
  DUPLICATE_TABLE: "duplicate_table",
  EMPTY_FIELD_NAME: "empty_field_name",
  EMPTY_FIELD_TYPE: "empty_field_type",
  NO_VALUES_FOR_FIELD: "no_values_for_field",
  DEFAULT_DOESNT_MATCH_TYPE: "default_doesnt_match_type",
  NOT_NULL_IS_NULL: "not_null_is_null",
  DUPLICATE_FIELDS: "duplicate_fields",
  INHERITED_FIELD_CONFLICT: "inherited_field_conflict",
  DUPLICATE_INDEX: "duplicate_index",
  EMPTY_INDEX_NAME: "empty_index_name",
  EMPTY_INDEX: "empty_index",
  NO_PRIMARY_KEY: "no_primary_key",
  TYPE_NO_NAME: "type_no_name",
  DUPLICATE_TYPES: "duplicate_types",
  TYPE_NO_FIELDS: "type_no_fields",
  EMPTY_TYPE_FIELD_NAME: "empty_type_field_name",
  EMPTY_TYPE_FIELD_TYPE: "empty_type_field_type",
  NO_VALUES_FOR_TYPE_FIELD: "no_values_for_type_field",
  DUPLICATE_TYPE_FIELDS: "duplicate_type_fields",
  ENUM_NO_NAME: "enum_no_name",
  DUPLICATE_ENUMS: "duplicate_enums",
  ENUM_NO_VALUES: "enum_no_values",
  DUPLICATE_REFERENCE: "duplicate_reference",
  CIRCULAR_DEPENDENCY: "circular_dependency",
};

function checkDefault(field, database) {
  if (field.default === "") return true;
  if (isFunction(field.default)) return true;
  if (
    !field.notNull &&
    typeof field.default === "string" &&
    field.default.toLowerCase() === "null"
  )
    return true;
  if (!dbToTypes[database][field.type].checkDefault) return true;

  return dbToTypes[database][field.type].checkDefault(field);
}

function makeIssue(id, message, severity, issueType, objectType, objectId, extra = {}) {
  return {
    id,
    message,
    severity,
    issueType,
    objectType,
    objectId,
    childId: extra.childId ?? null,
    childType: extra.childType ?? null,
    autoFixable: extra.autoFixable ?? false,
    context: extra.context ?? {},
  };
}

export function getIssues(diagram) {
  const issues = [];
  const duplicateTableNames = {};

  diagram.tables.forEach((table) => {
    if (table.name === "") {
      issues.push(
        makeIssue(
          `${IssueType.TABLE_NO_NAME}:${table.id}`,
          i18n.t("table_w_no_name"),
          "error",
          IssueType.TABLE_NO_NAME,
          ObjectType.TABLE,
          table.id,
        ),
      );
    }

    if (duplicateTableNames[table.name]) {
      issues.push(
        makeIssue(
          `${IssueType.DUPLICATE_TABLE}:${table.id}`,
          i18n.t("duplicate_table_by_name", { tableName: table.name }),
          "error",
          IssueType.DUPLICATE_TABLE,
          ObjectType.TABLE,
          table.id,
          { context: { tableName: table.name } },
        ),
      );
    } else {
      duplicateTableNames[table.name] = true;
    }

    const duplicateFieldNames = {};
    let hasPrimaryKey = false;

    const inheritedFields =
      table.inherits
        ?.map((parentName) => {
          const parent = diagram.tables.find((t) => t.name === parentName);
          return parent ? parent.fields.map((f) => f.name) : [];
        })
        .flat() || [];

    table.fields.forEach((field, fieldIndex) => {
      if (field.primary) hasPrimaryKey = true;

      if (field.name === "") {
        issues.push(
          makeIssue(
            `${IssueType.EMPTY_FIELD_NAME}:${table.id}:${field.id}`,
            i18n.t("empty_field_name", { tableName: table.name }),
            "error",
            IssueType.EMPTY_FIELD_NAME,
            ObjectType.TABLE,
            table.id,
            {
              childId: field.id,
              childType: "field",
              autoFixable: true,
              context: { tableName: table.name, fieldName: field.name, fieldIndex },
            },
          ),
        );
      }

      if (field.type === "") {
        issues.push(
          makeIssue(
            `${IssueType.EMPTY_FIELD_TYPE}:${table.id}:${field.id}`,
            i18n.t("empty_field_type", { tableName: table.name }),
            "error",
            IssueType.EMPTY_FIELD_TYPE,
            ObjectType.TABLE,
            table.id,
            {
              childId: field.id,
              childType: "field",
              context: { tableName: table.name, fieldName: field.name, fieldIndex },
            },
          ),
        );
      } else if (field.type === "ENUM" || field.type === "SET") {
        if (!field.values || field.values.length === 0) {
          issues.push(
            makeIssue(
              `${IssueType.NO_VALUES_FOR_FIELD}:${table.id}:${field.id}`,
              i18n.t("no_values_for_field", {
                tableName: table.name,
                fieldName: field.name,
                type: field.type,
              }),
              "warning",
              IssueType.NO_VALUES_FOR_FIELD,
              ObjectType.TABLE,
              table.id,
              {
                childId: field.id,
                childType: "field",
                context: { tableName: table.name, fieldName: field.name, fieldIndex },
              },
            ),
          );
        }
      }

      if (!checkDefault(field, diagram.database)) {
        issues.push(
          makeIssue(
            `${IssueType.DEFAULT_DOESNT_MATCH_TYPE}:${table.id}:${field.id}`,
            i18n.t("default_doesnt_match_type", {
              tableName: table.name,
              fieldName: field.name,
            }),
            "error",
            IssueType.DEFAULT_DOESNT_MATCH_TYPE,
            ObjectType.TABLE,
            table.id,
            {
              childId: field.id,
              childType: "field",
              context: { tableName: table.name, fieldName: field.name, fieldIndex },
            },
          ),
        );
      }

      if (
        field.notNull &&
        typeof field.default === "string" &&
        field.default.toLowerCase() === "null"
      ) {
        issues.push(
          makeIssue(
            `${IssueType.NOT_NULL_IS_NULL}:${table.id}:${field.id}`,
            i18n.t("not_null_is_null", {
              tableName: table.name,
              fieldName: field.name,
            }),
            "error",
            IssueType.NOT_NULL_IS_NULL,
            ObjectType.TABLE,
            table.id,
            {
              childId: field.id,
              childType: "field",
              autoFixable: true,
              context: { tableName: table.name, fieldName: field.name, fieldIndex },
            },
          ),
        );
      }

      if (duplicateFieldNames[field.name]) {
        issues.push(
          makeIssue(
            `${IssueType.DUPLICATE_FIELDS}:${table.id}:${field.id}`,
            i18n.t("duplicate_fields", {
              tableName: table.name,
              fieldName: field.name,
            }),
            "error",
            IssueType.DUPLICATE_FIELDS,
            ObjectType.TABLE,
            table.id,
            {
              childId: field.id,
              childType: "field",
              context: { tableName: table.name, fieldName: field.name, fieldIndex },
            },
          ),
        );
      } else {
        duplicateFieldNames[field.name] = true;
      }

      if (inheritedFields.includes(field.name)) {
        issues.push(
          makeIssue(
            `${IssueType.INHERITED_FIELD_CONFLICT}:${table.id}:${field.id}`,
            i18n.t("merging_column_w_inherited_definition", {
              fieldName: field.name,
              tableName: table.name,
            }),
            "warning",
            IssueType.INHERITED_FIELD_CONFLICT,
            ObjectType.TABLE,
            table.id,
            {
              childId: field.id,
              childType: "field",
              context: { tableName: table.name, fieldName: field.name, fieldIndex },
            },
          ),
        );
      }
    });

    const duplicateIndices = {};
    table.indices.forEach((index, indexIdx) => {
      if (duplicateIndices[index.name]) {
        issues.push(
          makeIssue(
            `${IssueType.DUPLICATE_INDEX}:${table.id}:${indexIdx}`,
            i18n.t("duplicate_index", {
              tableName: table.name,
              indexName: index.name,
            }),
            "error",
            IssueType.DUPLICATE_INDEX,
            ObjectType.TABLE,
            table.id,
            {
              childId: indexIdx,
              childType: "index",
              context: { tableName: table.name, indexName: index.name },
            },
          ),
        );
      } else {
        duplicateIndices[index.name] = true;
      }
    });

    table.indices.forEach((index, indexIdx) => {
      if (index.name.trim() === "") {
        issues.push(
          makeIssue(
            `${IssueType.EMPTY_INDEX_NAME}:${table.id}:${indexIdx}`,
            i18n.t("empty_index_name", { tableName: table.name }),
            "warning",
            IssueType.EMPTY_INDEX_NAME,
            ObjectType.TABLE,
            table.id,
            {
              childId: indexIdx,
              childType: "index",
              context: { tableName: table.name },
            },
          ),
        );
      }
      if (index.fields.length === 0) {
        issues.push(
          makeIssue(
            `${IssueType.EMPTY_INDEX}:${table.id}:${indexIdx}`,
            i18n.t("empty_index", { tableName: table.name }),
            "warning",
            IssueType.EMPTY_INDEX,
            ObjectType.TABLE,
            table.id,
            {
              childId: indexIdx,
              childType: "index",
              autoFixable: true,
              context: { tableName: table.name, indexIdx },
            },
          ),
        );
      }
    });

    if (!hasPrimaryKey) {
      issues.push(
        makeIssue(
          `${IssueType.NO_PRIMARY_KEY}:${table.id}`,
          i18n.t("no_primary_key", { tableName: table.name }),
          "warning",
          IssueType.NO_PRIMARY_KEY,
          ObjectType.TABLE,
          table.id,
          {
            autoFixable: true,
            context: { tableName: table.name },
          },
        ),
      );
    }
  });

  const duplicateTypeNames = {};
  diagram.types.forEach((type, typeIndex) => {
    if (type.name === "") {
      issues.push(
        makeIssue(
          `${IssueType.TYPE_NO_NAME}:${type.id}`,
          i18n.t("type_with_no_name"),
          "error",
          IssueType.TYPE_NO_NAME,
          ObjectType.TYPE,
          type.id,
        ),
      );
    }

    if (duplicateTypeNames[type.name]) {
      issues.push(
        makeIssue(
          `${IssueType.DUPLICATE_TYPES}:${type.id}`,
          i18n.t("duplicate_types", { typeName: type.name }),
          "warning",
          IssueType.DUPLICATE_TYPES,
          ObjectType.TYPE,
          type.id,
          { context: { typeName: type.name } },
        ),
      );
    } else {
      duplicateTypeNames[type.name] = true;
    }

    if (type.fields.length === 0) {
      issues.push(
        makeIssue(
          `${IssueType.TYPE_NO_FIELDS}:${type.id}`,
          i18n.t("type_w_no_fields", { typeName: type.name }),
          "warning",
          IssueType.TYPE_NO_FIELDS,
          ObjectType.TYPE,
          type.id,
          { context: { typeName: type.name } },
        ),
      );
      return;
    }

    const duplicateFieldNames = {};
    type.fields.forEach((field, fieldIndex) => {
      if (field.name === "") {
        issues.push(
          makeIssue(
            `${IssueType.EMPTY_TYPE_FIELD_NAME}:${type.id}:${fieldIndex}`,
            i18n.t("empty_type_field_name", { typeName: type.name }),
            "error",
            IssueType.EMPTY_TYPE_FIELD_NAME,
            ObjectType.TYPE,
            type.id,
            {
              childId: fieldIndex,
              childType: "type_field",
              context: { typeName: type.name },
            },
          ),
        );
      }

      if (field.type === "") {
        issues.push(
          makeIssue(
            `${IssueType.EMPTY_TYPE_FIELD_TYPE}:${type.id}:${fieldIndex}`,
            i18n.t("empty_type_field_type", { typeName: type.name }),
            "error",
            IssueType.EMPTY_TYPE_FIELD_TYPE,
            ObjectType.TYPE,
            type.id,
            {
              childId: fieldIndex,
              childType: "type_field",
              context: { typeName: type.name },
            },
          ),
        );
      } else if (field.type === "ENUM" || field.type === "SET") {
        if (!field.values || field.values.length === 0) {
          issues.push(
            makeIssue(
              `${IssueType.NO_VALUES_FOR_TYPE_FIELD}:${type.id}:${fieldIndex}`,
              i18n.t("no_values_for_type_field", {
                typeName: type.name,
                fieldName: field.name,
                type: field.type,
              }),
              "warning",
              IssueType.NO_VALUES_FOR_TYPE_FIELD,
              ObjectType.TYPE,
              type.id,
              {
                childId: fieldIndex,
                childType: "type_field",
                context: { typeName: type.name, fieldName: field.name },
              },
            ),
          );
        }
      }

      if (duplicateFieldNames[field.name]) {
        issues.push(
          makeIssue(
            `${IssueType.DUPLICATE_TYPE_FIELDS}:${type.id}:${fieldIndex}`,
            i18n.t("duplicate_type_fields", {
              typeName: type.name,
              fieldName: field.name,
            }),
            "error",
            IssueType.DUPLICATE_TYPE_FIELDS,
            ObjectType.TYPE,
            type.id,
            {
              childId: fieldIndex,
              childType: "type_field",
              context: { typeName: type.name, fieldName: field.name },
            },
          ),
        );
      } else {
        duplicateFieldNames[field.name] = true;
      }
    });
  });

  const duplicateEnumNames = {};
  diagram.enums.forEach((e) => {
    if (e.name === "") {
      issues.push(
        makeIssue(
          `${IssueType.ENUM_NO_NAME}:${e.id}`,
          i18n.t("enum_w_no_name"),
          "error",
          IssueType.ENUM_NO_NAME,
          ObjectType.ENUM,
          e.id,
        ),
      );
    }

    if (duplicateEnumNames[e.name]) {
      issues.push(
        makeIssue(
          `${IssueType.DUPLICATE_ENUMS}:${e.id}`,
          i18n.t("duplicate_enums", { enumName: e.name }),
          "warning",
          IssueType.DUPLICATE_ENUMS,
          ObjectType.ENUM,
          e.id,
          { context: { enumName: e.name } },
        ),
      );
    } else {
      duplicateEnumNames[e.name] = true;
    }

    if (e.values.length === 0) {
      issues.push(
        makeIssue(
          `${IssueType.ENUM_NO_VALUES}:${e.id}`,
          i18n.t("enum_w_no_values", { enumName: e.name }),
          "warning",
          IssueType.ENUM_NO_VALUES,
          ObjectType.ENUM,
          e.id,
          {
            autoFixable: true,
            context: { enumName: e.name },
          },
        ),
      );
      return;
    }
  });

  const duplicateFKName = {};
  diagram.relationships.forEach((r) => {
    if (duplicateFKName[r.name]) {
      issues.push(
        makeIssue(
          `${IssueType.DUPLICATE_REFERENCE}:${r.id}`,
          i18n.t("duplicate_reference", { refName: r.name }),
          "error",
          IssueType.DUPLICATE_REFERENCE,
          ObjectType.RELATIONSHIP,
          r.id,
          { context: { refName: r.name } },
        ),
      );
    } else {
      duplicateFKName[r.name] = true;
    }
  });

  const visitedTables = new Set();

  function checkCircularRelationships(tableId, visited = []) {
    if (visited.includes(tableId)) {
      issues.push(
        makeIssue(
          `${IssueType.CIRCULAR_DEPENDENCY}:${tableId}`,
          i18n.t("circular_dependency", {
            refName: diagram.tables.find((t) => t.id === tableId)?.name,
          }),
          "warning",
          IssueType.CIRCULAR_DEPENDENCY,
          ObjectType.TABLE,
          tableId,
          {
            context: {
              refName: diagram.tables.find((t) => t.id === tableId)?.name,
            },
          },
        ),
      );
      return;
    }

    visited.push(tableId);
    visitedTables.add(tableId);

    diagram.relationships.forEach((r) => {
      if (r.startTableId === tableId && r.startTableId !== r.endTableId) {
        checkCircularRelationships(r.endTableId, [...visited]);
      }
    });
  }

  diagram.tables.forEach((table) => {
    if (!visitedTables.has(table.id)) {
      checkCircularRelationships(table.id);
    }
  });

  return issues;
}

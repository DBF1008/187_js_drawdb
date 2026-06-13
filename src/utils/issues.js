import { dbToTypes } from "../data/datatypes";
import i18n from "../i18n/i18n";
import { isFunction } from "./utils";
import { ObjectType, Tab } from "../data/constants";

export const IssueSeverity = {
  ERROR: "error",
  WARNING: "warning",
};

export const IssueCategory = {
  TABLE: "table",
  FIELD: "field",
  INDEX: "index",
  TYPE: "type",
  ENUM: "enum",
  RELATIONSHIP: "relationship",
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

/**
 * Compute the list of diagram issues.
 *
 * Each issue is a plain, serializable object so it can be compared with
 * `arrayIsEqual` (JSON based) and so the panel can map it to navigation /
 * auto-fix behavior:
 *
 *   {
 *     id,        // stable unique key
 *     message,   // already translated text (unchanged keys)
 *     severity,  // IssueSeverity
 *     category,  // IssueCategory
 *     target: {  // how to locate the offending object
 *       element,    // ObjectType.*
 *       id,         // object id (or type/field index where appropriate)
 *       tab,        // Tab.*
 *       scrollId,   // DOM id to scrollIntoView
 *       fieldIndex, // optional, for `scroll_table_<tid>_input_<index>`
 *     },
 *     fix,       // optional serializable descriptor for a safe auto-fix
 *   }
 */
export function getIssues(diagram) {
  const issues = [];
  const duplicateTableNames = {};

  diagram.tables.forEach((table) => {
    const tableTarget = {
      element: ObjectType.TABLE,
      id: table.id,
      tab: Tab.TABLES,
      scrollId: `scroll_table_${table.id}`,
    };

    if (table.name === "") {
      issues.push({
        id: `tbl-${table.id}-noname`,
        message: i18n.t("table_w_no_name"),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.TABLE,
        target: tableTarget,
      });
    }

    if (duplicateTableNames[table.name]) {
      issues.push({
        id: `tbl-${table.id}-dupname`,
        message: i18n.t("duplicate_table_by_name", { tableName: table.name }),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.TABLE,
        target: tableTarget,
      });
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

      const fieldTarget = {
        element: ObjectType.TABLE,
        id: table.id,
        tab: Tab.TABLES,
        scrollId: `scroll_table_${table.id}`,
        fieldIndex,
      };

      if (field.name === "") {
        issues.push({
          id: `fld-${table.id}-${field.id}-noname`,
          message: i18n.t("empty_field_name", { tableName: table.name }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.FIELD,
          target: fieldTarget,
        });
      }

      if (field.type === "") {
        issues.push({
          id: `fld-${table.id}-${field.id}-notype`,
          message: i18n.t("empty_field_type", { tableName: table.name }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.FIELD,
          target: fieldTarget,
        });
      } else if (field.type === "ENUM" || field.type === "SET") {
        if (!field.values || field.values.length === 0) {
          issues.push({
            id: `fld-${table.id}-${field.id}-novalues`,
            message: i18n.t("no_values_for_field", {
              tableName: table.name,
              fieldName: field.name,
              type: field.type,
            }),
            severity: IssueSeverity.ERROR,
            category: IssueCategory.FIELD,
            target: fieldTarget,
          });
        }
      }

      if (!checkDefault(field, diagram.database)) {
        issues.push({
          id: `fld-${table.id}-${field.id}-baddefault`,
          message: i18n.t("default_doesnt_match_type", {
            tableName: table.name,
            fieldName: field.name,
          }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.FIELD,
          target: fieldTarget,
          fix: {
            kind: "CLEAR_FIELD_DEFAULT",
            tableId: table.id,
            fieldId: field.id,
          },
        });
      }

      if (
        field.notNull &&
        typeof field.default === "string" &&
        field.default.toLowerCase() === "null"
      ) {
        issues.push({
          id: `fld-${table.id}-${field.id}-notnullnull`,
          message: i18n.t("not_null_is_null", {
            tableName: table.name,
            fieldName: field.name,
          }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.FIELD,
          target: fieldTarget,
          fix: {
            kind: "CLEAR_FIELD_DEFAULT",
            tableId: table.id,
            fieldId: field.id,
          },
        });
      }

      if (duplicateFieldNames[field.name]) {
        issues.push({
          id: `fld-${table.id}-${field.id}-dup`,
          message: i18n.t("duplicate_fields", {
            tableName: table.name,
            fieldName: field.name,
          }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.FIELD,
          target: fieldTarget,
        });
      } else {
        duplicateFieldNames[field.name] = true;
      }

      if (inheritedFields.includes(field.name)) {
        issues.push({
          id: `fld-${table.id}-${field.id}-inherited`,
          message: i18n.t("merging_column_w_inherited_definition", {
            fieldName: field.name,
            tableName: table.name,
          }),
          severity: IssueSeverity.WARNING,
          category: IssueCategory.FIELD,
          target: fieldTarget,
        });
      }
    });

    const duplicateIndices = {};
    table.indices.forEach((index, indexPos) => {
      if (duplicateIndices[index.name]) {
        issues.push({
          id: `idx-${table.id}-${index.id ?? indexPos}-dup`,
          message: i18n.t("duplicate_index", {
            tableName: table.name,
            indexName: index.name,
          }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.INDEX,
          target: tableTarget,
        });
      } else {
        duplicateIndices[index.name] = true;
      }
    });

    table.indices.forEach((index, indexPos) => {
      if (index.name.trim() === "") {
        issues.push({
          id: `idx-${table.id}-${index.id ?? indexPos}-noname`,
          message: i18n.t("empty_index_name", { tableName: table.name }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.INDEX,
          target: tableTarget,
        });
      }
      if (index.fields.length === 0) {
        issues.push({
          id: `idx-${table.id}-${index.id ?? indexPos}-empty`,
          message: i18n.t("empty_index", { tableName: table.name }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.INDEX,
          target: tableTarget,
          fix: {
            kind: "REMOVE_INDEX",
            tableId: table.id,
            indexPos,
          },
        });
      }
    });

    if (!hasPrimaryKey) {
      issues.push({
        id: `tbl-${table.id}-nopk`,
        message: i18n.t("no_primary_key", { tableName: table.name }),
        severity: IssueSeverity.WARNING,
        category: IssueCategory.TABLE,
        target: tableTarget,
      });
    }
  });

  const duplicateTypeNames = {};
  diagram.types.forEach((type, typeIndex) => {
    const typeTarget = {
      element: ObjectType.TYPE,
      id: typeIndex,
      tab: Tab.TYPES,
      scrollId: `scroll_type_${type.id ?? typeIndex}`,
    };

    if (type.name === "") {
      issues.push({
        id: `typ-${typeIndex}-noname`,
        message: i18n.t("type_with_no_name"),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.TYPE,
        target: typeTarget,
      });
    }

    if (duplicateTypeNames[type.name]) {
      issues.push({
        id: `typ-${typeIndex}-dup`,
        message: i18n.t("duplicate_types", { typeName: type.name }),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.TYPE,
        target: typeTarget,
      });
    } else {
      duplicateTypeNames[type.name] = true;
    }

    if (type.fields.length === 0) {
      issues.push({
        id: `typ-${typeIndex}-nofields`,
        message: i18n.t("type_w_no_fields", { typeName: type.name }),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.TYPE,
        target: typeTarget,
      });
      return;
    }

    const duplicateFieldNames = {};
    type.fields.forEach((field, fieldIndex) => {
      if (field.name === "") {
        issues.push({
          id: `typ-${typeIndex}-f${fieldIndex}-noname`,
          message: i18n.t("empty_type_field_name", { typeName: type.name }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.TYPE,
          target: typeTarget,
        });
      }

      if (field.type === "") {
        issues.push({
          id: `typ-${typeIndex}-f${fieldIndex}-notype`,
          message: i18n.t("empty_type_field_type", { typeName: type.name }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.TYPE,
          target: typeTarget,
        });
      } else if (field.type === "ENUM" || field.type === "SET") {
        if (!field.values || field.values.length === 0) {
          issues.push({
            id: `typ-${typeIndex}-f${fieldIndex}-novalues`,
            message: i18n.t("no_values_for_type_field", {
              typeName: type.name,
              fieldName: field.name,
              type: field.type,
            }),
            severity: IssueSeverity.ERROR,
            category: IssueCategory.TYPE,
            target: typeTarget,
          });
        }
      }

      if (duplicateFieldNames[field.name]) {
        issues.push({
          id: `typ-${typeIndex}-f${fieldIndex}-dup`,
          message: i18n.t("duplicate_type_fields", {
            typeName: type.name,
            fieldName: field.name,
          }),
          severity: IssueSeverity.ERROR,
          category: IssueCategory.TYPE,
          target: typeTarget,
        });
      } else {
        duplicateFieldNames[field.name] = true;
      }
    });
  });

  const duplicateEnumNames = {};
  diagram.enums.forEach((e) => {
    const enumTarget = {
      element: ObjectType.ENUM,
      id: e.id,
      tab: Tab.ENUMS,
      scrollId: `scroll_enum_${e.id}`,
    };

    if (e.name === "") {
      issues.push({
        id: `enm-${e.id}-noname`,
        message: i18n.t("enum_w_no_name"),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.ENUM,
        target: enumTarget,
      });
    }

    if (duplicateEnumNames[e.name]) {
      issues.push({
        id: `enm-${e.id}-dup`,
        message: i18n.t("duplicate_enums", { enumName: e.name }),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.ENUM,
        target: enumTarget,
      });
    } else {
      duplicateEnumNames[e.name] = true;
    }

    if (e.values.length === 0) {
      issues.push({
        id: `enm-${e.id}-novalues`,
        message: i18n.t("enum_w_no_values", { enumName: e.name }),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.ENUM,
        target: enumTarget,
      });
      return;
    }
  });

  const duplicateFKName = {};
  diagram.relationships.forEach((r) => {
    if (duplicateFKName[r.name]) {
      issues.push({
        id: `rel-${r.id}-dup`,
        message: i18n.t("duplicate_reference", { refName: r.name }),
        severity: IssueSeverity.ERROR,
        category: IssueCategory.RELATIONSHIP,
        target: {
          element: ObjectType.RELATIONSHIP,
          id: r.id,
          tab: Tab.RELATIONSHIPS,
          scrollId: `scroll_ref_${r.id}`,
        },
      });
    } else {
      duplicateFKName[r.name] = true;
    }
  });

  const visitedTables = new Set();
  const reportedCycles = new Set();

  function checkCircularRelationships(tableId, visited = []) {
    if (visited.includes(tableId)) {
      if (!reportedCycles.has(tableId)) {
        reportedCycles.add(tableId);
        issues.push({
          id: `cyc-${tableId}`,
          message: i18n.t("circular_dependency", {
            refName: diagram.tables.find((t) => t.id === tableId)?.name,
          }),
          severity: IssueSeverity.WARNING,
          category: IssueCategory.RELATIONSHIP,
          target: {
            element: ObjectType.TABLE,
            id: tableId,
            tab: Tab.TABLES,
            scrollId: `scroll_table_${tableId}`,
          },
        });
      }
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

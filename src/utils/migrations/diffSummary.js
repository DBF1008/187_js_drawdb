import { databases } from "../../data/databases";

const FIELD_PROPS = [
  "name",
  "type",
  "size",
  "notNull",
  "unique",
  "primary",
  "default",
  "check",
  "increment",
  "comment",
  "isArray",
  "values",
];
const INDEX_PROPS = ["name", "unique", "fields"];
const TYPE_PROPS = ["name", "comment", "fields"];
const ENUM_PROPS = ["name", "values"];
const REL_PROPS = [
  "name",
  "startTableId",
  "startFieldId",
  "endTableId",
  "endFieldId",
  "updateConstraint",
  "deleteConstraint",
];

function eq(a, b) {
  if (a === b) return true;
  if (
    (typeof a === "object" && a !== null) ||
    (typeof b === "object" && b !== null)
  ) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  return false;
}

function changedProps(a, b, props) {
  const changes = [];
  for (const p of props) {
    if (!eq(a?.[p], b?.[p])) changes.push(p);
  }
  return changes;
}

// Match objects by `id`, the same strategy used by deepDiff in src/utils/diff.js.
function indexById(arr) {
  const m = new Map();
  for (const item of arr ?? []) {
    if (item && item.id != null) m.set(item.id, item);
  }
  return m;
}

function diffNamedById(fromArr, toArr, props) {
  const section = { added: [], removed: [], modified: [] };
  const from = indexById(fromArr);
  const to = indexById(toArr);

  for (const [id, item] of from) {
    if (!to.has(id)) section.removed.push(item.name);
  }
  for (const [id, item] of to) {
    if (!from.has(id)) section.added.push(item.name);
  }
  for (const [id, fromItem] of from) {
    const toItem = to.get(id);
    if (!toItem) continue;
    const changes = changedProps(fromItem, toItem, props);
    if (changes.length) section.modified.push({ name: toItem.name, changes });
  }

  return section;
}

/**
 * Produce a human-readable structural summary of the changes between two
 * diagrams. Pure function: matches objects by id and reports which tables,
 * fields, indices, relationships, types and enums were added/removed/modified.
 */
export function summarizeDiff(fromDiagram = {}, toDiagram = {}, database) {
  const hasTypes = !!databases[database]?.hasTypes;
  const hasEnums = !!databases[database]?.hasEnums;

  const summary = {
    tables: { added: [], removed: [], modified: [] },
    fields: { added: [], removed: [], modified: [] },
    indices: { added: [], removed: [], modified: [] },
    relationships: { added: [], removed: [], modified: [] },
    ...(hasTypes && { types: { added: [], removed: [], modified: [] } }),
    ...(hasEnums && { enums: { added: [], removed: [], modified: [] } }),
  };

  const fromTables = indexById(fromDiagram.tables);
  const toTables = indexById(toDiagram.tables);

  for (const [id, t] of fromTables) {
    if (!toTables.has(id)) summary.tables.removed.push(t.name);
  }
  for (const [id, t] of toTables) {
    if (!fromTables.has(id)) summary.tables.added.push(t.name);
  }

  // For tables present in both versions, diff table-level props plus their
  // nested fields and indices (added/removed tables are counted only once and
  // their columns are not double-counted).
  for (const [id, fromT] of fromTables) {
    const toT = toTables.get(id);
    if (!toT) continue;

    const tableChanges = changedProps(fromT, toT, ["name"]);
    if (tableChanges.length) {
      summary.tables.modified.push({ name: toT.name, changes: tableChanges });
    }

    const fromFields = indexById(fromT.fields);
    const toFields = indexById(toT.fields);
    for (const [fid, f] of fromFields) {
      if (!toFields.has(fid)) {
        summary.fields.removed.push({ table: fromT.name, name: f.name });
      }
    }
    for (const [fid, f] of toFields) {
      if (!fromFields.has(fid)) {
        summary.fields.added.push({ table: toT.name, name: f.name });
      }
    }
    for (const [fid, fromF] of fromFields) {
      const toF = toFields.get(fid);
      if (!toF) continue;
      const changes = changedProps(fromF, toF, FIELD_PROPS);
      if (changes.length) {
        summary.fields.modified.push({
          table: toT.name,
          name: toF.name,
          changes,
        });
      }
    }

    const fromIndices = indexById(fromT.indices);
    const toIndices = indexById(toT.indices);
    for (const [iid, ix] of fromIndices) {
      if (!toIndices.has(iid)) {
        summary.indices.removed.push({ table: fromT.name, name: ix.name });
      }
    }
    for (const [iid, ix] of toIndices) {
      if (!fromIndices.has(iid)) {
        summary.indices.added.push({ table: toT.name, name: ix.name });
      }
    }
    for (const [iid, fromIx] of fromIndices) {
      const toIx = toIndices.get(iid);
      if (!toIx) continue;
      const changes = changedProps(fromIx, toIx, INDEX_PROPS);
      if (changes.length) {
        summary.indices.modified.push({
          table: toT.name,
          name: toIx.name,
          changes,
        });
      }
    }
  }

  summary.relationships = diffNamedById(
    fromDiagram.relationships,
    toDiagram.relationships,
    REL_PROPS,
  );

  if (hasTypes) {
    summary.types = diffNamedById(
      fromDiagram.types,
      toDiagram.types,
      TYPE_PROPS,
    );
  }

  if (hasEnums) {
    summary.enums = diffNamedById(
      fromDiagram.enums,
      toDiagram.enums,
      ENUM_PROPS,
    );
  }

  const counts = {};
  let total = 0;
  for (const key of Object.keys(summary)) {
    const section = summary[key];
    const n =
      section.added.length + section.removed.length + section.modified.length;
    counts[key] = n;
    total += n;
  }

  return { ...summary, counts, hasChanges: total > 0 };
}

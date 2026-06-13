import { nanoid } from "nanoid";
import { deepDiff } from "./diff";
import { arrangeTables } from "./arrangeTables";

/**
 * Conflict resolution actions for import preview.
 */
export const CONFLICT_ACTION = {
  SKIP: "skip",
  OVERWRITE: "overwrite",
  RENAME: "rename",
};

/**
 * Normalize any import source into a uniform shape.
 * @param {object} rawData - Raw parsed import data
 * @param {string} source - "json" | "ddb" | "dbml" | "sql"
 * @returns {{ tables: Array, relationships: Array, types: Array, enums: Array, areas: Array, notes: Array }}
 */
export function normalizeImportData(rawData) {
  const tables = rawData.tables ?? [];
  const relationships = rawData.relationships ?? [];
  const types = rawData.types ?? [];
  const enums = rawData.enums ?? [];

  // JSON/DDB use "subjectAreas", others use "areas"
  const areas = rawData.subjectAreas ?? rawData.areas ?? [];
  const notes = rawData.notes ?? [];

  // Ensure all entities have id and name
  const ensureId = (items) =>
    items.map((item) => ({
      ...item,
      id: item.id ?? nanoid(),
      name: item.name ?? item.title ?? "",
    }));

  return {
    tables: ensureId(tables),
    relationships: ensureId(relationships),
    types: ensureId(types),
    enums: ensureId(enums),
    areas: areas.map((a) => ({
      ...a,
      id: a.id ?? nanoid(),
      name: a.name ?? "",
    })),
    notes: notes.map((n) => ({
      ...n,
      id: n.id ?? nanoid(),
      name: n.title ?? n.name ?? "",
    })),
  };
}

/**
 * Build comparison between incoming import data and current diagram state.
 * Matching is done by name (case-insensitive).
 * @param {object} incomingData - Normalized import data from normalizeImportData()
 * @param {object} currentState - { tables, relationships, types, enums, areas, notes }
 * @returns {object} Comparison result per category
 */
export function buildComparison(incomingData, currentState) {
  const result = {};

  for (const category of [
    "tables",
    "relationships",
    "types",
    "enums",
    "areas",
    "notes",
  ]) {
    const incoming = incomingData[category] ?? [];
    const existing = currentState[category] ?? [];

    result[category] = incoming.map((item) => {
      const matchName = (item.name ?? "").toLowerCase();
      const existingItem = existing.find(
        (e) => (e.name ?? e.title ?? "").toLowerCase() === matchName,
      );

      const comparison = {
        incoming: item,
        existing: existingItem ?? null,
        status: existingItem ? "conflict" : "new",
        action: existingItem ? CONFLICT_ACTION.SKIP : CONFLICT_ACTION.OVERWRITE,
        selected: !existingItem, // new items selected by default, conflicts deselected
        diff: null,
      };

      // Compute diff for conflicts
      if (existingItem) {
        const diffAcc = {};
        const keysToIgnore = [
          "id",
          "x",
          "y",
          "width",
          "height",
          "locked",
          "color",
          "transform",
        ];
        deepDiff(existingItem, item, diffAcc, keysToIgnore);
        if (Object.keys(diffAcc).length > 0) {
          comparison.diff = diffAcc;
        }
      }

      return comparison;
    });
  }

  return result;
}

/**
 * Count statistics from comparison data.
 */
export function getComparisonStats(comparison) {
  let newCount = 0;
  let conflictCount = 0;
  let selectedCount = 0;

  for (const category of Object.keys(comparison)) {
    for (const item of comparison[category]) {
      if (item.status === "new") newCount++;
      if (item.status === "conflict") conflictCount++;
      if (item.selected) selectedCount++;
    }
  }

  return { newCount, conflictCount, selectedCount };
}

/**
 * Apply the user's import selection to the diagram state.
 * Uses a two-pass approach for relationship integrity.
 *
 * @param {object} comparison - Comparison data from buildComparison() (with user edits)
 * @param {object} currentState - Current diagram state
 * @param {object} setters - State setters { setTables, setRelationships, setTypes, setEnums, setAreas, setNotes, setUndoStack, setRedoStack, setTransform }
 * @param {object} options - { database }
 */
export function applyImportSelection(
  comparison,
  currentState,
  setters,
) {
  const tableIdMap = {}; // incoming.id → final.id
  const fieldIdMap = {}; // incoming.field.id → final.field.id
  const resultTables = [...currentState.tables];
  const newlyAddedTableIds = new Set();

  // --- Pass 1: Tables ---
  for (const item of comparison.tables) {
    if (!item.selected) continue;
    if (item.action === CONFLICT_ACTION.SKIP) continue;

    if (item.status === "new") {
      // New table: add with existing or new IDs
      const table = { ...item.incoming };
      if (!tableIdMap[item.incoming.id]) {
        const newId = nanoid();
        tableIdMap[item.incoming.id] = newId;
        table.id = newId;
      } else {
        table.id = tableIdMap[item.incoming.id];
      }

      if (table.fields) {
        table.fields = table.fields.map((f) => {
          const newFid = f.id ?? nanoid();
          fieldIdMap[f.id] = newFid;
          return { ...f, id: newFid };
        });
      }

      resultTables.push(table);
      newlyAddedTableIds.add(table.id);
    } else if (item.action === CONFLICT_ACTION.OVERWRITE) {
      // Overwrite: replace table, preserve field IDs where names match
      const idx = resultTables.findIndex(
        (t) =>
          (t.name ?? "").toLowerCase() ===
          (item.incoming.name ?? "").toLowerCase(),
      );
      if (idx < 0) continue;

      const existingTable = resultTables[idx];
      const mergedTable = { ...item.incoming };
      mergedTable.id = existingTable.id;
      tableIdMap[item.incoming.id] = existingTable.id;

      if (mergedTable.fields) {
        mergedTable.fields = mergedTable.fields.map((f) => {
          const existingField = (existingTable.fields ?? []).find(
            (ef) => ef.name === f.name,
          );
          if (existingField) {
            fieldIdMap[f.id] = existingField.id;
            return { ...f, id: existingField.id };
          }
          const newFid = nanoid();
          fieldIdMap[f.id] = newFid;
          return { ...f, id: newFid };
        });
      }

      resultTables[idx] = mergedTable;
    } else if (item.action === CONFLICT_ACTION.RENAME) {
      // Rename: add with suffix
      const renamed = { ...item.incoming };
      const newId = nanoid();
      tableIdMap[item.incoming.id] = newId;
      renamed.id = newId;
      renamed.name = `${item.incoming.name}_imported`;

      if (renamed.fields) {
        renamed.fields = renamed.fields.map((f) => {
          const newFid = nanoid();
          fieldIdMap[f.id] = newFid;
          return { ...f, id: newFid };
        });
      }

      resultTables.push(renamed);
      newlyAddedTableIds.add(renamed.id);
    }
  }

  // --- Pass 2: Relationships ---
  const resultRels = [...currentState.relationships];
  const skippedRels = [];

  for (const item of comparison.relationships) {
    if (!item.selected) continue;
    if (item.action === CONFLICT_ACTION.SKIP) continue;

    const startTableId = tableIdMap[item.incoming.startTableId];
    const endTableId = tableIdMap[item.incoming.endTableId];
    const startFieldId = fieldIdMap[item.incoming.startFieldId];
    const endFieldId = fieldIdMap[item.incoming.endFieldId];

    // Skip relationships referencing unmapped tables/fields
    if (!startTableId || !endTableId || !startFieldId || !endFieldId) {
      skippedRels.push(item);
      continue;
    }

    if (
      item.status === "conflict" &&
      item.action === CONFLICT_ACTION.OVERWRITE
    ) {
      const idx = resultRels.findIndex(
        (r) =>
          (r.name ?? "").toLowerCase() ===
          (item.incoming.name ?? "").toLowerCase(),
      );
      if (idx >= 0) {
        resultRels[idx] = {
          ...item.incoming,
          id: resultRels[idx].id,
          startTableId,
          endTableId,
          startFieldId,
          endFieldId,
        };
        continue;
      }
    }

    resultRels.push({
      ...item.incoming,
      id: nanoid(),
      startTableId,
      endTableId,
      startFieldId,
      endFieldId,
    });
  }

  // --- Types, Enums, Areas, Notes: simpler merge ---
  const resultTypes = mergeCategory(
    comparison.types,
    currentState.types,
    "name",
  );
  const resultEnums = mergeCategory(
    comparison.enums,
    currentState.enums,
    "name",
  );
  const resultAreas = mergeCategory(
    comparison.areas,
    currentState.areas,
    "name",
  );
  const resultNotes = mergeCategory(
    comparison.notes,
    currentState.notes,
    "name",
  );

  // Arrange newly added tables in a grid below existing ones
  const newlyAddedTables = resultTables.filter((t) =>
    newlyAddedTableIds.has(t.id),
  );
  if (newlyAddedTables.length > 0) {
    // Calculate offset: place new tables below all existing tables
    let maxY = 0;
    for (const t of resultTables) {
      if (!newlyAddedTableIds.has(t.id)) {
        const tableBottom = (t.y ?? 0) + 400; // approximate height
        maxY = Math.max(maxY, tableBottom);
      }
    }
    arrangeTables({ tables: newlyAddedTables });
    // Offset the arranged positions
    for (const t of newlyAddedTables) {
      t.y = (t.y ?? 0) + maxY + 80;
    }
  }

  // Apply state
  setters.setTables(resultTables);
  setters.setRelationships(
    resultRels.map((r, i) => ({ ...r, id: i })),
  );
  setters.setTypes(resultTypes);
  setters.setEnums(resultEnums);
  setters.setAreas(resultAreas);
  setters.setNotes(resultNotes);

  // Reset view
  setters.setTransform((prev) => ({ ...prev, pan: { x: 0, y: 0 } }));

  // Clear undo/redo
  setters.setUndoStack([]);
  setters.setRedoStack([]);

  return { skippedRelationships: skippedRels.length };
}

/**
 * Merge a simple category (types, enums, areas, notes).
 */
function mergeCategory(comparisonItems, existingItems, nameKey) {
  let result = [...existingItems];

  for (const item of comparisonItems) {
    if (!item.selected) continue;
    if (item.action === CONFLICT_ACTION.SKIP) continue;

    if (item.status === "new") {
      result.push({ ...item.incoming, id: item.incoming.id ?? nanoid() });
    } else if (item.action === CONFLICT_ACTION.OVERWRITE) {
      const idx = result.findIndex(
        (e) =>
          ((e[nameKey] ?? e.title ?? "") + "").toLowerCase() ===
          ((item.incoming[nameKey] ?? item.incoming.title ?? "") + "").toLowerCase(),
      );
      if (idx >= 0) {
        result[idx] = {
          ...item.incoming,
          id: result[idx].id,
        };
      } else {
        result.push({ ...item.incoming, id: nanoid() });
      }
    } else if (item.action === CONFLICT_ACTION.RENAME) {
      const suffix = "_imported";
      result.push({
        ...item.incoming,
        id: nanoid(),
        [nameKey]: (item.incoming[nameKey] ?? item.incoming.title ?? "") + suffix,
      });
    }
  }

  return result;
}

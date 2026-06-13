import { Tab, ObjectType } from "../../data/constants";
import { getTableHeight } from "../../utils/utils";
import { noteWidth, tableWidth } from "../../data/constants";

const MAX_RESULTS = 50;

/**
 * Build a flat search index from all diagram entities.
 *
 * @param {Object} params
 * @param {Array} params.tables
 * @param {Array} params.relationships
 * @param {Array} params.areas
 * @param {Array} params.notes
 * @param {Array} params.types
 * @param {Array} params.enums
 * @param {Object} params.settings - { tableWidth, showComments }
 * @returns {Array<SearchEntry>}
 */
export function buildSearchIndex({
  tables = [],
  relationships = [],
  areas = [],
  notes = [],
  types = [],
  enums = [],
  settings = {},
}) {
  const tw = settings.tableWidth ?? tableWidth;
  const showComments = settings.showComments ?? true;
  const index = [];

  // Tables and their fields
  tables.forEach((table) => {
    const tableCenterX = table.x + tw / 2;
    const tableHeight = getTableHeight(
      table,
      tw,
      showComments,
      relationships,
    );
    const tableCenterY = table.y + tableHeight / 2;
    const canvasCoords = { x: tableCenterX, y: tableCenterY };

    index.push({
      key: `table-${table.id}`,
      type: "table",
      label: table.name,
      detail: "",
      tab: Tab.TABLES,
      objectType: ObjectType.TABLE,
      entityId: table.id,
      fieldIndex: null,
      canvasCoords,
    });

    table.fields?.forEach((field, fi) => {
      index.push({
        key: `field-${table.id}-${field.id}`,
        type: "field",
        label: field.name,
        detail: table.name,
        tab: Tab.TABLES,
        objectType: ObjectType.TABLE,
        entityId: table.id,
        fieldIndex: fi,
        canvasCoords,
      });
    });
  });

  // Relationships
  relationships.forEach((rel) => {
    const startTable = tables.find((t) => t.id === rel.startTableId);
    const endTable = tables.find((t) => t.id === rel.endTableId);

    let canvasCoords = null;
    if (startTable && endTable) {
      const startX = startTable.x + tw / 2;
      const startY = startTable.y +
        getTableHeight(startTable, tw, showComments, relationships) / 2;
      const endX = endTable.x + tw / 2;
      const endY = endTable.y +
        getTableHeight(endTable, tw, showComments, relationships) / 2;
      canvasCoords = {
        x: (startX + endX) / 2,
        y: (startY + endY) / 2,
      };
    }

    index.push({
      key: `rel-${rel.id}`,
      type: "relationship",
      label: rel.name,
      detail: "",
      tab: Tab.RELATIONSHIPS,
      objectType: ObjectType.RELATIONSHIP,
      entityId: rel.id,
      fieldIndex: null,
      canvasCoords,
    });
  });

  // Areas
  areas.forEach((area) => {
    index.push({
      key: `area-${area.id}`,
      type: "area",
      label: area.name,
      detail: "",
      tab: Tab.AREAS,
      objectType: ObjectType.AREA,
      entityId: area.id,
      fieldIndex: null,
      canvasCoords: {
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
      },
    });
  });

  // Notes
  notes.forEach((note) => {
    const nw = note.width ?? noteWidth;
    const contentPreview = note.content
      ? note.content.slice(0, 60)
      : "";

    index.push({
      key: `note-${note.id}`,
      type: "note",
      label: note.title,
      detail: contentPreview,
      tab: Tab.NOTES,
      objectType: ObjectType.NOTE,
      entityId: note.id,
      fieldIndex: null,
      canvasCoords: {
        x: note.x + nw / 2,
        y: note.y + (note.height ?? 88) / 2,
      },
    });
  });

  // Types (use array index as entityId to match TypesTab patterns)
  types.forEach((type, i) => {
    index.push({
      key: `type-${type.id ?? i}`,
      type: "type",
      label: type.name,
      detail: "",
      tab: Tab.TYPES,
      objectType: ObjectType.TYPE,
      entityId: i,
      fieldIndex: null,
      canvasCoords: null,
    });
  });

  // Enums
  enums.forEach((enumItem) => {
    index.push({
      key: `enum-${enumItem.id}`,
      type: "enum",
      label: enumItem.name,
      detail: "",
      tab: Tab.ENUMS,
      objectType: ObjectType.ENUM,
      entityId: enumItem.id,
      fieldIndex: null,
      canvasCoords: null,
    });
  });

  return index;
}

/**
 * Filter and rank search results.
 * Scoring: exact match (3) > starts-with (2) > contains (1).
 * Results sorted by score descending, capped at MAX_RESULTS.
 *
 * @param {Array<SearchEntry>} index
 * @param {string} query
 * @returns {Array<SearchEntry>}
 */
export function filterResults(index, query) {
  if (!query || !query.trim()) return index.slice(0, MAX_RESULTS);

  const q = query.trim().toLowerCase();

  const scored = [];
  for (const entry of index) {
    const label = entry.label.toLowerCase();
    const detail = (entry.detail || "").toLowerCase();

    let score = 0;

    if (label === q) {
      score = 3;
    } else if (label.startsWith(q)) {
      score = 2;
    } else if (label.includes(q) || detail.includes(q)) {
      score = 1;
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label));

  return scored.map((s) => s.entry).slice(0, MAX_RESULTS);
}

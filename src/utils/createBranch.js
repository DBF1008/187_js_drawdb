import { db } from "../data/db";
import { databases } from "../data/databases";

/**
 * Create a new, independent, editable diagram ("branch") from a diagram
 * snapshot (e.g. a historical version's content). The new diagram starts its
 * own version history (gistId is reset) and records where it came from via
 * loadedFromGistId, leaving the original diagram and its history untouched.
 *
 * @param {object} diagram snapshot in gist-content shape:
 *   { title, database, tables, relationships, notes, subjectAreas, transform, types, enums }
 * @param {object} options { gistId, loadedFromGistId, nameSuffix }
 * @returns {Promise<string>} the new diagramId
 */
export async function createDiagramBranch(
  diagram,
  { gistId = "", loadedFromGistId = "", nameSuffix = "" } = {},
) {
  const database = diagram.database;
  const diagramId = crypto.randomUUID();

  const record = {
    diagramId,
    database,
    name: `${diagram.title ?? "Untitled Diagram"}${nameSuffix}`,
    gistId,
    loadedFromGistId,
    lastModified: new Date(),
    tables: diagram.tables ?? [],
    references: diagram.relationships ?? [],
    notes: diagram.notes ?? [],
    areas: diagram.subjectAreas ?? [],
    pan: diagram.transform?.pan ?? { x: 0, y: 0 },
    zoom: diagram.transform?.zoom ?? 1,
    ...(databases[database]?.hasTypes && { types: diagram.types ?? [] }),
    ...(databases[database]?.hasEnums && { enums: diagram.enums ?? [] }),
  };

  await db.diagrams.add(record);

  return diagramId;
}

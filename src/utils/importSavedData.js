import JSZip from "jszip";
import { db } from "../data/db";

async function readZipFiles(file) {
  const zip = await JSZip.loadAsync(file);
  const diagrams = [];
  const templates = [];

  const diagramFiles = Object.keys(zip.files).filter((name) =>
    name.startsWith("diagrams/") && name.endsWith(".json"),
  );
  const templateFiles = Object.keys(zip.files).filter((name) =>
    name.startsWith("templates/") && name.endsWith(".json"),
  );

  for (const path of diagramFiles) {
    try {
      const content = await zip.files[path].async("text");
      diagrams.push(JSON.parse(content));
    } catch {
      // skip malformed entries
    }
  }

  for (const path of templateFiles) {
    try {
      const content = await zip.files[path].async("text");
      templates.push(JSON.parse(content));
    } catch {
      // skip malformed entries
    }
  }

  return { diagrams, templates };
}

function convertDiagramToStorage(data) {
  const record = {
    database: data.database,
    name: data.name,
    lastModified: data.lastModified ? new Date(data.lastModified) : new Date(),
    tables: data.tables ?? [],
    references: data.relationships ?? [],
    notes: data.notes ?? [],
    areas: data.subjectAreas ?? [],
    pan: data.pan ?? { x: 0, y: 0 },
    zoom: data.zoom ?? 1,
  };

  if (data.gistId) record.gistId = data.gistId;
  if (data.loadedFromGistId) record.loadedFromGistId = data.loadedFromGistId;
  if (data.enums) record.enums = data.enums;
  if (data.types) record.types = data.types;

  return record;
}

function convertTemplateToStorage(data) {
  const record = {
    title: data.title,
    database: data.database,
    tables: data.tables ?? [],
    relationships: data.relationships ?? [],
    notes: data.notes ?? [],
    subjectAreas: data.subjectAreas ?? [],
    custom: 1,
  };

  if (data.enums) record.enums = data.enums;
  if (data.types) record.types = data.types;

  return record;
}

export async function importSavedData(file, onDuplicate = "overwrite") {
  const { diagrams, templates } = await readZipFiles(file);

  const result = {
    diagramsAdded: 0,
    diagramsOverwritten: 0,
    diagramsSkipped: 0,
    templatesAdded: 0,
    templatesOverwritten: 0,
    templatesSkipped: 0,
  };

  for (const d of diagrams) {
    const diagramId = d.diagramId ?? crypto.randomUUID();
    const storageData = convertDiagramToStorage(d);
    storageData.diagramId = diagramId;

    await db.transaction("rw", db.diagrams, async () => {
      const existing = await db.diagrams
        .where("diagramId")
        .equals(diagramId)
        .first();

      if (existing) {
        if (onDuplicate === "overwrite") {
          await db.diagrams
            .where("diagramId")
            .equals(diagramId)
            .modify(storageData);
          result.diagramsOverwritten++;
        } else {
          result.diagramsSkipped++;
        }
      } else {
        await db.diagrams.add(storageData);
        result.diagramsAdded++;
      }
    });
  }

  for (const t of templates) {
    const templateId = t.templateId ?? crypto.randomUUID();
    const storageData = convertTemplateToStorage(t);
    storageData.templateId = templateId;

    await db.transaction("rw", db.templates, async () => {
      const existing = await db.templates
        .where("templateId")
        .equals(templateId)
        .first();

      if (existing) {
        if (onDuplicate === "overwrite") {
          await db.templates
            .where("templateId")
            .equals(templateId)
            .modify(storageData);
          result.templatesOverwritten++;
        } else {
          result.templatesSkipped++;
        }
      } else {
        await db.templates.add(storageData);
        result.templatesAdded++;
      }
    });
  }

  return result;
}

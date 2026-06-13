/**
 * Transforms the flat diff object produced by deepDiff() into a
 * hierarchical structural summary that groups changes by entity type
 * (tables, relationships, types, enums) and categorises each change
 * as added / removed / modified.
 */

function extractName(seg) {
  const m = seg.match(/name=([^,\]]+)/);
  return m ? m[1] : seg;
}

export function computeDiffSummary(diff) {
  const summary = {
    tables: { added: [], removed: [], modified: [], count: 0 },
    relationships: { added: [], removed: [], modified: [], count: 0 },
    types: { added: [], removed: [], modified: [], count: 0 },
    enums: { added: [], removed: [], modified: [], count: 0 },
  };

  for (const [path, change] of Object.entries(diff)) {
    const segments = path.split("#");
    const rootKey = segments[0].replace(/\[.*\]$/, "");
    if (!summary[rootKey]) continue;

    if (segments.length === 1) {
      const name = extractName(segments[0]);
      if (!change.from && change.to) {
        summary[rootKey].added.push({ name });
      } else if (change.from && !change.to) {
        summary[rootKey].removed.push({ name });
      }
    } else {
      const name = extractName(segments[0]);
      let entry = summary[rootKey].modified.find((m) => m.name === name);
      if (!entry) {
        entry = { name, fieldChanges: [], indexChanges: [], otherChanges: [] };
        summary[rootKey].modified.push(entry);
      }
      const sub = segments.slice(1).join(" > ");
      if (sub.startsWith("fields")) {
        entry.fieldChanges.push({ path: sub, from: change.from, to: change.to });
      } else if (sub.startsWith("indices")) {
        entry.indexChanges.push({ path: sub, from: change.from, to: change.to });
      } else {
        entry.otherChanges.push({ path: sub, from: change.from, to: change.to });
      }
    }
  }

  for (const k of Object.keys(summary)) {
    summary[k].count =
      summary[k].added.length +
      summary[k].removed.length +
      summary[k].modified.length;
  }

  return summary;
}

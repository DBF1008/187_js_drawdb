import { ObjectType, Tab } from "../data/constants";

const objectTypeToTab = {
  [ObjectType.TABLE]: Tab.TABLES,
  [ObjectType.RELATIONSHIP]: Tab.RELATIONSHIPS,
  [ObjectType.TYPE]: Tab.TYPES,
  [ObjectType.ENUM]: Tab.ENUMS,
};

function getScrollId(issue) {
  switch (issue.objectType) {
    case ObjectType.TABLE:
      return `scroll_table_${issue.objectId}`;
    case ObjectType.RELATIONSHIP:
      return `scroll_ref_${issue.objectId}`;
    case ObjectType.TYPE:
      return `scroll_type_${issue.objectId}`;
    case ObjectType.ENUM:
      return `scroll_enum_${issue.objectId}`;
    default:
      return null;
  }
}

function getFieldScrollId(issue) {
  if (issue.childType === "field" && issue.objectType === ObjectType.TABLE) {
    const fieldIndex = issue.context?.fieldIndex;
    if (fieldIndex !== undefined && fieldIndex !== null) {
      return `scroll_table_${issue.objectId}_input_${fieldIndex}`;
    }
  }
  return null;
}

export function navigateToIssue(issue, { setSelectedElement, setTransform, tables }) {
  const tab = objectTypeToTab[issue.objectType];
  if (!tab) return;

  // Switch tab and select the object
  setSelectedElement((prev) => ({
    ...prev,
    currentTab: tab,
    element: issue.objectType,
    id: issue.objectId,
    open: true,
  }));

  // Defer scroll to allow React to render the new tab
  setTimeout(() => {
    // Try field-level scroll first, then fall back to object-level
    const fieldScrollId = getFieldScrollId(issue);
    let targetEl = fieldScrollId ? document.getElementById(fieldScrollId) : null;
    if (!targetEl) {
      const scrollId = getScrollId(issue);
      if (scrollId) {
        targetEl = document.getElementById(scrollId);
      }
    }
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 80);

  // Pan canvas for table objects
  if (issue.objectType === ObjectType.TABLE) {
    const table = tables.find((t) => t.id === issue.objectId);
    if (table) {
      setTransform((prev) => ({
        ...prev,
        pan: {
          x: table.x + 110,
          y: table.y + 80,
        },
      }));
    }
  }
}

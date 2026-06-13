import { useMemo, useCallback } from "react";
import {
  useDiagram,
  useAreas,
  useNotes,
  useTypes,
  useEnums,
  useSelect,
  useTransform,
  useLayout,
  useSettings,
} from "../../hooks";
import { ObjectType, Tab } from "../../data/constants";
import { databases } from "../../data/databases";
import { buildSearchIndex } from "./searchIndex";

/**
 * Hook that builds a global search index from all diagram entities
 * and provides a navigation function to jump to any search result.
 */
export default function useGlobalSearch() {
  const { tables, relationships, database } = useDiagram();
  const { areas } = useAreas();
  const { notes } = useNotes();
  const { types } = useTypes();
  const { enums } = useEnums();
  const { setSelectedElement } = useSelect();
  const { setTransform } = useTransform();
  const { setLayout } = useLayout();
  const { settings } = useSettings();

  const searchIndex = useMemo(() => {
    return buildSearchIndex({
      tables,
      relationships,
      areas,
      notes,
      types: databases[database]?.hasTypes ? types : [],
      enums: databases[database]?.hasEnums ? enums : [],
      settings,
    });
  }, [tables, relationships, areas, notes, types, enums, database, settings]);

  /**
   * Navigate to a search result:
   * 1. Ensure sidebar is visible and showing structure view
   * 2. Switch to the correct tab, select the entity, scroll to it
   * 3. Pan the canvas viewport to center on the entity
   */
  const navigateToResult = useCallback(
    (result) => {
      if (!result) return;

      // Step 1: Ensure sidebar is visible and in structure mode
      setLayout((prev) => ({
        ...prev,
        sidebar: true,
        dbmlEditor: false,
      }));

      // Step 2: Switch tab + select entity
      const { tab, objectType, entityId, fieldIndex, canvasCoords } = result;

      switch (objectType) {
        case ObjectType.TABLE:
          setSelectedElement((prev) => ({
            ...prev,
            currentTab: Tab.TABLES,
            element: ObjectType.TABLE,
            id: entityId,
            open: true,
          }));
          break;

        case ObjectType.RELATIONSHIP:
          setSelectedElement((prev) => ({
            ...prev,
            currentTab: Tab.RELATIONSHIPS,
            element: ObjectType.RELATIONSHIP,
            id: entityId,
            open: true,
          }));
          break;

        case ObjectType.AREA:
          setSelectedElement((prev) => ({
            ...prev,
            currentTab: Tab.AREAS,
            element: ObjectType.AREA,
            id: entityId,
            open: true,
          }));
          break;

        case ObjectType.NOTE:
          setSelectedElement((prev) => ({
            ...prev,
            currentTab: Tab.NOTES,
            element: ObjectType.NOTE,
            id: entityId,
            open: true,
          }));
          break;

        case ObjectType.TYPE:
          setSelectedElement((prev) => ({
            ...prev,
            currentTab: Tab.TYPES,
            element: ObjectType.TYPE,
            id: entityId,
            open: true,
          }));
          break;

        case ObjectType.ENUM:
          setSelectedElement((prev) => ({
            ...prev,
            currentTab: Tab.ENUMS,
            element: ObjectType.ENUM,
            id: entityId,
            open: true,
          }));
          break;

        default:
          break;
      }

      // Step 3: Deferred scroll + focus (tabs use lazyRender, DOM may not exist yet)
      requestAnimationFrame(() => {
        setTimeout(() => {
          let scrollId = null;
          let focusId = null;

          switch (objectType) {
            case ObjectType.TABLE:
              scrollId = `scroll_table_${entityId}`;
              if (fieldIndex !== null && fieldIndex !== undefined) {
                focusId = `scroll_table_${entityId}_input_${fieldIndex}`;
              }
              break;
            case ObjectType.RELATIONSHIP:
              scrollId = `scroll_ref_${entityId}`;
              break;
            case ObjectType.AREA:
              scrollId = `scroll_area_${entityId}`;
              break;
            case ObjectType.NOTE:
              scrollId = `scroll_note_${entityId}`;
              break;
            case ObjectType.TYPE:
              scrollId = `scroll_type_${entityId}`;
              break;
            case ObjectType.ENUM:
              scrollId = `scroll_enum_${entityId}`;
              break;
            default:
              break;
          }

          if (scrollId) {
            const el = document.getElementById(scrollId);
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            }
          }

          if (focusId) {
            const focusEl = document.getElementById(focusId);
            if (focusEl) {
              focusEl.focus();
            }
          }
        }, 300);
      });

      // Step 4: Pan canvas viewport to center on the entity
      if (canvasCoords) {
        setTransform((prev) => ({
          ...prev,
          pan: { x: canvasCoords.x, y: canvasCoords.y },
        }));
      }
    },
    [setSelectedElement, setTransform, setLayout],
  );

  return { searchIndex, navigateToResult };
}

import { useMemo } from "react";
import { TreeSelect } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import {
  useDiagram,
  useAreas,
  useNotes,
  useEnums,
  useTypes,
  useSettings,
  useSelect,
  useTransform,
} from "../../hooks";
import { ObjectType, Tab, noteWidth } from "../../data/constants";
import { databases } from "../../data/databases";
import { getTableHeight } from "../../utils/utils";

/**
 * Poll across animation frames until `getEl()` returns a node, then run `cb`.
 * Needed because switching tabs unmounts/mounts the panel (Tabs keepDOM=false)
 * and the collapse content is lazily rendered, so the target DOM appears a few
 * frames after the selection state is updated.
 */
function waitForElement(getEl, cb, attempts = 40) {
  const el = getEl();
  if (el) {
    cb(el);
    return;
  }
  if (attempts <= 0) return;
  requestAnimationFrame(() => waitForElement(getEl, cb, attempts - 1));
}

export default function GlobalSearchBar() {
  const { t } = useTranslation();
  const { tables, relationships, database } = useDiagram();
  const { areas } = useAreas();
  const { notes } = useNotes();
  const { enums } = useEnums();
  const { types } = useTypes();
  const { settings } = useSettings();
  const { setSelectedElement } = useSelect();
  const { setTransform } = useTransform();

  const treeData = useMemo(() => {
    const tableCenter = (tbl) => ({
      x: tbl.x + settings.tableWidth / 2,
      y:
        tbl.y +
        getTableHeight(
          tbl,
          settings.tableWidth,
          settings.showComments,
          relationships,
        ) /
          2,
    });

    const groups = [];

    if (tables.length) {
      groups.push({
        key: "cat-tables",
        value: "cat-tables",
        label: `${t("tables")} (${tables.length})`,
        selectable: false,
        children: tables.map((tbl) => ({
          key: `t-${tbl.id}`,
          value: `t-${tbl.id}`,
          label: tbl.name,
          objectType: ObjectType.TABLE,
          tab: Tab.TABLES,
          selectId: tbl.id,
          scrollId: `scroll_table_${tbl.id}`,
          center: tableCenter(tbl),
        })),
      });

      const fieldNodes = [];
      tables.forEach((tbl) => {
        tbl.fields.forEach((field, index) => {
          if (!field.name) return;
          fieldNodes.push({
            key: `f-${tbl.id}-${field.id}`,
            value: `f-${tbl.id}-${field.id}`,
            label: `${tbl.name} › ${field.name}`,
            objectType: ObjectType.TABLE,
            tab: Tab.TABLES,
            selectId: tbl.id,
            scrollId: `scroll_table_${tbl.id}`,
            focusId: `scroll_table_${tbl.id}_input_${index}`,
            center: tableCenter(tbl),
          });
        });
      });
      if (fieldNodes.length) {
        groups.push({
          key: "cat-fields",
          value: "cat-fields",
          label: `${t("fields", "Fields")} (${fieldNodes.length})`,
          selectable: false,
          children: fieldNodes,
        });
      }
    }

    if (relationships.length) {
      groups.push({
        key: "cat-relationships",
        value: "cat-relationships",
        label: `${t("relationships")} (${relationships.length})`,
        selectable: false,
        children: relationships.map((rel) => {
          const start = tables.find((tbl) => tbl.id === rel.startTableId);
          const end = tables.find((tbl) => tbl.id === rel.endTableId);
          let center;
          if (start && end) {
            const a = tableCenter(start);
            const b = tableCenter(end);
            center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          } else if (start) {
            center = tableCenter(start);
          } else if (end) {
            center = tableCenter(end);
          }
          return {
            key: `r-${rel.id}`,
            value: `r-${rel.id}`,
            label: rel.name,
            objectType: ObjectType.RELATIONSHIP,
            tab: Tab.RELATIONSHIPS,
            selectId: rel.id,
            scrollId: `scroll_ref_${rel.id}`,
            center,
          };
        }),
      });
    }

    if (areas.length) {
      groups.push({
        key: "cat-areas",
        value: "cat-areas",
        label: `${t("subject_areas")} (${areas.length})`,
        selectable: false,
        children: areas.map((area) => ({
          key: `a-${area.id}`,
          value: `a-${area.id}`,
          label: area.name,
          objectType: ObjectType.AREA,
          tab: Tab.AREAS,
          selectId: area.id,
          scrollId: `scroll_area_${area.id}`,
          center: {
            x: area.x + area.width / 2,
            y: area.y + area.height / 2,
          },
        })),
      });
    }

    if (notes.length) {
      groups.push({
        key: "cat-notes",
        value: "cat-notes",
        label: `${t("notes")} (${notes.length})`,
        selectable: false,
        children: notes.map((note) => ({
          key: `n-${note.id}`,
          value: `n-${note.id}`,
          label: note.title,
          objectType: ObjectType.NOTE,
          tab: Tab.NOTES,
          selectId: note.id,
          scrollId: `scroll_note_${note.id}`,
          center: {
            x: note.x + (note.width ?? noteWidth) / 2,
            y: note.y + (note.height ?? 0) / 2,
          },
        })),
      });
    }

    if (databases[database]?.hasTypes && types.length) {
      groups.push({
        key: "cat-types",
        value: "cat-types",
        label: `${t("types")} (${types.length})`,
        selectable: false,
        children: types.map((type, index) => ({
          key: `ty-${index}`,
          value: `ty-${index}`,
          label: type.name,
          objectType: ObjectType.TYPE,
          tab: Tab.TYPES,
          // TypesTab collapse itemKey is the array index, not the id.
          selectId: index,
          scrollId: `scroll_type_${type.id ?? index}`,
        })),
      });
    }

    if (databases[database]?.hasEnums && enums.length) {
      groups.push({
        key: "cat-enums",
        value: "cat-enums",
        label: `${t("enums")} (${enums.length})`,
        selectable: false,
        children: enums.map((enumeration) => ({
          key: `e-${enumeration.id}`,
          value: `e-${enumeration.id}`,
          label: enumeration.name,
          objectType: ObjectType.ENUM,
          tab: Tab.ENUMS,
          selectId: enumeration.id,
          scrollId: `scroll_enum_${enumeration.id}`,
        })),
      });
    }

    return groups;
  }, [
    tables,
    relationships,
    areas,
    notes,
    enums,
    types,
    database,
    settings.tableWidth,
    settings.showComments,
    t,
  ]);

  const navigateTo = (node) => {
    if (!node || node.selectable === false) return;

    setSelectedElement((prev) => ({
      ...prev,
      currentTab: node.tab,
      element: node.objectType,
      id: node.selectId,
      open: true,
    }));

    if (node.center) {
      setTransform((prev) => ({ ...prev, pan: node.center }));
    }

    waitForElement(
      () => document.getElementById(node.scrollId),
      (container) => {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
        if (node.focusId) {
          waitForElement(
            () => document.getElementById(node.focusId),
            (input) => input.focus(),
          );
        } else {
          const input = container.querySelector("input, textarea");
          if (input) input.focus();
        }
      },
    );
  };

  if (!treeData.length) return null;

  return (
    <TreeSelect
      searchPosition="trigger"
      dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
      treeData={treeData}
      prefix={<IconSearch />}
      emptyContent={<div className="p-3 popover-theme">{t("not_found")}</div>}
      filterTreeNode
      treeNodeFilterProp="label"
      showClear
      placeholder={t("search")}
      onChange={(node) => navigateTo(node)}
      onChangeWithObject
      className="w-full"
    />
  );
}

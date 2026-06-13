import { Button, Collapse } from "@douyinfe/semi-ui";
import { useEnums, useLayout, useSelect } from "../../../hooks";
import { IconPlus } from "@douyinfe/semi-icons";
import { ObjectType } from "../../../data/constants";
import { useTranslation } from "react-i18next";
import SearchBar from "./SearchBar";
import EnumDetails from "./EnumDetails";
import Empty from "../Empty";

export default function EnumsTab() {
  const { enums, addEnum } = useEnums();
  const { layout } = useLayout();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex gap-2">
        <SearchBar />
        <div>
          <Button
            block
            icon={<IconPlus />}
            onClick={() => addEnum()}
            disabled={layout.readOnly}
          >
            {t("add_enum")}
          </Button>
        </div>
      </div>
      {enums.length <= 0 ? (
        <Empty title={t("no_enums")} text={t("no_enums_text")} />
      ) : (
        <Collapse
          activeKey={
            selectedElement.open &&
            selectedElement.element === ObjectType.ENUM
              ? `${selectedElement.id}`
              : ""
          }
          keepDOM={false}
          lazyRender
          onChange={(activeKey) => {
            const key = Array.isArray(activeKey) ? activeKey[0] : activeKey;
            setSelectedElement((prev) => ({
              ...prev,
              open: true,
              id: key,
              element: ObjectType.ENUM,
            }));
          }}
          accordion
        >
          {enums.map((e) => (
            <Collapse.Panel
              key={`enum_${e.id}`}
              id={`scroll_enum_${e.id}`}
              header={
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {e.name}
                </div>
              }
              itemKey={`${e.id}`}
            >
              <EnumDetails data={e} />
            </Collapse.Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
}

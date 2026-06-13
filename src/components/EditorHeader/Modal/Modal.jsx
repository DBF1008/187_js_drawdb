import { Image, Input, Modal as SemiUIModal, Spin } from "@douyinfe/semi-ui";
import { saveAs } from "file-saver";
import { Parser } from "node-sql-parser";
import { Parser as OracleParser } from "oracle-sql-parser";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DB, IMPORT_FROM, MODAL, STATUS } from "../../../data/constants";
import {
  useAreas,
  useDiagram,
  useEnums,
  useNavigateWithParams,
  useNotes,
  useSettings,
  useTransform,
  useTypes,
  useUndoRedo,
} from "../../../hooks";
import { isRtl } from "../../../i18n/utils/rtl";
import { importSQL } from "../../../utils/importSQL";
import {
  normalizeImportData,
  buildComparison,
  applyImportSelection,
} from "../../../utils/importPreview";
import {
  getModalTitle,
  getModalWidth,
  getOkText,
} from "../../../utils/modalData";
import CodeEditor from "../../CodeEditor";
import ImportDiagram from "./ImportDiagram";
import ImportPreview from "./ImportPreview/ImportPreview";
import ImportSource from "./ImportSource";
import Language from "./Language";
import New from "./New";
import Open from "./Open";
import Rename from "./Rename";
import SetTableWidth from "./SetTableWidth";
import Share from "./Share";
import { mergeCustomTypes } from "../../../utils/customTypes";

const extensionToLanguage = {
  md: "markdown",
  sql: "sql",
  dbml: "dbml",
  json: "json",
};

export default function Modal({
  modal,
  setModal,
  title,
  setTitle,
  exportData,
  setExportData,
  importDb,
  importFrom,
}) {
  const { t, i18n } = useTranslation();
  const { tables, relationships, setTables, setRelationships, database } =
    useDiagram();
  const { notes, setNotes } = useNotes();
  const { areas, setAreas } = useAreas();
  const { types, setTypes } = useTypes();
  const { enums, setEnums } = useEnums();
  const { setTransform } = useTransform();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { settings, setSettings } = useSettings();
  const [uncontrolledTitle, setUncontrolledTitle] = useState(title);
  const [uncontrolledLanguage, setUncontrolledLanguage] = useState(
    i18n.language,
  );
  const [tempTableWidth, setTempTableWidth] = useState(settings.tableWidth);
  const [importSource, setImportSource] = useState({
    src: "",
    overwrite: false,
  });
  const [importData, setImportData] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [previewSource, setPreviewSource] = useState(null);
  const [error, setError] = useState({
    type: STATUS.NONE,
    message: "",
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(-1);
  const [selectedDiagramId, setSelectedDiagramId] = useState(0);
  const [saveAsTitle, setSaveAsTitle] = useState(title);
  const navigate = useNavigateWithParams();

  const transitionToPreview = (rawData, source) => {
    const normalized = normalizeImportData(rawData);
    const currentState = { tables, relationships, types, enums, areas, notes };
    const comp = buildComparison(normalized, currentState);
    setComparison(comp);
    setPreviewSource(source);
    setModal(MODAL.IMPORT_PREVIEW);
  };

  const parseSQLToData = () => {
    const targetDatabase = database === DB.GENERIC ? importDb : database;

    let ast = null;
    try {
      if (targetDatabase === DB.ORACLESQL) {
        const oracleParser = new OracleParser();
        ast = oracleParser.parse(importSource.src);
      } else {
        const parser = new Parser();
        ast = parser.astify(importSource.src, {
          database: targetDatabase,
        });
      }
    } catch (error) {
      const message = error.location
        ? `${error.name} [Ln ${error.location.start.line}, Col ${error.location.start.column}]: ${error.message}`
        : error.message;

      setError({ type: STATUS.ERROR, message });
      return null;
    }

    try {
      return importSQL(
        ast,
        database === DB.GENERIC ? importDb : database,
        database,
      );
    } catch (e) {
      setError({
        type: STATUS.ERROR,
        message: `Please check for syntax errors or let us know about the error.`,
      });
      return null;
    }
  };

  const getModalOnOk = async () => {
    switch (modal) {
      case MODAL.IMG:
        saveAs(
          exportData.data,
          `${exportData.filename}.${exportData.extension}`,
        );
        return;
      case MODAL.CODE: {
        const blob = new Blob([exportData.data], {
          type: "application/json",
        });
        saveAs(blob, `${exportData.filename}.${exportData.extension}`);
        return;
      }
      case MODAL.IMPORT:
        if (error.type !== STATUS.ERROR && importData) {
          const source =
            importFrom === IMPORT_FROM.JSON ? "json" : "dbml";
          // Handle custom types separately (always merge additively)
          if (importData.customTypes) {
            mergeCustomTypes(importData.customTypes);
          }
          transitionToPreview(importData, source);
        }
        return;
      case MODAL.IMPORT_SRC: {
        const diagramData = parseSQLToData();
        if (diagramData) {
          transitionToPreview(diagramData, "sql");
        }
        return;
      }
      case MODAL.IMPORT_PREVIEW:
        if (comparison) {
          const currentState = {
            tables,
            relationships,
            types,
            enums,
            areas,
            notes,
          };
          applyImportSelection(comparison, currentState, {
            setTables,
            setRelationships,
            setTypes,
            setEnums,
            setAreas,
            setNotes,
            setTransform,
            setUndoStack,
            setRedoStack,
          });
          setComparison(null);
          setPreviewSource(null);
          setModal(MODAL.NONE);
        }
        return;
      case MODAL.OPEN:
        if (!selectedDiagramId) return;
        navigate(`/editor/diagrams/${selectedDiagramId}`, "_blank");
        setModal(MODAL.NONE);
        return;
      case MODAL.RENAME:
        setTitle(uncontrolledTitle);
        setModal(MODAL.NONE);
        return;
      case MODAL.SAVEAS:
        setTitle(saveAsTitle);
        setModal(MODAL.NONE);
        return;
      case MODAL.NEW:
        window.open("/editor/templates/" + selectedTemplateId, "_blank");
        setModal(MODAL.NONE);
        return;
      case MODAL.LANGUAGE:
        i18n.changeLanguage(uncontrolledLanguage);
        setModal(MODAL.NONE);
        return;
      case MODAL.TABLE_WIDTH:
        setSettings((prev) => ({ ...prev, tableWidth: tempTableWidth }));
        setModal(MODAL.NONE);
        return;
      default:
        setModal(MODAL.NONE);
        return;
    }
  };

  const getModalBody = () => {
    switch (modal) {
      case MODAL.IMPORT:
        return (
          <ImportDiagram
            setImportData={setImportData}
            error={error}
            setError={setError}
            importFrom={importFrom}
          />
        );
      case MODAL.IMPORT_SRC:
        return (
          <ImportSource
            setImportData={setImportSource}
            error={error}
            setError={setError}
          />
        );
      case MODAL.IMPORT_PREVIEW:
        return comparison ? (
          <ImportPreview
            comparison={comparison}
            setComparison={setComparison}
            source={previewSource}
          />
        ) : null;
      case MODAL.NEW:
        return (
          <New
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
          />
        );
      case MODAL.RENAME:
        return (
          <Rename key={title} title={title} setTitle={setUncontrolledTitle} />
        );
      case MODAL.OPEN:
        return (
          <Open
            selectedDiagramId={selectedDiagramId}
            setSelectedDiagramId={setSelectedDiagramId}
          />
        );
      case MODAL.SAVEAS:
        return (
          <Input
            placeholder={t("name")}
            value={saveAsTitle}
            onChange={(v) => setSaveAsTitle(v)}
          />
        );
      case MODAL.CODE:
      case MODAL.IMG:
        if (exportData.data !== "" || exportData.data) {
          return (
            <>
              {modal === MODAL.IMG ? (
                <Image src={exportData.data} alt="Diagram" height={280} />
              ) : (
                <CodeEditor
                  height={360}
                  value={exportData.data}
                  language={extensionToLanguage[exportData.extension]}
                  options={{ readOnly: true }}
                  showCopyButton={true}
                />
              )}
              <div className="text-sm font-semibold mt-2">{t("filename")}:</div>
              <Input
                value={exportData.filename}
                placeholder={t("filename")}
                suffix={<div className="p-2">{`.${exportData.extension}`}</div>}
                onChange={(value) =>
                  setExportData((prev) => ({ ...prev, filename: value }))
                }
                field="filename"
              />
            </>
          );
        } else {
          return (
            <div className="text-center my-3 text-sky-600">
              <Spin tip={t("loading")} size="large" />
            </div>
          );
        }
      case MODAL.TABLE_WIDTH:
        return (
          <SetTableWidth
            tempWidth={tempTableWidth}
            setTempWidth={setTempTableWidth}
          />
        );
      case MODAL.LANGUAGE:
        return (
          <Language
            language={uncontrolledLanguage}
            setLanguage={setUncontrolledLanguage}
          />
        );
      case MODAL.SHARE:
        return <Share title={title} setModal={setModal} />;
      default:
        return <></>;
    }
  };

  return (
    <SemiUIModal
      style={isRtl(i18n.language) ? { direction: "rtl" } : {}}
      title={getModalTitle(modal)}
      visible={modal !== MODAL.NONE && modal !== MODAL.CONFIG_CUSTOM_TYPES}
      onOk={getModalOnOk}
      afterClose={() => {
        setExportData(() => ({
          data: "",
          extension: "",
          filename: `${title}_${new Date().toISOString()}`,
        }));
        setError({
          type: STATUS.NONE,
          message: "",
        });
        setImportData(null);
        setImportSource({
          src: "",
          overwrite: false,
        });
        setComparison(null);
        setPreviewSource(null);
      }}
      onCancel={() => {
        if (modal === MODAL.RENAME) setUncontrolledTitle(title);
        if (modal === MODAL.LANGUAGE) setUncontrolledLanguage(i18n.language);
        if (modal === MODAL.TABLE_WIDTH) setTempTableWidth(settings.tableWidth);
        if (modal === MODAL.IMPORT_PREVIEW) {
          setComparison(null);
          setPreviewSource(null);
        }
        setModal(MODAL.NONE);
      }}
      centered
      closeOnEsc={true}
      okText={getOkText(modal)}
      okButtonProps={{
        disabled:
          (error && error?.type === STATUS.ERROR) ||
          (modal === MODAL.IMPORT &&
            (error.type === STATUS.ERROR || !importData)) ||
          (modal === MODAL.RENAME && title === "") ||
          ((modal === MODAL.IMG || modal === MODAL.CODE) && !exportData.data) ||
          (modal === MODAL.SAVEAS && saveAsTitle === "") ||
          (modal === MODAL.IMPORT_SRC && importSource.src === "") ||
          (modal === MODAL.IMPORT_PREVIEW &&
            (!comparison ||
              !Object.values(comparison).some((items) =>
                items.some((item) => item.selected),
              ))),
        hidden: modal === MODAL.SHARE,
      }}
      hasCancel={modal !== MODAL.SHARE}
      cancelText={t("cancel")}
      width={getModalWidth(modal)}
      bodyStyle={{
        maxHeight: window.innerHeight - 280,
        overflow:
          modal === MODAL.CODE || modal === MODAL.IMG ? "hidden" : "auto",
        direction: "ltr",
      }}
    >
      {getModalBody()}
    </SemiUIModal>
  );
}

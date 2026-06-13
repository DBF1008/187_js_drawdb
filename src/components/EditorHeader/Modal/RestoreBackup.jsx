import { useState } from "react";
import { Upload, Banner, Radio, Spin, Button } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { importSavedData } from "../../../utils/importSavedData";

export default function RestoreBackup({ setModal }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [onDuplicate, setOnDuplicate] = useState("overwrite");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importSavedData(file, onDuplicate);
      setResult(res);
    } catch (e) {
      setError(e.message || t("oops_smth_went_wrong"));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div>
        <Banner
          type="success"
          fullMode={false}
          description={
            <div>
              <p className="font-semibold mb-2">{t("restore_successful")}</p>
              <ul className="list-disc ps-5 text-sm space-y-1">
                {result.diagramsAdded > 0 && (
                  <li>
                    {t("diagrams_added", { count: result.diagramsAdded })}
                  </li>
                )}
                {result.diagramsOverwritten > 0 && (
                  <li>
                    {t("diagrams_overwritten", {
                      count: result.diagramsOverwritten,
                    })}
                  </li>
                )}
                {result.diagramsSkipped > 0 && (
                  <li>
                    {t("diagrams_skipped", {
                      count: result.diagramsSkipped,
                    })}
                  </li>
                )}
                {result.templatesAdded > 0 && (
                  <li>
                    {t("templates_added", { count: result.templatesAdded })}
                  </li>
                )}
                {result.templatesOverwritten > 0 && (
                  <li>
                    {t("templates_overwritten", {
                      count: result.templatesOverwritten,
                    })}
                  </li>
                )}
                {result.templatesSkipped > 0 && (
                  <li>
                    {t("templates_skipped", {
                      count: result.templatesSkipped,
                    })}
                  </li>
                )}
              </ul>
            </div>
          }
        />
        <div className="mt-4 text-sm text-gray-500">
          {t("restore_refresh_note")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="text-sm mb-2">{t("restore_backup_description")}</div>
        <Upload
          action="#"
          beforeUpload={({ fileList }) => {
            const f = fileList[0]?.fileInstance;
            if (f) {
              setFile(f);
              setError(null);
            }
            return {
              autoRemove: false,
              fileInstance: fileList[0]?.fileInstance,
              status: "success",
              shouldUpload: false,
            };
          }}
          draggable={true}
          dragMainText={t("drag_and_drop_files")}
          dragSubText={`${t("supported_types")} ZIP`}
          accept=".zip"
          onRemove={() => {
            setFile(null);
            setError(null);
          }}
          onFileChange={() => {
            setFile(null);
            setError(null);
          }}
          limit={1}
        />
      </div>

      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">
          {t("duplicate_handling")}
        </div>
        <Radio.Group
          value={onDuplicate}
          onChange={(e) => setOnDuplicate(e.target.value)}
        >
          <Radio value="overwrite">{t("overwrite_existing")}</Radio>
          <Radio value="skip">{t("skip_existing")}</Radio>
        </Radio.Group>
      </div>

      {error && (
        <Banner
          type="danger"
          fullMode={false}
          description={<div>{error}</div>}
        />
      )}

      {loading && (
        <div className="text-center my-3">
          <Spin tip={t("loading")} size="large" />
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button
          type="primary"
          disabled={!file || loading}
          onClick={handleImport}
          loading={loading}
        >
          {t("restore")}
        </Button>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Input, Modal, Spin, Toast } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { getVersion, VERSION_FILENAME } from "../../../api/gists";
import { db } from "../../../data/db";
import { DB } from "../../../data/constants";
import { useNavigateWithParams } from "../../../hooks";

export default function BranchDialog({
  sha,
  gistId,
  visible,
  onClose,
  title,
}) {
  const { t } = useTranslation();
  const navigate = useNavigateWithParams();
  const [branchName, setBranchName] = useState(`${title} (branch)`);
  const [isCreating, setIsCreating] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setBranchName(`${title} (branch)`);
    setPreview(null);

    if (!sha || !gistId) return;

    getVersion(gistId, sha)
      .then((res) => {
        if (res.data.files[VERSION_FILENAME]) {
          const parsed = JSON.parse(
            res.data.files[VERSION_FILENAME].content,
          );
          setPreview({
            tables: parsed.tables?.length ?? 0,
            relationships: parsed.relationships?.length ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [sha, gistId, title]);

  const handleCreateBranch = useCallback(async () => {
    if (!sha || !gistId) return;
    setIsCreating(true);
    try {
      const res = await getVersion(gistId, sha);
      if (!res.data.files[VERSION_FILENAME]) {
        Toast.error(t("failed_to_load_diagram"));
        return;
      }

      const content = res.data.files[VERSION_FILENAME].content;
      const parsed = JSON.parse(content);

      const newDiagramId = crypto.randomUUID();
      await db.diagrams.add({
        diagramId: newDiagramId,
        database: parsed.database || DB.GENERIC,
        name: branchName || `${title} (branch)`,
        gistId: "",
        lastModified: new Date(),
        tables: parsed.tables || [],
        references: parsed.relationships || [],
        notes: parsed.notes || [],
        areas: parsed.subjectAreas || [],
        pan: parsed.transform?.pan || { x: 0, y: 0 },
        zoom: parsed.transform?.zoom || 1,
        ...(parsed.types && { types: parsed.types }),
        ...(parsed.enums && { enums: parsed.enums }),
      });

      Toast.success(t("branch_created"));
      onClose();
      navigate(`/editor/diagrams/${newDiagramId}`);
    } catch {
      Toast.error(t("failed_to_branch"));
    } finally {
      setIsCreating(false);
    }
  }, [sha, gistId, branchName, title, t, onClose, navigate]);

  return (
    <Modal
      centered
      size="small"
      visible={visible}
      onCancel={onClose}
      onOk={handleCreateBranch}
      confirmLoading={isCreating}
      title={`${t("branch_from_version")} ${sha?.substring(0, 7) ?? ""}`}
      okText={t("create_branch")}
    >
      {preview === null ? (
        <div className="flex justify-center py-4">
          <Spin size="small" />
        </div>
      ) : (
        <div className="text-sm opacity-70 mb-3">
          {t("branch_preview", {
            tables: preview.tables,
            relationships: preview.relationships,
          })}
        </div>
      )}

      <div className="text-sm font-semibold mb-1">{t("branch_name")}</div>
      <Input
        value={branchName}
        onChange={setBranchName}
        placeholder={t("branch_name")}
      />
    </Modal>
  );
}

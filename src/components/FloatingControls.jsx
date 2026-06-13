import { Divider, Tooltip } from "@douyinfe/semi-ui";
import { useTransform, useLayout } from "../hooks";
import { exitFullscreen } from "../utils/fullscreen";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { queryConfig } from "../utils/queryConfig";

export default function FloatingControls() {
  const { transform, setTransform } = useTransform();
  const { setLayout } = useLayout();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const isForced = (configKey) =>
    queryConfig[configKey].isForced(
      searchParams.get(queryConfig[configKey].key),
    );

  return (
    <div className="flex gap-2">
      <div className="popover-theme flex rounded-lg items-center">
        <button
          className="px-3 py-2"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              zoom: prev.zoom / 1.2,
            }))
          }
        >
          <i className="bi bi-dash-lg" />
        </button>
        <Divider align="center" layout="vertical" />
        <div className="px-3 py-2">{parseInt(transform.zoom * 100)}%</div>
        <Divider align="center" layout="vertical" />
        <button
          className="px-3 py-2"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              zoom: prev.zoom * 1.2,
            }))
          }
        >
          <i className="bi bi-plus-lg" />
        </button>
      </div>
      <Tooltip content={t("exit")}>
        <button
          className="px-3 py-2 rounded-lg popover-theme"
          onClick={() => {
            setLayout((prev) => ({
              ...prev,
              header: isForced("hideHeader") ? prev.header : true,
              sidebar: isForced("hideSidebar") ? prev.sidebar : true,
              toolbar: isForced("hideToolbar") ? prev.toolbar : true,
              issues: isForced("hideIssues") ? prev.issues : true,
            }));
            exitFullscreen();
          }}
        >
          <i className="bi bi-fullscreen-exit" />
        </button>
      </Tooltip>
    </div>
  );
}

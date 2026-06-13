import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Modal, Input, Tag } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { filterResults } from "./searchIndex";
import useGlobalSearch from "./useGlobalSearch";

const TYPE_COLORS = {
  table: "blue",
  field: "cyan",
  relationship: "purple",
  area: "green",
  note: "amber",
  type: "violet",
  enum: "pink",
};

export default function GlobalSearch({ visible, onClose }) {
  const { t } = useTranslation();
  const { searchIndex, navigateToResult } = useGlobalSearch();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => filterResults(searchIndex, query), [
    searchIndex,
    query,
  ]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setQuery("");
      setActiveIndex(0);
      // Auto-focus the input after modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  // Keep active index visible in the list
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${activeIndex}"]`,
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (result) => {
      navigateToResult(result);
      onClose();
    },
    [navigateToResult, onClose],
  );

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (results[activeIndex]) {
            handleSelect(results[activeIndex]);
          }
          break;
        default:
          break;
      }
    },
    [results, activeIndex, handleSelect],
  );

  const handleInputChange = useCallback((value) => {
    setQuery(value);
    setActiveIndex(0);
  }, []);

  const getTypeLabel = useCallback(
    (type) => {
      const keyMap = {
        table: "tables",
        field: "field",
        relationship: "relationships",
        area: "subject_areas",
        note: "notes",
        type: "types",
        enum: "enums",
      };
      return t(keyMap[type] || type);
    },
    [t],
  );

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      centered
      closable={false}
      footer={null}
      width={560}
      className="global-search-modal"
      maskClosable
      hasCancel={false}
      bodyStyle={{ padding: 0 }}
    >
      <div
        className="global-search-container"
        onKeyDown={handleKeyDown}
        style={{ direction: "ltr" }}
      >
        {/* Search input */}
        <div className="p-3 border-b border-color">
          <Input
            ref={inputRef}
            prefix={<IconSearch />}
            suffix={
              <span className="text-xs opacity-50 font-mono">
                {t("esc")}
              </span>
            }
            placeholder={t("global_search")}
            value={query}
            onChange={handleInputChange}
            size="large"
            autoFocus
            className="global-search-input"
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: "400px" }}
        >
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm opacity-50">
              {query ? t("not_found") : t("global_search_hint")}
            </div>
          ) : (
            results.map((result, i) => (
              <div
                key={result.key}
                data-index={i}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  i === activeIndex
                    ? "bg-primary-light-default"
                    : "hover:bg-fill-0"
                }`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <Tag
                  size="small"
                  color={TYPE_COLORS[result.type] || "grey"}
                  className="shrink-0 min-w-[60px] justify-center"
                >
                  {getTypeLabel(result.type)}
                </Tag>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate font-medium">
                    {result.label}
                  </div>
                  {result.detail && (
                    <div className="text-xs opacity-50 truncate">
                      {result.detail}
                    </div>
                  )}
                </div>
                {result.canvasCoords && (
                  <i
                    className="fa-solid fa-location-crosshairs text-xs opacity-30 shrink-0"
                    title={t("locate_on_canvas")}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-color text-xs opacity-50">
            <span>
              <kbd className="px-1 py-0.5 bg-fill-1 rounded text-xs font-mono">
                ↑↓
              </kbd>{" "}
              {t("navigate")}
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-fill-1 rounded text-xs font-mono">
                ↵
              </kbd>{" "}
              {t("select")}
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-fill-1 rounded text-xs font-mono">
                esc
              </kbd>{" "}
              {t("close")}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

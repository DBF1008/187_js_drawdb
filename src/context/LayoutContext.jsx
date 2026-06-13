import { createContext, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { queryConfig } from "../utils/queryConfig";

export const LayoutContext = createContext(null);

const defaultLayout = {
  header: true,
  sidebar: true,
  issues: true,
  toolbar: true,
  dbmlEditor: false,
  readOnly: false,
};

export default function LayoutContextProvider({ children }) {
  const [searchParams] = useSearchParams();

  const hideHeaderParam = searchParams.get(queryConfig.hideHeader.key);
  const hideSidebarParam = searchParams.get(queryConfig.hideSidebar.key);
  const hideToolbarParam = searchParams.get(queryConfig.hideToolbar.key);
  const hideIssuesParam = searchParams.get(queryConfig.hideIssues.key);
  const readonlyParam = searchParams.get(queryConfig.readonly.key);
  const dbmlParam = searchParams.get(queryConfig.dbml.key);

  const [layout, setLayout] = useState({
    ...defaultLayout,
    header: queryConfig.hideHeader.isActive(hideHeaderParam)
      ? false
      : defaultLayout.header,
    sidebar: queryConfig.hideSidebar.isActive(hideSidebarParam)
      ? false
      : defaultLayout.sidebar,
    toolbar: queryConfig.hideToolbar.isActive(hideToolbarParam)
      ? false
      : defaultLayout.toolbar,
    issues: queryConfig.hideIssues.isActive(hideIssuesParam)
      ? false
      : defaultLayout.issues,
    readOnly: queryConfig.readonly.isActive(readonlyParam)
      ? true
      : defaultLayout.readOnly,
    dbmlEditor: queryConfig.dbml.isActive(dbmlParam)
      ? true
      : defaultLayout.dbmlEditor,
  });

  const effectiveLayout = {
    ...layout,
    header: queryConfig.hideHeader.isForced(hideHeaderParam)
      ? false
      : layout.header,
    sidebar: queryConfig.hideSidebar.isForced(hideSidebarParam)
      ? false
      : layout.sidebar,
    toolbar: queryConfig.hideToolbar.isForced(hideToolbarParam)
      ? false
      : layout.toolbar,
    issues: queryConfig.hideIssues.isForced(hideIssuesParam)
      ? false
      : layout.issues,
    readOnly: queryConfig.readonly.isForced(readonlyParam)
      ? true
      : layout.readOnly,
    dbmlEditor: queryConfig.dbml.isForced(dbmlParam)
      ? true
      : layout.dbmlEditor,
  };

  return (
    <LayoutContext.Provider
      value={{
        layout: effectiveLayout,
        setLayout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

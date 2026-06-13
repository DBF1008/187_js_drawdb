export const queryConfig = {
  theme: {
    key: "theme",
    label: "theme",
    options: [
      { label: "default", value: null },
      { label: "light", value: "light" },
      { label: "dark", value: "dark" },
    ],
    isValid: (val) => ["light", "dark"].includes(val),
  },
  hideHeader: {
    key: "hideHeader",
    label: "header",
    options: [
      { label: "default", value: null },
      { label: "hide", value: "true" },
      { label: "force_hide", value: "force" },
    ],
    isActive: (val) => val === "true" || val === "force",
    isForced: (val) => val === "force",
  },
  hideSidebar: {
    key: "hideSidebar",
    label: "sidebar",
    options: [
      { label: "default", value: null },
      { label: "hide", value: "true" },
      { label: "force_hide", value: "force" },
    ],
    isActive: (val) => val === "true" || val === "force",
    isForced: (val) => val === "force",
  },
  hideToolbar: {
    key: "hideToolbar",
    label: "toolbar",
    options: [
      { label: "default", value: null },
      { label: "hide", value: "true" },
      { label: "force_hide", value: "force" },
    ],
    isActive: (val) => val === "true" || val === "force",
    isForced: (val) => val === "force",
  },
  hideIssues: {
    key: "hideIssues",
    label: "issues",
    options: [
      { label: "default", value: null },
      { label: "hide", value: "true" },
      { label: "force_hide", value: "force" },
    ],
    isActive: (val) => val === "true" || val === "force",
    isForced: (val) => val === "force",
  },
  readonly: {
    key: "readonly",
    label: "read_only",
    options: [
      { label: "default", value: null },
      { label: "on", value: "true" },
      { label: "force_on", value: "force" },
    ],
    isActive: (val) => val === "true" || val === "force",
    isForced: (val) => val === "force",
  },
  dbml: {
    key: "dbml",
    label: "dbml_view",
    options: [
      { label: "default", value: null },
      { label: "on", value: "true" },
      { label: "force_on", value: "force" },
    ],
    isActive: (val) => val === "true" || val === "force",
    isForced: (val) => val === "force",
  },
};

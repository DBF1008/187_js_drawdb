import { describe, it, expect } from "vitest";
import { queryConfig } from "../utils/queryConfig";

describe("queryConfig", () => {
  describe("theme", () => {
    it("isValid returns true for light and dark", () => {
      expect(queryConfig.theme.isValid("light")).toBe(true);
      expect(queryConfig.theme.isValid("dark")).toBe(true);
    });

    it("isValid returns false for other values", () => {
      expect(queryConfig.theme.isValid(null)).toBe(false);
      expect(queryConfig.theme.isValid("blue")).toBe(false);
      expect(queryConfig.theme.isValid("")).toBe(false);
    });

    it("has three options", () => {
      expect(queryConfig.theme.options).toHaveLength(3);
    });
  });

  describe("hide params (hideHeader, hideSidebar, hideToolbar, hideIssues)", () => {
    const hideKeys = ["hideHeader", "hideSidebar", "hideToolbar", "hideIssues"];

    hideKeys.forEach((key) => {
      describe(key, () => {
        it("isActive returns false for null", () => {
          expect(queryConfig[key].isActive(null)).toBe(false);
        });

        it("isActive returns true for 'true'", () => {
          expect(queryConfig[key].isActive("true")).toBe(true);
        });

        it("isActive returns true for 'force'", () => {
          expect(queryConfig[key].isActive("force")).toBe(true);
        });

        it("isActive returns false for other values", () => {
          expect(queryConfig[key].isActive("false")).toBe(false);
          expect(queryConfig[key].isActive("")).toBe(false);
        });

        it("isForced returns false for null", () => {
          expect(queryConfig[key].isForced(null)).toBe(false);
        });

        it("isForced returns false for 'true'", () => {
          expect(queryConfig[key].isForced("true")).toBe(false);
        });

        it("isForced returns true for 'force'", () => {
          expect(queryConfig[key].isForced("force")).toBe(true);
        });

        it("has three options: default, hide, force_hide", () => {
          expect(queryConfig[key].options).toHaveLength(3);
          expect(queryConfig[key].options[0].value).toBeNull();
          expect(queryConfig[key].options[1].value).toBe("true");
          expect(queryConfig[key].options[2].value).toBe("force");
        });

        it("has correct key and label", () => {
          expect(queryConfig[key].key).toBe(key);
          expect(typeof queryConfig[key].label).toBe("string");
        });
      });
    });
  });

  describe("enable params (readonly, dbml)", () => {
    const enableKeys = ["readonly", "dbml"];

    enableKeys.forEach((key) => {
      describe(key, () => {
        it("isActive returns false for null", () => {
          expect(queryConfig[key].isActive(null)).toBe(false);
        });

        it("isActive returns true for 'true'", () => {
          expect(queryConfig[key].isActive("true")).toBe(true);
        });

        it("isActive returns true for 'force'", () => {
          expect(queryConfig[key].isActive("force")).toBe(true);
        });

        it("isForced returns false for null", () => {
          expect(queryConfig[key].isForced(null)).toBe(false);
        });

        it("isForced returns false for 'true'", () => {
          expect(queryConfig[key].isForced("true")).toBe(false);
        });

        it("isForced returns true for 'force'", () => {
          expect(queryConfig[key].isForced("force")).toBe(true);
        });

        it("has three options: default, on, force_on", () => {
          expect(queryConfig[key].options).toHaveLength(3);
          expect(queryConfig[key].options[0].value).toBeNull();
          expect(queryConfig[key].options[1].value).toBe("true");
          expect(queryConfig[key].options[2].value).toBe("force");
        });

        it("has correct key and label", () => {
          expect(queryConfig[key].key).toBe(key);
          expect(typeof queryConfig[key].label).toBe("string");
        });
      });
    });
  });

  describe("all entries have required shape", () => {
    it("every entry has key, label, and options", () => {
      Object.entries(queryConfig).forEach(([, config]) => {
        expect(config).toHaveProperty("key");
        expect(config).toHaveProperty("label");
        expect(config).toHaveProperty("options");
        expect(Array.isArray(config.options)).toBe(true);
      });
    });

    it("every non-theme entry has isActive and isForced", () => {
      Object.entries(queryConfig)
        .filter(([key]) => key !== "theme")
        .forEach(([, config]) => {
          expect(typeof config.isActive).toBe("function");
          expect(typeof config.isForced).toBe("function");
        });
    });
  });
});

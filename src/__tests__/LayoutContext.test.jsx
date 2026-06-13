import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useContext } from "react";
import LayoutContextProvider, {
  LayoutContext,
} from "../context/LayoutContext";

function LayoutConsumer() {
  const { layout, setLayout } = useContext(LayoutContext);
  return (
    <div>
      <span data-testid="header">{String(layout.header)}</span>
      <span data-testid="sidebar">{String(layout.sidebar)}</span>
      <span data-testid="toolbar">{String(layout.toolbar)}</span>
      <span data-testid="issues">{String(layout.issues)}</span>
      <span data-testid="readOnly">{String(layout.readOnly)}</span>
      <span data-testid="dbmlEditor">{String(layout.dbmlEditor)}</span>
      <button
        data-testid="toggle-header"
        onClick={() =>
          setLayout((prev) => ({ ...prev, header: !prev.header }))
        }
      >
        toggle header
      </button>
      <button
        data-testid="toggle-issues"
        onClick={() =>
          setLayout((prev) => ({ ...prev, issues: !prev.issues }))
        }
      >
        toggle issues
      </button>
      <button
        data-testid="toggle-readonly"
        onClick={() =>
          setLayout((prev) => ({ ...prev, readOnly: !prev.readOnly }))
        }
      >
        toggle readonly
      </button>
      <button
        data-testid="toggle-dbml"
        onClick={() =>
          setLayout((prev) => ({ ...prev, dbmlEditor: !prev.dbmlEditor }))
        }
      >
        toggle dbml
      </button>
    </div>
  );
}

function renderWithRoute(initialPath = "/editor") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LayoutContextProvider>
        <LayoutConsumer />
      </LayoutContextProvider>
    </MemoryRouter>,
  );
}

describe("LayoutContext", () => {
  describe("default mode (no params)", () => {
    it("has all defaults correct", () => {
      renderWithRoute("/editor");
      expect(screen.getByTestId("header")).toHaveTextContent("true");
      expect(screen.getByTestId("sidebar")).toHaveTextContent("true");
      expect(screen.getByTestId("toolbar")).toHaveTextContent("true");
      expect(screen.getByTestId("issues")).toHaveTextContent("true");
      expect(screen.getByTestId("readOnly")).toHaveTextContent("false");
      expect(screen.getByTestId("dbmlEditor")).toHaveTextContent("false");
    });
  });

  describe("isActive on mount", () => {
    it("hideHeader=true hides header initially", () => {
      renderWithRoute("/editor?hideHeader=true");
      expect(screen.getByTestId("header")).toHaveTextContent("false");
    });

    it("hideSidebar=true hides sidebar initially", () => {
      renderWithRoute("/editor?hideSidebar=true");
      expect(screen.getByTestId("sidebar")).toHaveTextContent("false");
    });

    it("hideToolbar=true hides toolbar initially", () => {
      renderWithRoute("/editor?hideToolbar=true");
      expect(screen.getByTestId("toolbar")).toHaveTextContent("false");
    });

    it("hideIssues=true hides issues initially", () => {
      renderWithRoute("/editor?hideIssues=true");
      expect(screen.getByTestId("issues")).toHaveTextContent("false");
    });

    it("readonly=true sets readOnly initially", () => {
      renderWithRoute("/editor?readonly=true");
      expect(screen.getByTestId("readOnly")).toHaveTextContent("true");
    });

    it("dbml=true sets dbmlEditor initially", () => {
      renderWithRoute("/editor?dbml=true");
      expect(screen.getByTestId("dbmlEditor")).toHaveTextContent("true");
    });

    it("allows user to toggle non-forced values", async () => {
      renderWithRoute("/editor?hideHeader=true");
      expect(screen.getByTestId("header")).toHaveTextContent("false");
      await act(async () => {
        screen.getByTestId("toggle-header").click();
      });
      expect(screen.getByTestId("header")).toHaveTextContent("true");
    });
  });

  describe("isForced mode (forced combinations)", () => {
    it("hideHeader=force cannot be toggled back", async () => {
      renderWithRoute("/editor?hideHeader=force");
      expect(screen.getByTestId("header")).toHaveTextContent("false");
      await act(async () => {
        screen.getByTestId("toggle-header").click();
      });
      expect(screen.getByTestId("header")).toHaveTextContent("false");
    });

    it("hideIssues=force cannot be toggled back", async () => {
      renderWithRoute("/editor?hideIssues=force");
      expect(screen.getByTestId("issues")).toHaveTextContent("false");
      await act(async () => {
        screen.getByTestId("toggle-issues").click();
      });
      expect(screen.getByTestId("issues")).toHaveTextContent("false");
    });

    it("readonly=force cannot be toggled off", async () => {
      renderWithRoute("/editor?readonly=force");
      expect(screen.getByTestId("readOnly")).toHaveTextContent("true");
      await act(async () => {
        screen.getByTestId("toggle-readonly").click();
      });
      expect(screen.getByTestId("readOnly")).toHaveTextContent("true");
    });

    it("dbml=force cannot be toggled off", async () => {
      renderWithRoute("/editor?dbml=force");
      expect(screen.getByTestId("dbmlEditor")).toHaveTextContent("true");
      await act(async () => {
        screen.getByTestId("toggle-dbml").click();
      });
      expect(screen.getByTestId("dbmlEditor")).toHaveTextContent("true");
    });

    it("multiple forced params work together", () => {
      renderWithRoute(
        "/editor?hideHeader=force&hideSidebar=force&hideToolbar=force&hideIssues=force&readonly=force&dbml=force",
      );
      expect(screen.getByTestId("header")).toHaveTextContent("false");
      expect(screen.getByTestId("sidebar")).toHaveTextContent("false");
      expect(screen.getByTestId("toolbar")).toHaveTextContent("false");
      expect(screen.getByTestId("issues")).toHaveTextContent("false");
      expect(screen.getByTestId("readOnly")).toHaveTextContent("true");
      expect(screen.getByTestId("dbmlEditor")).toHaveTextContent("true");
    });
  });
});

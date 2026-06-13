import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import useNavigateWithParams from "../hooks/useNavigateWithParams";

function NavigateButton({ to }) {
  const navigateWithParams = useNavigateWithParams();
  return (
    <button
      data-testid="navigate"
      onClick={() => navigateWithParams(to)}
    >
      navigate
    </button>
  );
}

function LocationDisplay() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
    </div>
  );
}

function renderWithRoute(initialPath, searchParams) {
  const initialEntry = searchParams
    ? `${initialPath}?${searchParams}`
    : initialPath;
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavigateButton to="/editor/diagrams/123" />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

describe("useNavigateWithParams", () => {
  it("preserves original params (theme, hideHeader, hideSidebar, hideToolbar)", async () => {
    const params =
      "shareId=abc&theme=dark&hideHeader=force&hideSidebar=true&hideToolbar=force";
    renderWithRoute("/editor", params);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/editor");
    expect(screen.getByTestId("search")).toHaveTextContent(params);

    await act(async () => {
      screen.getByTestId("navigate").click();
    });

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/editor/diagrams/123",
    );
    expect(screen.getByTestId("search")).toHaveTextContent(params);
  });

  it("preserves new params (hideIssues, readonly, dbml)", async () => {
    const params =
      "shareId=xyz&hideIssues=force&readonly=force&dbml=true";
    renderWithRoute("/editor", params);

    expect(screen.getByTestId("search")).toHaveTextContent(params);

    await act(async () => {
      screen.getByTestId("navigate").click();
    });

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/editor/diagrams/123",
    );
    expect(screen.getByTestId("search")).toHaveTextContent(params);
  });

  it("preserves full combined param set during navigation", async () => {
    const params =
      "shareId=full&theme=light&hideHeader=true&hideSidebar=force&hideToolbar=true&hideIssues=force&readonly=force&dbml=force";
    renderWithRoute("/editor", params);

    await act(async () => {
      screen.getByTestId("navigate").click();
    });

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/editor/diagrams/123",
    );
    const search = screen.getByTestId("search").textContent;
    expect(search).toContain("shareId=full");
    expect(search).toContain("theme=light");
    expect(search).toContain("hideHeader=true");
    expect(search).toContain("hideSidebar=force");
    expect(search).toContain("hideToolbar=true");
    expect(search).toContain("hideIssues=force");
    expect(search).toContain("readonly=force");
    expect(search).toContain("dbml=force");
  });

  it("works with no params", async () => {
    renderWithRoute("/editor", "");

    await act(async () => {
      screen.getByTestId("navigate").click();
    });

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/editor/diagrams/123",
    );
  });
});

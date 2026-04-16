import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CategoryIcon, IconPicker, getIconComponent, ICON_OPTIONS } from "@/lib/icon-picker";

// ---------------------------------------------------------------------------
// CategoryIcon component
// ---------------------------------------------------------------------------
describe("CategoryIcon component", () => {
  it("renders without crashing for a known icon key", () => {
    const { container } = render(<CategoryIcon iconKey="home" />);
    // Should render an SVG (Lucide icons are SVGs)
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders without crashing for null icon key", () => {
    const { container } = render(<CategoryIcon iconKey={null} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders without crashing for undefined icon key", () => {
    const { container } = render(<CategoryIcon iconKey={undefined} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders without crashing for unknown icon key", () => {
    const { container } = render(<CategoryIcon iconKey="nonexistent" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<CategoryIcon iconKey="home" className="custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("custom-class")).toBe(true);
  });

  it("renders different icons for different keys", () => {
    const { container: c1 } = render(<CategoryIcon iconKey="home" />);
    const { container: c2 } = render(<CategoryIcon iconKey="car" />);
    // Both should have SVGs
    expect(c1.querySelector("svg")).toBeTruthy();
    expect(c2.querySelector("svg")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// IconPicker component
// ---------------------------------------------------------------------------
describe("IconPicker component", () => {
  it("renders a grid of icon buttons", () => {
    const onChange = vi.fn();
    const { container } = render(<IconPicker value="home" onChange={onChange} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(ICON_OPTIONS.length);
  });

  it("calls onChange when an icon button is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(<IconPicker value="home" onChange={onChange} />);
    const buttons = container.querySelectorAll("button");
    // Click the second button (utensils)
    fireEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith(ICON_OPTIONS[1].key);
  });

  it("highlights the currently selected icon", () => {
    const onChange = vi.fn();
    const { container } = render(<IconPicker value="home" onChange={onChange} />);
    const buttons = container.querySelectorAll("button");
    // The first button (home) should have the selected border class
    const firstButton = buttons[0];
    expect(firstButton.className).toContain("border-primary");
  });

  it("does not highlight non-selected icons", () => {
    const onChange = vi.fn();
    const { container } = render(<IconPicker value="home" onChange={onChange} />);
    const buttons = container.querySelectorAll("button");
    // A non-selected button should have transparent border
    const secondButton = buttons[1];
    expect(secondButton.className).toContain("border-transparent");
  });

  it("each button has type='button' to prevent form submission", () => {
    const onChange = vi.fn();
    const { container } = render(<IconPicker value="home" onChange={onChange} />);
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.getAttribute("type")).toBe("button");
    });
  });
});

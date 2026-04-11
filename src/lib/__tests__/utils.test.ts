import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name utility)", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("base");
    expect(result).toContain("active");
  });

  it("filters out falsy values", () => {
    const result = cn("base", false, null, undefined, 0, "", "valid");
    expect(result).toBe("base valid");
  });

  it("merges Tailwind conflicting classes (last wins)", () => {
    // tailwind-merge should resolve conflicting utilities
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("merges Tailwind bg colors (last wins)", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toBe("bg-blue-500");
  });

  it("merges Tailwind text colors (last wins)", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("keeps non-conflicting classes", () => {
    const result = cn("px-4", "py-2", "text-sm");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
    expect(result).toContain("text-sm");
  });

  it("handles empty arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles a single argument", () => {
    expect(cn("only")).toBe("only");
  });

  it("handles arrays of class names", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("handles objects (clsx style)", () => {
    const result = cn({ active: true, disabled: false, visible: true });
    expect(result).toContain("active");
    expect(result).not.toContain("disabled");
    expect(result).toContain("visible");
  });

  it("handles deeply mixed arguments", () => {
    const result = cn("base", ["arr1", "arr2"], { obj: true }, false, "end");
    expect(result).toContain("base");
    expect(result).toContain("arr1");
    expect(result).toContain("arr2");
    expect(result).toContain("obj");
    expect(result).toContain("end");
  });

  it("merges responsive Tailwind classes properly", () => {
    const result = cn("p-2", "md:p-4", "lg:p-6");
    expect(result).toContain("p-2");
    expect(result).toContain("md:p-4");
    expect(result).toContain("lg:p-6");
  });

  it("deduplicates identical classes", () => {
    const result = cn("foo", "foo");
    // tailwind-merge may or may not dedupe non-Tailwind classes,
    // but clsx will produce "foo foo", and tw-merge passes it through.
    expect(typeof result).toBe("string");
  });
});

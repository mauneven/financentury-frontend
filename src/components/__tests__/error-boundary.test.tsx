import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "@/components/error-boundary";

// Suppress console.error from React's error boundary logging during tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Helper: a component that throws on command
// ---------------------------------------------------------------------------
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Normal content</div>;
}

// ---------------------------------------------------------------------------
// ErrorBoundary — renders children normally
// ---------------------------------------------------------------------------
describe("ErrorBoundary — normal rendering", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeDefined();
  });

  it("renders multiple children", () => {
    render(
      <ErrorBoundary>
        <div>First</div>
        <div>Second</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ErrorBoundary — catches errors and shows fallback
// ---------------------------------------------------------------------------
describe("ErrorBoundary — error state", () => {
  it("renders default error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    // In non-development builds (test/prod) the error-boundary hides the raw
    // error message for safety and shows a generic description instead.
    expect(screen.getByText("An unexpected error occurred.")).toBeDefined();
  });

  it("renders the Try Again button", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Try Again")).toBeDefined();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback")).toBeDefined();
  });

  it("does not render children when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.queryByText("Normal content")).toBeNull();
  });

  it("captures the error object in component state", () => {
    const errorInstance = new Error("Custom error text");
    const state = ErrorBoundary.getDerivedStateFromError(errorInstance);
    expect(state.hasError).toBe(true);
    expect(state.error?.message).toBe("Custom error text");
  });
});

// ---------------------------------------------------------------------------
// ErrorBoundary — reset functionality
// ---------------------------------------------------------------------------
describe("ErrorBoundary — reset via Try Again", () => {
  it("resets error state when Try Again is clicked", () => {
    // We use a stateful wrapper to toggle the throwing behavior.
    let shouldThrow = true;

    function ToggleThrow() {
      if (shouldThrow) {
        throw new Error("Error!");
      }
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ToggleThrow />
      </ErrorBoundary>
    );

    // Verify error state
    expect(screen.getByText("Something went wrong")).toBeDefined();

    // Stop throwing before clicking Try Again
    shouldThrow = false;

    // Click Try Again
    fireEvent.click(screen.getByText("Try Again"));

    // After reset, the child should re-render without error
    expect(screen.getByText("Recovered")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ErrorBoundary — getDerivedStateFromError
// ---------------------------------------------------------------------------
describe("ErrorBoundary — getDerivedStateFromError", () => {
  it("sets hasError to true and captures the error object", () => {
    const error = new Error("test");
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it("captures error with custom message", () => {
    const error = new Error("specific message");
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state.error?.message).toBe("specific message");
  });
});

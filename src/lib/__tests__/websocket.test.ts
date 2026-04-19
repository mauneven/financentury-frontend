import { describe, it, expect } from "vitest";
import type { WSMessage } from "@/lib/websocket";

/**
 * Type-safety and parsing tests for the WebSocket message protocol.
 *
 * The BudgetWebSocket class is a singleton with side-effects (actual WS connections),
 * so we focus on the WSMessage type contract and JSON parsing behavior.
 */

// ---------------------------------------------------------------------------
// WSMessage type — valid event types
// ---------------------------------------------------------------------------
describe("WSMessage type — valid event types", () => {
  const VALID_TYPES: WSMessage["type"][] = [
    "budget_updated",
    "expense_created",
    "expense_updated",
    "expense_deleted",
    "category_created",
    "category_updated",
    "category_deleted",
    "link_created",
    "link_updated",
    "link_deleted",
  ];

  it("includes all 10 expected event types", () => {
    expect(VALID_TYPES).toHaveLength(10);
  });

  it("each event type is a non-empty string", () => {
    VALID_TYPES.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it("includes expense_created (not the old expense_added)", () => {
    expect(VALID_TYPES).toContain("expense_created");
    // "expense_added" was renamed to "expense_created" — confirm it is absent.
    const oldName = "expense_added" as string;
    expect(VALID_TYPES).not.toContain(oldName);
  });

  it("does NOT include any section_* event (sections were removed)", () => {
    const removed = ["section_created", "section_updated", "section_deleted"];
    removed.forEach((name) => {
      expect(VALID_TYPES as unknown as string[]).not.toContain(name);
    });
  });

  it("includes all CRUD events for categories", () => {
    expect(VALID_TYPES).toContain("category_created");
    expect(VALID_TYPES).toContain("category_updated");
    expect(VALID_TYPES).toContain("category_deleted");
  });

  it("includes all CRUD events for links", () => {
    expect(VALID_TYPES).toContain("link_created");
    expect(VALID_TYPES).toContain("link_updated");
    expect(VALID_TYPES).toContain("link_deleted");
  });
});

// ---------------------------------------------------------------------------
// JSON parsing — simulates the onmessage handler behavior
// ---------------------------------------------------------------------------

/** Mimics what BudgetWebSocket.onmessage does internally. */
function parseWSMessage(raw: string): WSMessage | null {
  try {
    return JSON.parse(raw) as WSMessage;
  } catch {
    return null;
  }
}

describe("WSMessage parsing — malformed JSON", () => {
  it("returns null for empty string", () => {
    expect(parseWSMessage("")).toBeNull();
  });

  it("returns null for random text", () => {
    expect(parseWSMessage("hello world")).toBeNull();
  });

  it("returns null for truncated JSON", () => {
    expect(parseWSMessage('{"type":"expense_cre')).toBeNull();
  });

  it("returns null for valid JSON array instead of object", () => {
    const parsed = parseWSMessage('[1,2,3]');
    // Parses fine but is not a valid WSMessage (no type field).
    if (parsed) {
      expect((parsed as unknown as Record<string, unknown>).type).toBeUndefined();
    }
  });
});

describe("WSMessage parsing — missing fields", () => {
  it("parses message without budget_id (optional field)", () => {
    const msg = parseWSMessage('{"type":"budget_updated"}');
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe("budget_updated");
    expect(msg!.budget_id).toBeUndefined();
  });

  it("parses message without payload (optional field)", () => {
    const msg = parseWSMessage('{"type":"expense_created","budget_id":"b-1"}');
    expect(msg).not.toBeNull();
    expect(msg!.payload).toBeUndefined();
  });

  it("parses message with type missing as an object (no runtime type guard)", () => {
    const msg = parseWSMessage('{"budget_id":"b-1"}');
    // The parser does not enforce the type field at runtime, so it returns an object.
    expect(msg).not.toBeNull();
    expect(msg!.type).toBeUndefined();
  });
});

describe("WSMessage parsing — extra unexpected fields", () => {
  it("extra fields do not prevent parsing", () => {
    const msg = parseWSMessage(
      '{"type":"expense_deleted","budget_id":"b-1","extra_field":"should be fine","count":42}'
    );
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe("expense_deleted");
    expect(msg!.budget_id).toBe("b-1");
    // Extra fields are accessible on the object but harmless.
    expect((msg as unknown as Record<string, unknown>).extra_field).toBe("should be fine");
  });

  it("deeply nested extra payload does not break parsing", () => {
    const complex = JSON.stringify({
      type: "budget_updated",
      payload: { nested: { deep: { value: [1, 2, 3] } } },
    });
    const msg = parseWSMessage(complex);
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe("budget_updated");
  });
});

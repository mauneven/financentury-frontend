import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the BudgetWebSocket class behavior.
 * We mock the global WebSocket constructor to avoid real connections.
 */

// Store reference to original WebSocket
const OriginalWebSocket = globalThis.WebSocket;

// Mock WebSocket class
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  sentMessages: string[] = [];
  closeCalled = false;

  constructor(public url: string) {
    // Auto-connect after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.closeCalled = true;
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }
}

// Set up mock WebSocket before importing the module
Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

describe("BudgetWebSocket", () => {
  let budgetWS: typeof import("@/lib/websocket").budgetWS;
  let instances: MockWebSocket[];

  beforeEach(async () => {
    instances = [];
    vi.useFakeTimers();

    // Replace global WebSocket with mock
    (globalThis as Record<string, unknown>).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        instances.push(this);
      }
    } as unknown as typeof WebSocket;

    // Copy static properties
    Object.assign((globalThis as Record<string, unknown>).WebSocket, {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    });

    // Fresh import of websocket module
    vi.resetModules();
    const mod = await import("@/lib/websocket");
    budgetWS = mod.budgetWS;
  });

  afterEach(() => {
    budgetWS.disconnect();
    vi.useRealTimers();
    globalThis.WebSocket = OriginalWebSocket;
  });

  it("exports a budgetWS singleton", () => {
    expect(budgetWS).toBeDefined();
    expect(typeof budgetWS.connect).toBe("function");
    expect(typeof budgetWS.disconnect).toBe("function");
  });

  it("creates a WebSocket connection on connect()", () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);
    expect(instances).toHaveLength(1);
  });

  it("sends auth message on open", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    // Trigger the onopen callback
    await vi.advanceTimersByTimeAsync(10);

    expect(instances[0].sentMessages).toHaveLength(1);
    const authMsg = JSON.parse(instances[0].sentMessages[0]);
    expect(authMsg.type).toBe("auth");
    expect(authMsg.token).toBe("test-token");
  });

  it("dispatches parsed messages to the handler", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    await vi.advanceTimersByTimeAsync(10);

    // Simulate a message
    const msg = { type: "expense_created", budget_id: "b-1" };
    instances[0].onmessage?.(new MessageEvent("message", { data: JSON.stringify(msg) }));

    expect(handler).toHaveBeenCalledWith(msg);
  });

  it("ignores malformed messages without crashing", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    await vi.advanceTimersByTimeAsync(10);

    // Simulate a malformed message
    instances[0].onmessage?.(new MessageEvent("message", { data: "not-json" }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call handler when handler is null", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    await vi.advanceTimersByTimeAsync(10);

    // Disconnect clears the handler
    budgetWS.disconnect();

    // No crash, no handler call
    expect(handler).not.toHaveBeenCalled();
  });

  it("disconnect() closes the WebSocket", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    await vi.advanceTimersByTimeAsync(10);

    budgetWS.disconnect();

    expect(instances[0].closeCalled).toBe(true);
  });

  it("does not create new connection when already connected with same token", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    budgetWS.connect("test-token", handler1);
    await vi.advanceTimersByTimeAsync(10);

    // Same token, should be a no-op (just updates handler)
    budgetWS.connect("test-token", handler2);

    expect(instances).toHaveLength(1);
  });

  it("creates new connection when token changes", async () => {
    const handler = vi.fn();

    budgetWS.connect("token-1", handler);
    await vi.advanceTimersByTimeAsync(10);

    budgetWS.connect("token-2", handler);

    // Old one closed, new one created
    expect(instances).toHaveLength(2);
    expect(instances[0].closeCalled).toBe(true);
  });

  it("schedules reconnect on unexpected close", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    await vi.advanceTimersByTimeAsync(10);

    // Simulate unexpected close
    const ws = instances[0];
    ws.readyState = MockWebSocket.CLOSED;
    ws.onclose?.(new CloseEvent("close"));

    // Advance timer for reconnect delay (1 second for first reconnect)
    await vi.advanceTimersByTimeAsync(1100);

    // A new WebSocket should have been created
    expect(instances.length).toBeGreaterThanOrEqual(2);
  });

  it("does not reconnect after intentional disconnect", async () => {
    const handler = vi.fn();
    budgetWS.connect("test-token", handler);

    await vi.advanceTimersByTimeAsync(10);

    budgetWS.disconnect();

    // Advance timer well past any reconnect delay
    await vi.advanceTimersByTimeAsync(60000);

    // Only the original connection should exist
    expect(instances).toHaveLength(1);
  });
});

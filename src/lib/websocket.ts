/**
 * WebSocket client for real-time budget updates.
 *
 * Connects to the backend WebSocket endpoint when in online mode.
 * Automatically reconnects with exponential backoff on disconnect.
 * Dispatches incoming messages to the registered callback.
 */

export interface WSMessage {
  type:
    | "budget_updated"
    | "expense_created"
    | "expense_updated"
    | "expense_deleted"
    | "section_created"
    | "section_updated"
    | "section_deleted"
    | "category_created"
    | "category_updated"
    | "category_deleted"
    | "link_created"
    | "link_updated"
    | "link_deleted";
  budget_id?: string;
  payload?: Record<string, unknown>;
}

type MessageHandler = (msg: WSMessage) => void;

const WS_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL ||
        (() => {
          // Derive WS URL from the API URL: http(s)://host:port/api -> ws(s)://host:port/ws
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
          try {
            const url = new URL(apiUrl);
            const protocol = url.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${url.host}/ws`;
          } catch {
            return "ws://localhost:8080/ws";
          }
        })())
    : "";

class BudgetWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private onMessage: MessageHandler | null = null;
  private intentionalClose = false;

  /**
   * Open a WebSocket connection using the given JWT token.
   * If already connected, this is a no-op.
   */
  connect(token: string, onMessage: MessageHandler): void {
    // Already connected with the same token -- skip.
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING) &&
      this.token === token
    ) {
      // Update handler in case it changed
      this.onMessage = onMessage;
      return;
    }

    // Close any existing connection before opening a new one.
    this.disconnectInternal();

    this.token = token;
    this.onMessage = onMessage;
    this.intentionalClose = false;
    this.openConnection();
  }

  /**
   * Gracefully close the WebSocket connection.
   * Does NOT schedule a reconnect.
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.disconnectInternal();
  }

  // ---- Private helpers ----

  private openConnection(): void {
    if (!this.token || typeof window === "undefined") return;

    try {
      this.ws = new WebSocket(WS_BASE);

      this.ws.onopen = () => {
        // Send auth token as the first message instead of query param
        // to avoid token leakage in server logs and browser history.
        this.ws?.send(JSON.stringify({ type: "auth", token: this.token }));
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (!this.onMessage) return;
        try {
          const data: WSMessage = JSON.parse(event.data as string);
          this.onMessage(data);
        } catch {
          // Ignore malformed messages.
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // The browser will fire `onclose` after `onerror`, so reconnection
        // is handled there. Nothing extra needed.
      };
    } catch {
      // WebSocket constructor can throw on invalid URLs.
      this.ws = null;
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s.
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30_000
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openConnection();
    }, delay);
  }

  private disconnectInternal(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.token = null;
    this.onMessage = null;
  }
}

/** Singleton WebSocket instance for the application. */
export const budgetWS = new BudgetWebSocket();

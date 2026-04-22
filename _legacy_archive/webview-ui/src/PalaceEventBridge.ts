/**
 * PalaceEventBridge — WebSocket Event Bridge for The Archive Room.
 *
 * Connects the frontend to an external backend that sends JSON commands.
 * Commands drive all character movement and interactions in the room.
 *
 * Backend → Frontend commands:
 *   { "command": "RAG_SEARCH",    "agentId": 1, "target": "A-012" }
 *   { "command": "FETCH_MEMORY",  "agentId": 1, "target": "A-005" }
 *   { "command": "THINK",         "agentId": 1, "target": "whiteboard_1" }
 *   { "command": "TRIM_CONTEXT",  "agentId": 1, "target": "purge_bin" }
 *   { "command": "GENERATE_CODE", "agentId": 1 }
 *   { "command": "WAIT",          "agentId": 1 }
 *   { "command": "SPAWN_AGENT",   "agentId": 2, "name": "ResearchBot" }
 *   { "command": "REMOVE_AGENT",  "agentId": 2 }
 *
 * Frontend → Backend events:
 *   { "event": "AGENT_ARRIVED",        "agentId": 1, "target": "A-012" }
 *   { "event": "ANIMATION_COMPLETE",   "agentId": 1, "action": "RAG_SEARCH" }
 *   { "event": "AGENT_IDLE",           "agentId": 1 }
 *   { "event": "ERROR",                "agentId": 1, "message": "..." }
 *   { "event": "CONNECTION_READY",     "agents": [1, 2] }
 */

import type { OfficeState } from './office/engine/officeState.js';

/** Default WebSocket URL. Override via ?ws= query param or environment. */
const DEFAULT_WS_URL = 'ws://localhost:8765';

/** Incoming command from backend */
interface BackendCommand {
  command: string;
  agentId?: number;
  target?: string;
  name?: string;
}

/** Outgoing event to backend */
interface FrontendEvent {
  event: string;
  agentId?: number;
  target?: string;
  action?: string;
  message?: string;
  agents?: number[];
}

export class PalaceEventBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;
  private readonly url: string;
  private officeState: OfficeState | null = null;
  private reconnectDelay = 2000; // ms

  constructor(url?: string) {
    // Allow override via query param for dev flexibility
    const params = new URLSearchParams(window.location.search);
    this.url = url ?? params.get('ws') ?? DEFAULT_WS_URL;
  }

  /** Connect to the backend WebSocket and bind to OfficeState. */
  connect(officeState: OfficeState): void {
    this.officeState = officeState;
    this.isDestroyed = false;
    this._connect();
  }

  private _connect(): void {
    if (this.isDestroyed) return;

    console.log(`[PalaceEventBridge] Connecting to ${this.url}...`);
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.warn('[PalaceEventBridge] Failed to create WebSocket:', err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[PalaceEventBridge] Connected ✓');
      this.reconnectDelay = 2000; // reset backoff
      // Announce ready with current agent list
      const agents = this.officeState
        ? Array.from(this.officeState.characters.keys()).filter((id) => id >= 0)
        : [];
      this._send({ event: 'CONNECTION_READY', agents });
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as BackendCommand;
        this._handleCommand(msg);
      } catch {
        console.warn('[PalaceEventBridge] Invalid JSON received:', evt.data);
      }
    };

    this.ws.onerror = (err) => {
      console.warn('[PalaceEventBridge] WebSocket error:', err);
    };

    this.ws.onclose = (evt) => {
      console.log(`[PalaceEventBridge] Disconnected (code ${evt.code})`);
      this.ws = null;
      if (!this.isDestroyed) {
        this._scheduleReconnect();
      }
    };
  }

  private _scheduleReconnect(): void {
    if (this.isDestroyed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    console.log(`[PalaceEventBridge] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, this.reconnectDelay);
    // Exponential backoff capped at 30s
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  private _handleCommand(msg: BackendCommand): void {
    const os = this.officeState;
    if (!os) return;

    console.log('[PalaceEventBridge] Command received:', msg);

    switch (msg.command) {
      case 'SPAWN_AGENT': {
        if (msg.agentId === undefined) break;
        os.addAgent(msg.agentId);
        break;
      }

      case 'REMOVE_AGENT': {
        if (msg.agentId === undefined) break;
        os.removeAgent(msg.agentId);
        break;
      }

      case 'RAG_SEARCH':
      case 'FETCH_MEMORY':
      case 'THINK':
      case 'TRIM_CONTEXT':
      case 'GENERATE_CODE':
      case 'WRITE_RESPONSE':
      case 'WAIT': {
        if (msg.agentId === undefined) break;
        const result = os.executeCommand(msg.agentId, msg.command, msg.target);
        if (result.success) {
          // If there was a target, we'll emit AGENT_ARRIVED after the walk completes.
          // For now emit immediately for stateless commands.
          if (!msg.target) {
            this._send({ event: 'AGENT_IDLE', agentId: msg.agentId });
          }
        } else {
          this._send({
            event: 'ERROR',
            agentId: msg.agentId,
            message: result.error ?? 'Unknown error',
          });
        }
        break;
      }

      default:
        console.warn('[PalaceEventBridge] Unknown command:', msg.command);
    }
  }

  /** Send an event to the backend (fire-and-forget). */
  private _send(event: FrontendEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  /** Call this when the agent arrives at the target tile to notify backend. */
  notifyArrival(agentId: number, target: string, action: string): void {
    this._send({ event: 'AGENT_ARRIVED', agentId, target });
    this._send({ event: 'ANIMATION_COMPLETE', agentId, action });
  }

  /** Tear down the connection permanently. */
  disconnect(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  /** Whether the WebSocket is currently open. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/** Singleton bridge instance — import and use throughout the app. */
export const palaceBridge = new PalaceEventBridge();

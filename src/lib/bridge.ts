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

import type { ArchiveEngine } from './engine/engine/ArchiveEngine';

/** Default WebSocket URL. Override via ?ws= query param or environment. */
const DEFAULT_WS_URL = 'ws://localhost:8765/ws';

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
  private archiveEngine: ArchiveEngine | null = null;
  private reconnectDelay = 2000; // ms
  private retryCount = 0;
  private readonly MAX_LOCAL_RETRIES = 5;

  constructor(url?: string) {
    // Allow override via query param for dev flexibility (SSR safe)
    let wsOverride: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      wsOverride = params.get('ws');
      if (params.get('bridge') === 'off') {
        this.isDestroyed = true;
        console.log('[PalaceEventBridge] Disabled via bridge=off param');
      }
    }
    this.url = url ?? wsOverride ?? DEFAULT_WS_URL;
  }

  /** Connect to the backend WebSocket and bind to ArchiveEngine. */
  connect(archiveEngine: ArchiveEngine): void {
    this.archiveEngine = archiveEngine;
    this.isDestroyed = false;
    this._connect();
  }

  private _connect(): void {
    if (this.isDestroyed) return;

    console.log(`[PalaceEventBridge] Connecting to ${this.url}...`);
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.retryCount++;
      console.warn('[PalaceEventBridge] Failed to create WebSocket:', err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[PalaceEventBridge] Connected ✓');
      this.reconnectDelay = 2000; // reset backoff
      this.retryCount = 0; // reset retries
      // Announce ready with current agent list
      const agents = this.archiveEngine
        ? Array.from(this.archiveEngine.characters.keys()).filter((id) => id >= 0)
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
      this.ws = null;
      if (!this.isDestroyed) {
        this.retryCount++;
        this._scheduleReconnect();
      }
    };
  }

  private _scheduleReconnect(): void {
    if (this.isDestroyed) return;

    // Silent failure on localhost after several attempts
    const isLocal = this.url.includes('localhost') || this.url.includes('127.0.0.1');
    if (isLocal && this.retryCount > this.MAX_LOCAL_RETRIES) {
      if (this.retryCount === this.MAX_LOCAL_RETRIES + 1) {
        console.log('[PalaceEventBridge] Local backend not found. Suspending reconnection noise.');
        console.log('[PalaceEventBridge] Tip: Start the backend or add ?bridge=off to disable this bridge.');
      }
      return;
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    console.log(`[PalaceEventBridge] Reconnecting in ${this.reconnectDelay}ms... (Attempt ${this.retryCount})`);
    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, this.reconnectDelay);
    // Exponential backoff capped at 30s
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  private _handleCommand(msg: any): void {
    const engine = this.archiveEngine;
    if (!engine) return;

    // Handle both wrapped and unwrapped commands
    const data = msg.type === 'AGENT_COMMAND' ? msg : msg;
    const command = data.command;
    const agentId = data.agentId;
    const target = data.targetUid || data.target;
    const thought = data.thought || data.metadata?.thought;

    console.log('[PalaceEventBridge] Command received:', { command, agentId, target, thought });

    switch (command) {
      case 'SPAWN_AGENT': {
        if (agentId === undefined) break;
        engine.addAgent(agentId);
        break;
      }

      case 'REMOVE_AGENT': {
        if (agentId === undefined) break;
        engine.removeAgent(agentId);
        break;
      }

      case 'RAG_SEARCH':
      case 'FETCH_MEMORY':
      case 'THINK':
      case 'TRIM_CONTEXT':
      case 'GENERATE_CODE':
      case 'WRITE_RESPONSE':
      case 'WAIT': {
        if (agentId === undefined) break;
        const result = engine.executeCommand(agentId, command, target);
        if (result.success) {
          // Apply thought bubble if provided
          if (thought) {
            const ch = engine.characters.get(agentId);
            if (ch) {
              ch.bubbleText = thought;
              // Ensure bubbleType is set correctly based on command if it wasn't already
              if (!ch.bubbleType) {
                if (command === 'THINK') ch.bubbleType = 'thinking';
                else if (command === 'RAG_SEARCH') ch.bubbleType = 'reading';
                else ch.bubbleType = 'typing';
              }
            }
          }

          // If there was a target, we'll emit AGENT_ARRIVED after the walk completes.
          if (!target) {
            this._send({ event: 'AGENT_IDLE', agentId });
          }
        } else {
          this._send({
            event: 'ERROR',
            agentId,
            message: result.error ?? 'Unknown error',
          });
        }
        break;
      }

      default:
        console.warn('[PalaceEventBridge] Unknown command:', command);
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
  }

  /** Call this when the interaction (e.g. thinking/reading) is finished. */
  notifyInteractionComplete(agentId: number, action: string): void {
    this._send({ event: 'ANIMATION_COMPLETE', agentId, action });
    this._send({ event: 'AGENT_IDLE', agentId });
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

import { Direction } from './Direction';
import { AgentState } from './AgentState';

export interface Agent {
  id: number;
  state: AgentState;
  dir: Direction;
  
  /** World position (pixel-based) */
  x: number;
  y: number;
  
  /** Spatial indexing (tile-based) */
  tileCol: number;
  tileRow: number;
  
  /** Active pathing */
  path: Array<{ col: number; row: number }>;
  moveProgress: number;

  /** Assignment & Lifecycle */
  isActive: boolean;
  seatId: string | null;
  isSeated: boolean;
  folderName?: string;

  /** Task Execution */
  activeCommand: string | null;
  targetFurnitureUid: string | null;
  interactionTimer: number;
  currentTool: string | null;

  /** Team & Subagents */
  isSubagent: boolean;
  parentAgentId: number | null;
  parentToolId?: string;
  teamName?: string;
  agentName?: string;
  isTeamLead?: boolean;
  leadAgentId?: number;
  teamUsesTmux?: boolean;

  /** Visual / Animation State */
  palette: number;
  hueShift: number;
  /** Animation State */
  frame: number;
  frameTimer: number;
  bubbleType: 'permission' | 'waiting' | 'thinking' | 'reading' | 'typing' | null;
  bubbleText?: string;
  bubbleTimer: number;
  seatTimer: number;

  /** Matrix / Spawn Effects */
  matrixEffect: 'spawn' | 'despawn' | null;
  matrixEffectTimer: number;
  matrixEffectSeeds: number[];

  /** Intelligence Tracking */
  inputTokens: number;
  outputTokens: number;

  /** Movement Intent Observers */
  targetUid: string | null;
  pendingCommand: string | null;
  pendingState: AgentState | null;
  arrivalFacing?: number;
}

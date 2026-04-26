export {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MATRIX_EFFECT_DURATION_SEC as MATRIX_EFFECT_DURATION,
  MAX_COLS,
  MAX_ROWS,
  TILE_SIZE,
} from '@/shared/constants/config';

export const TileType = {
  WALL: 0,
  FLOOR_1: 1,
  FLOOR_2: 2,
  FLOOR_3: 3,
  FLOOR_4: 4,
  FLOOR_5: 5,
  FLOOR_6: 6,
  FLOOR_7: 7,
  FLOOR_8: 8,
  FLOOR_9: 9,
  VOID: 255,
  /** Manual Wall tiles (indices 0-15) mapped to 100-115, rendered as 1x1 (Bottom Half) */
  WALL_TILE_BOTTOM_START: 100,
  WALL_TILE_BOTTOM_END: 115,
  /** Manual Wall tiles (indices 0-15) mapped to 120-135, rendered as 1x1 (Top Half) */
  WALL_TILE_TOP_START: 120,
  WALL_TILE_TOP_END: 135,
  /** Manual Wall tiles that are only half-filled (8px/8px) */
  WALL_TILE_HALF_BOTTOM: 140,
  WALL_TILE_HALF_TOP: 141,
  WALL_TILE_HALF_LEFT: 142,
  WALL_TILE_HALF_RIGHT: 143,
  /** Solid 1x1 Wall tile with no borders/shading */
  WALL_TILE_FLAT: 150,
  /** Transition tile: White top half, Gray bottom half */
  WALL_TILE_MODULAR_TRANSITION: 151,
  /** Solid Gray Base tile */
  WALL_TILE_FLAT_BASE: 152,
  /** Inverted Transition: Gray top half, White bottom half */
  WALL_TILE_MODULAR_INVERTED: 153,
  /** Panelled Modular Walls (with borders/shading) */
  WALL_TILE_PANEL_WHITE: 160,
  WALL_TILE_PANEL_TRANSITION: 161,
  WALL_TILE_PANEL_BASE: 162,
  WALL_TILE_PANEL_INVERTED: 163,
  /** Specific Border Variations */
  WALL_TILE_BORDER_BOTTOM_WHITE: 170,
  WALL_TILE_BORDER_BOTTOM_GRAY: 171,
  WALL_TILE_BORDER_SIDES_WHITE: 172,
  WALL_TILE_BORDER_SIDES_GRAY: 173,
  /** Directional Borders */
  WALL_TILE_BORDER_LEFT_WHITE: 180,
  WALL_TILE_BORDER_RIGHT_WHITE: 181,
  WALL_TILE_BORDER_LEFT_GRAY: 182,
  WALL_TILE_BORDER_RIGHT_GRAY: 183,
  /** Top + Sides (U-shape) */
  WALL_TILE_BORDER_TOP_SIDES_WHITE: 184,
  WALL_TILE_BORDER_TOP_SIDES_GRAY: 185,
  /** Seamless Whiteboard Wall (Auto-joins neighbors) */
  WALL_TILE_WHITEBOARD: 186,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

/** Re-export ColorValue for consumers that import color types from engine/types */
export type { ColorValue } from '@/shared/components/ui/types';
import type { ColorValue } from '@/shared/components/ui/types';

export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
  /** Agent is reading at a bookshelf (RAG_SEARCH / FETCH_MEMORY) */
  READING: 'reading',
  /** Agent is standing at whiteboard (THINK / chain-of-thought) */
  THINKING: 'thinking',
  /** Agent is interacting with bin (TRIM_CONTEXT / purge) */
  DISCARDING: 'discarding',
} as const;
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState];

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

/** 2D array of hex color strings: '' = transparent, '#RRGGBB' = opaque, '#RRGGBBAA' = semi-transparent. [row][col] */
export type SpriteData = string[][];

export interface Seat {
  /** Chair furniture uid */
  uid: string;
  /** Tile col where agent sits */
  seatCol: number;
  /** Tile row where agent sits */
  seatRow: number;
  /** Direction character faces when sitting (toward adjacent desk) */
  facingDir: Direction;
  assigned: boolean;
}

export interface FurnitureInstance {
  sprite: SpriteData;
  /** Pixel x (top-left) */
  x: number;
  /** Pixel y (top-left) */
  y: number;
  /** Y value used for depth sorting (typically bottom edge) */
  zY: number;
  /** Render-time horizontal flip flag (for mirrored side variants) */
  mirrored?: boolean;
  /** Whether this instance represents a wall tile (for specialized 3D effects) */
  isWall?: boolean;
}

export interface ToolActivity {
  toolId: string;
  status: string;
  done: boolean;
  permissionWait?: boolean;
}

export const EditTool = {
  TILE_PAINT: 'tile_paint',
  WALL_PAINT: 'wall_paint',
  FURNITURE_PLACE: 'furniture_place',
  FURNITURE_PICK: 'furniture_pick',
  SELECT: 'select',
  EYEDROPPER: 'eyedropper',
  ERASE: 'erase',
} as const;
export type EditTool = (typeof EditTool)[keyof typeof EditTool];

export interface FurnitureCatalogEntry {
  type: string; // asset ID from furniture manifest
  label: string;
  footprintW: number;
  footprintH: number;
  sprite: SpriteData;
  isDesk: boolean;
  category?: string;
  /** Orientation from rotation group: 'front' | 'back' | 'left' | 'right' */
  orientation?: string;
  /** Whether this item can be placed on top of desk/table surfaces */
  canPlaceOnSurfaces?: boolean;
  /** Number of tile rows from the top of the footprint that are "background" (allow placement, still block walking). Default 0. */
  backgroundTiles?: number;
  /** Whether this item can be placed on wall tiles */
  canPlaceOnWalls?: boolean;
  /** Whether this is a side-oriented asset that produces a mirrored "left" variant */
  mirrorSide?: boolean;
}

export interface PlacedFurniture {
  uid: string;
  type: string; // asset ID from furniture manifest
  col: number;
  row: number;
  /** Optional color override for furniture */
  color?: ColorValue;
}

export interface ArchiveLayout {
  version: 1;
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
  /** Per-tile color settings, parallel to tiles array. null = wall/no color */
  tileColors?: Array<ColorValue | null>;
  /** Bumped when the bundled default layout changes; forces a reset on existing installs */
  layoutRevision?: number;
  /** Whether the layout is locked for editing */
  isLocked?: boolean;
}

export interface Character {
  id: number;
  state: CharacterState;
  dir: Direction;
  /** Pixel position */
  x: number;
  y: number;
  /** Current tile column */
  tileCol: number;
  /** Current tile row */
  tileRow: number;
  /** Remaining path steps (tile coords) */
  path: Array<{ col: number; row: number }>;
  /** 0-1 lerp between current tile and next tile */
  moveProgress: number;
  /** Current tool name for typing vs reading animation, or null */
  currentTool: string | null;
  /** Palette index (0-5) */
  palette: number;
  /** Hue shift in degrees (0 = no shift, ≥45 for repeated palettes) */
  hueShift: number;
  /** Animation frame index */
  frame: number;
  /** Time accumulator for animation */
  frameTimer: number;
  /** Timer for idle wander decisions (deprecated) */
  /** Number of wander moves completed in current roaming cycle (deprecated) */
  /** Max wander moves before returning to seat for rest (deprecated) */
  /** Whether the agent is actively working */
  isActive: boolean;
  /** Assigned seat uid, or null if no seat */
  seatId: string | null;
  /** Whether the agent is currently visually sitting in a chair */
  isSeated: boolean;
  /** The command currently being executed (e.g. 'RAG_SEARCH'), or null */
  activeCommand: string | null;
  /** The furniture uid the agent is walking to / interacting with, or null */
  targetFurnitureUid: string | null;
  /** Timer counting down how long the interaction state lasts */
  interactionTimer: number;
  /** Active speech bubble type, or null if none showing */
  bubbleType: 'permission' | 'waiting' | 'thinking' | 'reading' | 'typing' | null;
  /** Text content for the speech bubble */
  bubbleText?: string;
  /** Countdown timer for bubble (waiting: 2→0, permission: unused) */
  bubbleTimer: number;
  /** Timer to stay seated while inactive after seat reassignment (counts down to 0) */
  seatTimer: number;
  /** Whether this character represents a sub-agent (spawned by Task tool) */
  isSubagent: boolean;
  /** Parent agent ID if this is a sub-agent, null otherwise */
  parentAgentId: number | null;
  /** Active matrix spawn/despawn effect, or null */
  matrixEffect: 'spawn' | 'despawn' | null;
  /** Timer counting up from 0 to MATRIX_EFFECT_DURATION */
  matrixEffectTimer: number;
  /** Per-column random seeds (16 values) for staggered rain timing */
  matrixEffectSeeds: number[];
  /** Workspace folder name (only set for multi-root workspaces) */
  folderName?: string;

  /** Observer: The specific furniture UID the agent is walking towards */
  targetUid: string | null;
  /** Observer: The specific command that triggered this movement */
  pendingCommand: string | null;
  /** Observer: The specific state transition intended after arrival */
  pendingState: CharacterState | null;

  // -- Agent Teams --
  /** Team name this agent belongs to */
  teamName?: string;
  /** Role name within the team (null for lead) */
  agentName?: string;
  /** Whether this agent is the team lead */
  isTeamLead?: boolean;
  /** ID of the lead agent (set on teammates) */
  leadAgentId?: number;
  /** True when lead spawns teammates via tmux (run_in_background Agent calls) */
  teamUsesTmux?: boolean;
  /** Cumulative input tokens consumed */
  inputTokens: number;
  /** Cumulative output tokens consumed */
  outputTokens: number;
}

// ── Legacy Asset Types (Migrated) ──────────────────────────────

export interface LegacyCatalogEntry {
  id: string;
  name: string;
  label: string;
  category: string;
  file: string;
  furniturePath: string;
  width: number;
  height: number;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  groupId?: string;
  orientation?: string;
  state?: string;
  mirrorSide?: boolean;
  rotationScheme?: string;
  animationGroup?: string;
  frame?: number;
}

export interface AssetIndex {
  floors: string[];
  walls: string[];
  characters: string[];
  defaultLayout: string | null;
}

export interface CharacterDirectionSprites {
  down: SpriteData[];
  up: SpriteData[];
  right: SpriteData[];
}





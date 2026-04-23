import {
  TYPE_FRAME_DURATION_SEC,
  WALK_FRAME_DURATION_SEC,
  WALK_SPEED_PX_PER_SEC,
} from '@/lib/engine/constants';
import { findPath } from '@/lib/engine/layout/tileMap';
import type { CharacterSprites } from '@/lib/engine/sprites/spriteData';
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from '@/lib/engine/types';
import { CharacterState, Direction, TILE_SIZE } from '@/lib/engine/types';
import { palaceBridge } from '@/lib/bridge';

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']);

/** @internal */
export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  return READING_TOOLS.has(tool);
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/** Direction from one tile to an adjacent tile */
function directionBetween(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;
  if (dc > 0) return Direction.RIGHT;
  if (dc < 0) return Direction.LEFT;
  if (dr > 0) return Direction.DOWN;
  return Direction.UP;
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  const col = seat ? seat.seatCol : 1;
  const row = seat ? seat.seatRow : 1;
  const center = tileCenter(col, row);
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    isActive: true,
    seatId,
    isSeated: !!seat,
    activeCommand: null,
    targetFurnitureUid: null,
    interactionTimer: 0,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    inputTokens: 0,
    outputTokens: 0,
  };
}

export function updateCharacter(
  ch: Character,
  dt: number,
  _walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
): void {
  ch.frameTimer += dt;

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 2;
      }
      // If no longer active, stand up
      if (!ch.isActive) {
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt;
          break;
        }
        ch.seatTimer = 0; // clear sentinel
        ch.state = CharacterState.IDLE;
        ch.frame = 0;
        ch.frameTimer = 0;
      }
      break;
    }

    case CharacterState.IDLE: {
      // No idle animation — static pose
      ch.frame = 0;
      if (ch.seatTimer < 0) ch.seatTimer = 0; // clear turn-end sentinel
      // If became active, pathfind to seat
      if (ch.isActive) {
        if (!ch.seatId) {
          // No seat assigned — type in place
          ch.state = CharacterState.TYPE;
          ch.frame = 0;
          ch.frameTimer = 0;
          break;
        }
        const seat = seats.get(ch.seatId);
        if (seat) {
          const path = findPath(
            ch.tileCol,
            ch.tileRow,
            seat.seatCol,
            seat.seatRow,
            tileMap,
            blockedTiles,
          );
          if (path.length > 0) {
            ch.path = path;
            ch.moveProgress = 0;
            ch.state = CharacterState.WALK;
            ch.frame = 0;
            ch.frameTimer = 0;
          } else {
            // Already at seat or no path — sit down
            ch.state = CharacterState.TYPE;
            ch.dir = seat.facingDir;
            ch.frame = 0;
            ch.frameTimer = 0;
          }
        }
        break;
      }
      // Just stand in place when idle.
      // Agents only move when explicitly commanded by the EventBridge.
      break;
    }

    case CharacterState.READING:
    case CharacterState.THINKING:
    case CharacterState.DISCARDING: {
      // Animate during interaction (use reading frame for all)
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 2;
      }
      // Count down interaction
      ch.interactionTimer -= dt;
      if (ch.interactionTimer <= 0) {
        // Interaction complete — clear command and return to seat
        const finishedAction = ch.activeCommand || 'unknown';
        ch.activeCommand = null;
        ch.targetFurnitureUid = null;
        ch.interactionTimer = 0;
        
        palaceBridge.notifyInteractionComplete(ch.id, finishedAction);
        // If agent has a seat, walk back to it
        if (ch.seatId) {
          const seat = seats.get(ch.seatId);
          if (seat) {
            const path = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CharacterState.WALK;
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
        }
        ch.state = CharacterState.IDLE;
        ch.frame = 0;
        ch.frameTimer = 0;
      }
      break;
    }

    case CharacterState.WALK: {
      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 4;
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow);
        ch.x = center.x;
        ch.y = center.y;

        // --- Command-Driven Arrival ---
        // If we were walking to a furniture target for a command, enter interaction state
        if (ch.activeCommand && ch.interactionTimer > 0) {
          const commandStateMap: Record<string, CharacterState> = {
            RAG_SEARCH:    CharacterState.READING,
            FETCH_MEMORY:  CharacterState.READING,
            THINK:         CharacterState.THINKING,
            TRIM_CONTEXT:  CharacterState.DISCARDING,
          };
          const arrivalState = commandStateMap[ch.activeCommand];
          if (arrivalState) {
            ch.state = arrivalState;
            // Apply the facing direction stored at command dispatch time
            const hint = (ch as Character & { _arrivalFacing?: number })._arrivalFacing;
            if (hint !== undefined) {
              ch.dir = hint as typeof ch.dir;
            }
            ch.frame = 0;
            ch.frameTimer = 0;
            
            // Notify bridge that we've arrived for the command
            palaceBridge.notifyArrival(ch.id, ch.targetFurnitureUid || 'unknown', ch.activeCommand);
            
            return;
          }
        }

        // --- Standard Arrival (seat / idle logic) ---
        if (ch.isActive) {
          if (!ch.seatId) {
            ch.state = CharacterState.TYPE;
          } else {
            const seat = seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
            } else {
              ch.state = CharacterState.IDLE;
            }
          }
        } else {
          if (ch.seatId) {
            const seat = seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
              ch.seatTimer = 0;
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
          ch.state = CharacterState.IDLE;
        }
        ch.frame = 0;
        ch.frameTimer = 0;
        return; // <--- ADDED: Path complete, do not fall through to movement logic
      }

      // Move toward next tile in path
      const nextTile = ch.path[0];
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row);

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow);
      const toCenter = tileCenter(nextTile.col, nextTile.row);
      const t = Math.min(ch.moveProgress, 1);
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col;
        ch.tileRow = nextTile.row;
        ch.x = toCenter.x;
        ch.y = toCenter.y;
        ch.path.shift();
        ch.moveProgress = 0;
      }

      // If became active while wandering, repath to seat (only if NO active command)
      if (ch.isActive && ch.seatId && !ch.activeCommand) {
        const seat = seats.get(ch.seatId);
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1];
          if (!lastStep || lastStep.col !== seat.seatCol || lastStep.row !== seat.seatRow) {
            const newPath = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (newPath.length > 0) {
              ch.path = newPath;
              ch.moveProgress = 0;
            }
          }
        }
      }
      break;
    }
  }
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2];
      }
      return sprites.typing[ch.dir][ch.frame % 2];
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4];
    case CharacterState.READING:
      // Reading at bookshelf — use reading animation frames
      return sprites.reading[ch.dir][ch.frame % 2];
    case CharacterState.THINKING:
      // Thinking at whiteboard — hold still, walk frame 1 (standing)
      return sprites.walk[ch.dir][1];
    case CharacterState.DISCARDING:
      // Discarding at bin — use typing animation (reaching forward)
      return sprites.typing[ch.dir][ch.frame % 2];
    case CharacterState.IDLE:
    default:
      return sprites.walk[ch.dir][1];
  }
}


import {
  AUTO_ON_FACING_DEPTH,
  AUTO_ON_SIDE_DEPTH,
  CHARACTER_HIT_HALF_WIDTH,
  CHARACTER_HIT_HEIGHT,
  CHARACTER_SITTING_OFFSET_PX,
  DISCARD_INTERACTION_DURATION_SEC,
  DISMISS_BUBBLE_FAST_FADE_SEC,
  FURNITURE_ANIM_INTERVAL_SEC,
  HUE_SHIFT_MIN_DEG,
  HUE_SHIFT_RANGE_DEG,
  READ_INTERACTION_DURATION_SEC,
  THINK_INTERACTION_DURATION_SEC,
  WAITING_BUBBLE_DURATION_SEC,
} from '@/shared/constants/config';
import { getAnimationFrames, getCatalogEntry, getOnStateType } from '@/features/spatial/logic/furnitureCatalog';
import {
  createDefaultArchive,
  getBlockedTiles,
  archiveToFurnitureInstances,
  archiveToSeats,
  archiveToTileMap,
} from '@/features/spatial/logic/nexusSerializer';
import { findPath, getWalkableTiles, isWalkable } from '@/features/spatial/logic/tileMap';
import { getLoadedCharacterCount } from '@/shared/lib/engine/sprites/characterSpriteManifest';
import type {
  Character,
  FurnitureInstance,
  ArchiveLayout,
  PlacedFurniture,
  Seat,
  TileType as TileTypeVal,
} from '@/shared/types/types';
import { CharacterState, Direction, MATRIX_EFFECT_DURATION, TILE_SIZE } from '@/shared/types/types';
import { palaceBridge } from '@/shared/lib/bridge';
import { createCharacter, updateCharacter } from '@/features/agents/logic/characters';
import { matrixEffectSeeds } from '@/features/agents/logic/matrixEffect';

export class ArchiveEngine {
  layout: ArchiveLayout;
  tileMap: TileTypeVal[][];
  seats: Map<string, Seat>;
  blockedTiles: Set<string>;
  furniture: FurnitureInstance[];
  walkableTiles: Array<{ col: number; row: number }>;
  characters: Map<number, Character> = new Map();
  /** Accumulated time for furniture animation frame cycling */
  furnitureAnimTimer = 0;
  selectedAgentId: number | null = null;
  cameraFollowId: number | null = null;
  hoveredAgentId: number | null = null;
  hoveredTile: { col: number; row: number } | null = null;
  /** Maps "parentId:toolId" → sub-agent character ID (negative) */
  subagentIdMap: Map<string, number> = new Map();
  /** Reverse lookup: sub-agent character ID → parent info */
  subagentMeta: Map<number, { parentAgentId: number; parentToolId: string }> = new Map();
  private nextSubagentId = -1;

  constructor(layout?: ArchiveLayout) {
    this.layout = layout || createDefaultArchive();
    this.tileMap = archiveToTileMap(this.layout);
    this.seats = archiveToSeats(this.layout.furniture);
    this.blockedTiles = getBlockedTiles(this.layout.furniture);
    this.furniture = archiveToFurnitureInstances(this.layout.furniture);
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);
  }

  /** Rebuild all derived state from a new layout. Reassigns existing characters.
   *  @param shift Optional pixel shift to apply when grid expands left/up */
  rebuildFromLayout(layout: ArchiveLayout, shift?: { col: number; row: number }): void {
    this.layout = layout;
    this.tileMap = archiveToTileMap(layout);
    this.seats = archiveToSeats(layout.furniture);
    this.blockedTiles = getBlockedTiles(layout.furniture);
    this.rebuildFurnitureInstances();
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);

    // Shift character positions when grid expands left/up and reset hues to normal
    for (const ch of this.characters.values()) {
      ch.hueShift = 0;
      if (shift && (shift.col !== 0 || shift.row !== 0)) {
        ch.tileCol += shift.col;
        ch.tileRow += shift.row;
        ch.x += shift.col * TILE_SIZE;
        ch.y += shift.row * TILE_SIZE;
        // Clear path since tile coords changed
        ch.path = [];
        ch.moveProgress = 0;
      }
    }

    // Reassign characters to new seats, preserving existing assignments when possible
    for (const seat of this.seats.values()) {
      seat.assigned = false;
    }

    // First pass: try to keep characters at their existing seats
    for (const ch of this.characters.values()) {
      if (ch.seatId) {
        const seat = this.seats.get(ch.seatId);
        if (seat && !seat.assigned) {
          seat.assigned = true;
          // Snap character to seat position
          ch.tileCol = seat.seatCol;
          ch.tileRow = seat.seatRow;
          const cx = seat.seatCol * TILE_SIZE + TILE_SIZE / 2;
          const cy = seat.seatRow * TILE_SIZE + TILE_SIZE / 2;
          ch.x = cx;
          ch.y = cy;
          ch.dir = seat.facingDir;
          continue;
        }
      }
      ch.seatId = null; // will be reassigned below
    }

    // Second pass: assign remaining characters to free seats
    for (const ch of this.characters.values()) {
      if (ch.seatId) continue;
      const seatId = this.findFreeSeat();
      if (seatId) {
        this.seats.get(seatId)!.assigned = true;
        ch.seatId = seatId;
        const seat = this.seats.get(seatId)!;
        ch.tileCol = seat.seatCol;
        ch.tileRow = seat.seatRow;
        ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2;
        ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2;
        ch.dir = seat.facingDir;
      }
    }

    // Relocate any characters that ended up outside bounds or on non-walkable tiles
    for (const ch of this.characters.values()) {
      if (ch.seatId) continue; // seated characters are fine
      if (
        ch.tileCol < 0 ||
        ch.tileCol >= layout.cols ||
        ch.tileRow < 0 ||
        ch.tileRow >= layout.rows
      ) {
        this.relocateCharacterToWalkable(ch);
      }
    }
  }

  /** Move a character to a random walkable tile (Fallback only) */
  private relocateCharacterToWalkable(ch: Character): void {
    if (this.walkableTiles.length === 0) return;
    const spawn = this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)];
    ch.tileCol = spawn.col;
    ch.tileRow = spawn.row;
    ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
    ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
    ch.path = [];
    ch.moveProgress = 0;
  }

  getLayout(): ArchiveLayout {
    return this.layout;
  }

  setSelectedAgentId(id: number | null): void {
    this.selectedAgentId = id;
  }

  setCameraFollowId(id: number | null): void {
    this.cameraFollowId = id;
  }

  setHoveredAgentId(id: number | null): void {
    this.hoveredAgentId = id;
  }

  setHoveredTile(tile: { col: number; row: number } | null): void {
    this.hoveredTile = tile;
  }


  private findFreeSeat(): string | null {
    // Build set of tiles occupied by electronics (PCs, monitors, etc.)
    const electronicsTiles = new Set<string>();
    for (const item of this.layout.furniture) {
      const entry = getCatalogEntry(item.type);
      if (!entry || entry.category !== 'electronics') continue;
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          electronicsTiles.add(`${item.col + dc},${item.row + dr}`);
        }
      }
    }

    // Collect free seats, split into those facing electronics and the rest
    const pcSeats: string[] = [];
    const otherSeats: string[] = [];
    for (const [uid, seat] of this.seats) {
      if (seat.assigned) continue;

      // Check if this seat faces electronics (same logic as auto-state detection)
      let facesPC = false;
      const dCol =
        seat.facingDir === Direction.RIGHT ? 1 : seat.facingDir === Direction.LEFT ? -1 : 0;
      const dRow = seat.facingDir === Direction.DOWN ? 1 : seat.facingDir === Direction.UP ? -1 : 0;
      for (let d = 1; d <= AUTO_ON_FACING_DEPTH && !facesPC; d++) {
        const tileCol = seat.seatCol + dCol * d;
        const tileRow = seat.seatRow + dRow * d;
        if (electronicsTiles.has(`${tileCol},${tileRow}`)) {
          facesPC = true;
          break;
        }
        if (dCol !== 0) {
          if (
            electronicsTiles.has(`${tileCol},${tileRow - 1}`) ||
            electronicsTiles.has(`${tileCol},${tileRow + 1}`)
          ) {
            facesPC = true;
            break;
          }
        } else {
          if (
            electronicsTiles.has(`${tileCol - 1},${tileRow}`) ||
            electronicsTiles.has(`${tileCol + 1},${tileRow}`)
          ) {
            facesPC = true;
            break;
          }
        }
      }
      (facesPC ? pcSeats : otherSeats).push(uid);
    }

    // Pick randomly: prefer PC seats, then any seat
    if (pcSeats.length > 0) return pcSeats[Math.floor(Math.random() * pcSeats.length)];
    if (otherSeats.length > 0) return otherSeats[Math.floor(Math.random() * otherSeats.length)];
    return null;
  }

  /**
   * Pick a diverse palette for a new agent based on currently active agents.
   * First 6 agents each get a unique skin (random order). Beyond 6, skins
   * repeat in balanced rounds with a random hue shift (≥45°).
   */
  private pickDiversePalette(): { palette: number; hueShift: number } {
    // Count how many non-sub-agents use each base palette (0-5)
    const paletteCount = getLoadedCharacterCount();
    const counts = new Array(paletteCount).fill(0) as number[];
    for (const ch of this.characters.values()) {
      if (ch.isSubagent) continue;
      if (ch.palette < paletteCount) counts[ch.palette]++;
    }
    const minCount = Math.min(...counts);
    // Available = palettes at the minimum count (least used)
    const available: number[] = [];
    for (let i = 0; i < paletteCount; i++) {
      if (counts[i] === minCount) available.push(i);
    }
    const palette = available[Math.floor(Math.random() * available.length)];
    // Disable random hue shifts to ensure agents have "normal" skin tones.
    // Variety is provided by the 6 base palettes.
    const hueShift = 0;
    return { palette, hueShift };
  }

  addAgent(
    id: number,
    preferredPalette?: number,
    preferredHueShift?: number,
    preferredSeatId?: string,
    skipSpawnEffect?: boolean,
    folderName?: string,
  ): void {
    if (this.characters.has(id)) return;

    let palette: number;
    let hueShift: number;
    if (preferredPalette !== undefined) {
      palette = preferredPalette;
      // Force "normal" colors even for reloaded/restored agents
      hueShift = 0;
    } else {
      const pick = this.pickDiversePalette();
      palette = pick.palette;
      hueShift = pick.hueShift;
    }

    // Try preferred seat first, then any free seat
    let seatId: string | null = null;
    if (preferredSeatId && this.seats.has(preferredSeatId)) {
      const seat = this.seats.get(preferredSeatId)!;
      if (!seat.assigned) {
        seatId = preferredSeatId;
      }
    }
    if (!seatId) {
      seatId = this.findFreeSeat();
    }

    let ch: Character;
    if (seatId) {
      const seat = this.seats.get(seatId)!;
      seat.assigned = true;
      ch = createCharacter(id, palette, seatId, seat, hueShift);
    } else {
      // No seats — spawn at random walkable tile
      const spawn =
        this.walkableTiles.length > 0
          ? this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)]
          : { col: 1, row: 1 };
      ch = createCharacter(id, palette, null, null, hueShift);
      ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
      ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
      ch.tileCol = spawn.col;
      ch.tileRow = spawn.row;
    }

    if (folderName) {
      ch.folderName = folderName;
    }
    if (!skipSpawnEffect) {
      ch.matrixEffect = 'spawn';
      ch.matrixEffectTimer = 0;
      ch.matrixEffectSeeds = matrixEffectSeeds();
    }
    this.characters.set(id, ch);
  }

  removeAgent(id: number): void {
    const ch = this.characters.get(id);
    if (!ch) return;
    if (ch.matrixEffect === 'despawn') return; // already despawning
    // Free seat and clear selection immediately
    if (ch.seatId) {
      const seat = this.seats.get(ch.seatId);
      if (seat) seat.assigned = false;
    }
    if (this.selectedAgentId === id) this.selectedAgentId = null;
    if (this.cameraFollowId === id) this.cameraFollowId = null;
    // Start despawn animation instead of immediate delete
    ch.matrixEffect = 'despawn';
    ch.matrixEffectTimer = 0;
    ch.matrixEffectSeeds = matrixEffectSeeds();
    ch.bubbleType = null;
  }

  /** Find seat uid at a given tile position, or null */
  getSeatAtTile(col: number, row: number): string | null {
    for (const [uid, seat] of this.seats) {
      if (seat.seatCol === col && seat.seatRow === row) return uid;
    }
    return null;
  }

  /** Reassign an agent from their current seat to a new seat */
  reassignSeat(agentId: number, seatId: string): void {
    const ch = this.characters.get(agentId);
    if (!ch) return;
    // Unassign old seat
    if (ch.seatId) {
      const old = this.seats.get(ch.seatId);
      if (old) old.assigned = false;
    }
    // Assign new seat
    const seat = this.seats.get(seatId);
    if (!seat || seat.assigned) return;
    seat.assigned = true;
    ch.seatId = seatId;
    // Pathfind to new seat (unblock own seat tile for this query)
    const path = this.withOwnSeatUnblocked(ch, () =>
      findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles),
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
      ch.seatTimer = 0;
    }
  }

  /** Send an agent back to their currently assigned seat */
  sendToSeat(agentId: number): void {
    const ch = this.characters.get(agentId);
    if (!ch || !ch.seatId) return;
    const seat = this.seats.get(ch.seatId);
    if (!seat) return;
    const path = this.withOwnSeatUnblocked(ch, () =>
      findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles),
    );
    if (path.length > 0) {
      ch.path = path;
      ch.moveProgress = 0;
      ch.state = CharacterState.WALK;
      ch.frame = 0;
      ch.frameTimer = 0;
    } else {
      // Already at seat — sit down
      ch.state = CharacterState.TYPE;
      ch.dir = seat.facingDir;
      ch.frame = 0;
      ch.frameTimer = 0;
      ch.seatTimer = 0;
    }
  }

  /** Walk an agent to an arbitrary walkable tile (right-click command) */
  walkToTile(agentId: number, col: number, row: number): boolean {
    const ch = this.characters.get(agentId);
    if (!ch || ch.isSubagent) return false;
    if (!isWalkable(col, row, this.tileMap, this.blockedTiles)) {
      // Also allow walking to own seat tile (blocked for others but not self)
      const key = this.ownSeatKey(ch);
      if (!key || key !== `${col},${row}`) return false;
    }
    const path = this.withOwnSeatUnblocked(ch, () =>
      findPath(ch.tileCol, ch.tileRow, col, row, this.tileMap, this.blockedTiles),
    );
    if (path.length === 0) return false;
    ch.path = path;
    ch.moveProgress = 0;
    ch.state = CharacterState.WALK;
    ch.frame = 0;
    ch.frameTimer = 0;
    return true;
  }

  /** Trigger an action for the specified agent at the specified furniture */
  handleFurnitureClick(agentId: number, uid: string): boolean {
    const ch = this.characters.get(agentId);
    if (!ch) return false;

    const item = this.layout.furniture.find((f) => f.uid === uid);
    if (!item) return false;

    // Define default actions for furniture types
    const typeToCommand: Record<string, string> = {
      BOOKSHELF: 'RAG_SEARCH',
      WHITEBOARD: 'THINK',
      BIN: 'TRIM_CONTEXT',
      DESK_FRONT: 'TYPE',
      SMALL_TABLE: 'TYPE',
      SMALL_TABLE_SIDE: 'TYPE',
      TABLE_FRONT: 'TYPE',
    };

    // Strip modifiers (like :left) for mapping
    const baseType = item.type.split(':')[0];
    const command = typeToCommand[baseType];

    if (command) {
      this.executeCommand(agentId, command, uid);
      return true;
    }

    return false;
  }

  /** Resolve which furniture is at a specific tile, if any */
  getFurnitureAt(col: number, row: number): PlacedFurniture | null {
    for (const f of this.layout.furniture) {
      const entry = getCatalogEntry(f.type);
      if (!entry) continue;
      if (
        col >= f.col &&
        col < f.col + entry.footprintW &&
        row >= f.row &&
        row < f.row + entry.footprintH
      ) {
        return f;
      }
    }
    return null;
  }

  /**
   * Find the best walkable tile adjacent to a furniture item.
   * Searches in priority order: below, right, left, above.
   * Returns null if no adjacent walkable tile is found.
   */
  resolveFurnitureTarget(
    furnitureUid: string,
  ): { col: number; row: number; facingDir: number } | null {
    const item = this.layout.furniture.find((f) => f.uid === furnitureUid);
    if (!item) return null;

    // --- ANCHOR REDIRECTION ---
    // If this is a stacked item (like BOOKSHELF or WHITEBOARD), find the bottom-most one in the stack
    // so the agent always stands at the same spot regardless of which tile was clicked.
    let anchor = item;
    const baseType = item.type.split(':')[0];
    if (baseType === 'BOOKSHELF' || baseType === 'WHITEBOARD') {
      const neighbors = this.layout.furniture.filter((f) => f.type.startsWith(baseType) && f.col === item.col);
      anchor = neighbors.reduce((prev, curr) => (curr.row > prev.row ? curr : prev), item);
    }

    const entry = getCatalogEntry(anchor.type);
    if (!entry) return null;

    // Try tiles adjacent to the furniture footprint
    const candidates: Array<{ col: number; row: number; facingDir: number }> = [];
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const fc = anchor.col + dc;
        const fr = anchor.row + dr;
        
        // Priority for BIN: 1. Right (facing LEFT), 2. Below (facing UP)
        // This prevents the character from obscuring the small bin sprite.
        if (baseType === 'BIN') {
          candidates.push({ col: fc + 1, row: fr, facingDir: 1 }); // LEFT
          candidates.push({ col: fc, row: fr + 1, facingDir: 3 }); // UP
        } else {
          // Priority for others: 1. Below (facing UP), 2. Right, 3. Left, 4. Above
          candidates.push({ col: fc, row: fr + 1, facingDir: 3 }); // UP
          candidates.push({ col: fc + 1, row: fr, facingDir: 1 }); // LEFT
          candidates.push({ col: fc - 1, row: fr, facingDir: 2 }); // RIGHT
          candidates.push({ col: fc, row: fr - 1, facingDir: 0 }); // DOWN
        }
      }
    }

    // Shuffle candidates to encourage using different tiles of the furniture width
    candidates.sort(() => Math.random() - 0.5);

    // Return the first walkable candidate
    for (const c of candidates) {
      if (isWalkable(c.col, c.row, this.tileMap, this.blockedTiles)) {
        return c;
      }
    }
    return null;
  }

  /**
   * Execute a backend command for an agent.
   * Commands: RAG_SEARCH, FETCH_MEMORY, THINK, TRIM_CONTEXT, GENERATE_CODE, WAIT
   * target: furniture uid (e.g. 'A-012', 'purge_bin', 'whiteboard_1')
   */
  executeCommand(
    agentId: number,
    command: string,
    target?: string,
  ): { success: boolean; error?: string } {
    const ch = this.characters.get(agentId);
    if (!ch) return { success: false, error: `Agent ${agentId} not found` };

    // Map command to FSM interaction state and duration
    type InteractionState = 'reading' | 'thinking' | 'discarding' | 'type';
    const commandMap: Record<string, { state: InteractionState; duration: number }> = {
      RAG_SEARCH:    { state: CharacterState.READING as InteractionState,    duration: READ_INTERACTION_DURATION_SEC },
      FETCH_MEMORY:  { state: CharacterState.READING as InteractionState,    duration: READ_INTERACTION_DURATION_SEC },
      THINK:         { state: CharacterState.THINKING as InteractionState,   duration: THINK_INTERACTION_DURATION_SEC },
      TRIM_CONTEXT:  { state: CharacterState.DISCARDING as InteractionState, duration: DISCARD_INTERACTION_DURATION_SEC },
      GENERATE_CODE: { state: CharacterState.TYPE as InteractionState,      duration: 0 }, // stays until next command
      WRITE_RESPONSE:{ state: CharacterState.TYPE as InteractionState,      duration: 0 },
      WAIT:          { state: CharacterState.IDLE as InteractionState,      duration: 0 },
    };

    const mapping = commandMap[command];
    if (!mapping) return { success: false, error: `Unknown command: ${command}` };

    // Set visual bubble indicator
    if (command === 'THINK') ch.bubbleType = 'thinking';
    else if (command === 'RAG_SEARCH' || command === 'FETCH_MEMORY') ch.bubbleType = 'reading';
    else if (command === 'GENERATE_CODE') ch.bubbleType = 'typing';
    else ch.bubbleType = null;
    ch.bubbleTimer = 0;

    // Resolve target furniture tile
    const targetTile = target ? this.resolveFurnitureTarget(target) : null;

    if (targetTile) {
      // Pathfind to the target tile
      const path = this.withOwnSeatUnblocked(ch, () =>
        findPath(
          ch.tileCol,
          ch.tileRow,
          targetTile.col,
          targetTile.row,
          this.tileMap,
          this.blockedTiles,
        ),
      );

      if (path.length > 0) {
        // Walk to target, then the WALK handler will need to know what to do on arrival.
        // We store the pending state on the character for the arrival handler.
        // NOTE: We DO NOT clear ch.seatId here because we want the agent to return
        // to their assigned desk after the command is complete.
        ch.isSeated = false;

        ch.path = path;
        ch.moveProgress = 0;
        ch.state = CharacterState.WALK;
        ch.frame = 0;
        ch.frameTimer = 0;
        ch.activeCommand = command;
        ch.targetFurnitureUid = target ?? null;
        ch.interactionTimer = mapping.duration;
        // Store facing direction as a hint for when agent arrives
        (ch as Character & { _arrivalFacing?: number })._arrivalFacing = targetTile.facingDir;
        return { success: true };
      } else if (ch.tileCol === targetTile.col && ch.tileRow === targetTile.row) {
        // Already there — start interaction immediately
        ch.state = mapping.state as CharacterState;
        ch.isSeated = false;
        ch.activeCommand = command;
        ch.targetFurnitureUid = target ?? null;
        ch.interactionTimer = mapping.duration;
        ch.frame = 0;
        ch.frameTimer = 0;
        ch.dir = targetTile.facingDir as typeof ch.dir;
        
        // Notify bridge that we've arrived immediately (no walk needed)
        palaceBridge.notifyArrival(ch.id, ch.targetFurnitureUid || 'unknown', ch.activeCommand);
        
        return { success: true };
      } else {
        return { success: false, error: `No path to ${target} for agent ${agentId}` };
      }
    } else {
      // No target furniture — apply state change in place (e.g. WAIT, GENERATE_CODE at seat)
      ch.state = mapping.state as CharacterState;
      ch.activeCommand = command;
      ch.targetFurnitureUid = null;
      ch.interactionTimer = mapping.duration;
      ch.frame = 0;
      ch.frameTimer = 0;
      return { success: true };
    }
  }

  /** Create a sub-agent character with the parent's palette. Returns the sub-agent ID. */
  addSubagent(parentAgentId: number, parentToolId: string): number {
    const key = `${parentAgentId}:${parentToolId}`;
    if (this.subagentIdMap.has(key)) return this.subagentIdMap.get(key)!;

    const id = this.nextSubagentId--;
    const parentCh = this.characters.get(parentAgentId);
    const palette = parentCh ? parentCh.palette : 0;
    const hueShift = parentCh ? parentCh.hueShift : 0;

    // Find the closest walkable tile to the parent, avoiding tiles occupied by other characters
    const parentCol = parentCh ? parentCh.tileCol : 0;
    const parentRow = parentCh ? parentCh.tileRow : 0;
    const dist = (c: number, r: number) => Math.abs(c - parentCol) + Math.abs(r - parentRow);

    // Build set of tiles occupied by existing characters
    const occupiedTiles = new Set<string>();
    for (const [, other] of this.characters) {
      occupiedTiles.add(`${other.tileCol},${other.tileRow}`);
    }

    let spawn = { col: parentCol, row: parentRow };
    if (this.walkableTiles.length > 0) {
      let closest = this.walkableTiles[0];
      let closestDist = Infinity;
      for (const tile of this.walkableTiles) {
        if (occupiedTiles.has(`${tile.col},${tile.row}`)) continue;
        const d = dist(tile.col, tile.row);
        if (d < closestDist) {
          closest = tile;
          closestDist = d;
        }
      }
      spawn = closest;
    }

    const ch = createCharacter(id, palette, null, null, hueShift);
    ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
    ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
    ch.tileCol = spawn.col;
    ch.tileRow = spawn.row;
    // Face the same direction as the parent agent
    if (parentCh) ch.dir = parentCh.dir;
    ch.isSubagent = true;
    ch.parentAgentId = parentAgentId;
    ch.matrixEffect = 'spawn';
    ch.matrixEffectTimer = 0;
    ch.matrixEffectSeeds = matrixEffectSeeds();
    this.characters.set(id, ch);

    this.subagentIdMap.set(key, id);
    this.subagentMeta.set(id, { parentAgentId, parentToolId });
    return id;
  }

  /** Remove a specific sub-agent character and free its seat */
  removeSubagent(parentAgentId: number, parentToolId: string): void {
    const key = `${parentAgentId}:${parentToolId}`;
    const id = this.subagentIdMap.get(key);
    if (id === undefined) return;

    const ch = this.characters.get(id);
    if (ch) {
      if (ch.matrixEffect === 'despawn') {
        // Already despawning — just clean up maps
        this.subagentIdMap.delete(key);
        this.subagentMeta.delete(id);
        return;
      }
      if (ch.seatId) {
        const seat = this.seats.get(ch.seatId);
        if (seat) seat.assigned = false;
      }
      // Start despawn animation — keep character in map for rendering
      ch.matrixEffect = 'despawn';
      ch.matrixEffectTimer = 0;
      ch.matrixEffectSeeds = matrixEffectSeeds();
      ch.bubbleType = null;
    }
    // Clean up tracking maps immediately so keys don't collide
    this.subagentIdMap.delete(key);
    this.subagentMeta.delete(id);
    if (this.selectedAgentId === id) this.selectedAgentId = null;
    if (this.cameraFollowId === id) this.cameraFollowId = null;
  }

  /** Remove all sub-agents belonging to a parent agent */
  removeAllSubagents(parentAgentId: number): void {
    const toRemove: string[] = [];
    for (const [key, id] of this.subagentIdMap) {
      const meta = this.subagentMeta.get(id);
      if (meta && meta.parentAgentId === parentAgentId) {
        const ch = this.characters.get(id);
        if (ch) {
          if (ch.matrixEffect === 'despawn') {
            // Already despawning — just clean up maps
            this.subagentMeta.delete(id);
            toRemove.push(key);
            continue;
          }
          if (ch.seatId) {
            const seat = this.seats.get(ch.seatId);
            if (seat) seat.assigned = false;
          }
          // Start despawn animation
          ch.matrixEffect = 'despawn';
          ch.matrixEffectTimer = 0;
          ch.matrixEffectSeeds = matrixEffectSeeds();
          ch.bubbleType = null;
        }
        this.subagentMeta.delete(id);
        if (this.selectedAgentId === id) this.selectedAgentId = null;
        if (this.cameraFollowId === id) this.cameraFollowId = null;
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      this.subagentIdMap.delete(key);
    }
  }

  /** Look up the sub-agent character ID for a given parent+toolId, or null */
  getSubagentId(parentAgentId: number, parentToolId: string): number | null {
    return this.subagentIdMap.get(`${parentAgentId}:${parentToolId}`) ?? null;
  }

  setAgentActive(id: number, active: boolean): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.isActive = active;
      if (!active) {
        // Sentinel -1: signals turn just ended, skip next seat rest timer.
        // Prevents the WALK handler from setting a 2-4 min rest on arrival.
        ch.seatTimer = -1;
        ch.path = [];
        ch.moveProgress = 0;
      }
      this.rebuildFurnitureInstances();
    }
  }

  /** Rebuild furniture instances with auto-state applied (active agents turn electronics ON) */
  private rebuildFurnitureInstances(): void {
    // Collect tiles where active agents face desks
    const autoOnTiles = new Set<string>();
    for (const ch of this.characters.values()) {
      if (!ch.seatId) continue;
      // Trigger auto-on if agent is explicitly active OR in an interaction state
      const isInteracting = ([
        CharacterState.TYPE,
        CharacterState.READING,
        CharacterState.THINKING,
        CharacterState.DISCARDING
      ] as CharacterState[]).includes(ch.state);
      
      if (!ch.isActive && !isInteracting) continue;
      const seat = this.seats.get(ch.seatId);
      if (!seat) continue;
      // Find the desk tile(s) the agent faces from their seat
      const dCol =
        seat.facingDir === Direction.RIGHT ? 1 : seat.facingDir === Direction.LEFT ? -1 : 0;
      const dRow = seat.facingDir === Direction.DOWN ? 1 : seat.facingDir === Direction.UP ? -1 : 0;
      // Check tiles in the facing direction (desk could be 1-3 tiles deep)
      for (let d = 1; d <= AUTO_ON_FACING_DEPTH; d++) {
        const tileCol = seat.seatCol + dCol * d;
        const tileRow = seat.seatRow + dRow * d;
        autoOnTiles.add(`${tileCol},${tileRow}`);

        // Also check tiles to the sides at this depth (desks can be wide)
        for (let s = 1; s <= AUTO_ON_SIDE_DEPTH; s++) {
          if (dCol !== 0) {
            // Facing left/right: check tiles above and below
            autoOnTiles.add(`${tileCol},${tileRow - s}`);
            autoOnTiles.add(`${tileCol},${tileRow + s}`);
          } else {
            // Facing up/down: check tiles left and right
            autoOnTiles.add(`${tileCol - s},${tileRow}`);
            autoOnTiles.add(`${tileCol + s},${tileRow}`);
          }
        }
      }
    }

    if (autoOnTiles.size === 0) {
      this.furniture = archiveToFurnitureInstances(this.layout.furniture);
      return;
    }

    // Build modified furniture list with auto-state and animation applied
    const animFrame = Math.floor(this.furnitureAnimTimer / FURNITURE_ANIM_INTERVAL_SEC);
    const modifiedFurniture: PlacedFurniture[] = this.layout.furniture.map((item) => {
      const entry = getCatalogEntry(item.type);
      if (!entry) return item;
      // Check if any tile of this furniture overlaps an auto-on tile
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          if (autoOnTiles.has(`${item.col + dc},${item.row + dr}`)) {
            let onType = getOnStateType(item.type);
            if (onType !== item.type) {
              // Check if the on-state type has animation frames
              const frames = getAnimationFrames(onType);
              if (frames && frames.length > 1) {
                const frameIdx = animFrame % frames.length;
                onType = frames[frameIdx];
              }
              return { ...item, type: onType };
            }
            return item;
          }
        }
      }
      return item;
    });

    this.furniture = archiveToFurnitureInstances(modifiedFurniture);
  }

  setAgentTool(id: number, tool: string | null): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.currentTool = tool;
    }
  }

  showPermissionBubble(id: number): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.bubbleType = 'permission';
      ch.bubbleTimer = 0;
    }
  }

  clearPermissionBubble(id: number): void {
    const ch = this.characters.get(id);
    if (ch && ch.bubbleType === 'permission') {
      ch.bubbleType = null;
      ch.bubbleTimer = 0;
    }
  }

  showWaitingBubble(id: number): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.bubbleType = 'waiting';
      ch.bubbleTimer = WAITING_BUBBLE_DURATION_SEC;
    }
  }

  /** Dismiss bubble on click — permission: instant, waiting: quick fade */
  dismissBubble(id: number): void {
    const ch = this.characters.get(id);
    if (!ch || !ch.bubbleType) return;
    if (ch.bubbleType === 'permission') {
      ch.bubbleType = null;
      ch.bubbleTimer = 0;
    } else if (ch.bubbleType === 'waiting') {
      // Trigger immediate fade (0.3s remaining)
      ch.bubbleTimer = Math.min(ch.bubbleTimer, DISMISS_BUBBLE_FAST_FADE_SEC);
    }
  }

  setTeamInfo(
    id: number,
    teamName?: string,
    agentName?: string,
    isTeamLead?: boolean,
    leadAgentId?: number,
    teamUsesTmux?: boolean,
  ): void {
    const ch = this.characters.get(id);
    if (!ch) return;
    ch.teamName = teamName;
    ch.agentName = agentName;
    ch.isTeamLead = isTeamLead;
    ch.leadAgentId = leadAgentId;
    if (teamUsesTmux !== undefined) {
      ch.teamUsesTmux = teamUsesTmux;
    }
  }

  setAgentTokens(id: number, inputTokens: number, outputTokens: number): void {
    const ch = this.characters.get(id);
    if (!ch) return;
    ch.inputTokens = inputTokens;
    ch.outputTokens = outputTokens;
  }

  update(dt: number): void {
    // Furniture animation cycling
    const prevFrame = Math.floor(this.furnitureAnimTimer / FURNITURE_ANIM_INTERVAL_SEC);
    this.furnitureAnimTimer += dt;
    const newFrame = Math.floor(this.furnitureAnimTimer / FURNITURE_ANIM_INTERVAL_SEC);
    if (newFrame !== prevFrame) {
      this.rebuildFurnitureInstances();
    }

    const toDelete: number[] = [];
    for (const ch of this.characters.values()) {
      // Handle matrix effect animation
      if (ch.matrixEffect) {
        ch.matrixEffectTimer += dt;
        if (ch.matrixEffectTimer >= MATRIX_EFFECT_DURATION) {
          if (ch.matrixEffect === 'spawn') {
            // Spawn complete — clear effect, resume normal FSM
            ch.matrixEffect = null;
            ch.matrixEffectTimer = 0;
            ch.matrixEffectSeeds = [];
          } else {
            // Despawn complete — mark for deletion
            toDelete.push(ch.id);
          }
        }
        continue; // skip normal FSM while effect is active
      }

      // Temporarily unblock own seat so character can pathfind to it
      this.withOwnSeatUnblocked(ch, () =>
        updateCharacter(ch, dt, this.walkableTiles, this.seats, this.tileMap, this.blockedTiles),
      );

      // Tick bubble timer for waiting bubbles
      if (ch.bubbleType === 'waiting') {
        ch.bubbleTimer -= dt;
        if (ch.bubbleTimer <= 0) {
          ch.bubbleType = null;
          ch.bubbleTimer = 0;
        }
      }
    }
    // Remove characters that finished despawn
    for (const id of toDelete) {
      this.characters.delete(id);
    }
  }

  /** Helper to temporarily unblock an agent's own seat tile for pathfinding */
  private withOwnSeatUnblocked<T>(ch: Character, fn: () => T): T {
    const key = this.ownSeatKey(ch);
    const wasBlocked = key ? this.blockedTiles.has(key) : false;
    if (key && wasBlocked) this.blockedTiles.delete(key);
    try {
      return fn();
    } finally {
      if (key && wasBlocked) this.blockedTiles.add(key);
    }
  }

  /** Get the coordinate key for an agent's currently occupied seat tile */
  private ownSeatKey(ch: Character): string | null {
    if (!ch.seatId) return null;
    const seat = this.seats.get(ch.seatId);
    if (!seat) return null;
    return `${seat.seatCol},${seat.seatRow}`;
  }

  getCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  /** Get character at pixel position (for hit testing). Returns id or null. */
  getCharacterAt(worldX: number, worldY: number): number | null {
    const chars = this.getCharacters().sort((a, b) => b.y - a.y);
    for (const ch of chars) {
      // Skip characters that are despawning
      if (ch.matrixEffect === 'despawn') continue;
      // Character sprite is 16x24, anchored bottom-center
      // Apply sitting offset to match visual position
      const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
      const anchorY = ch.y + sittingOffset;
      const left = ch.x - CHARACTER_HIT_HALF_WIDTH;
      const right = ch.x + CHARACTER_HIT_HALF_WIDTH;
      const top = anchorY - CHARACTER_HIT_HEIGHT;
      const bottom = anchorY;
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return ch.id;
      }
    }
    return null;
  }
}



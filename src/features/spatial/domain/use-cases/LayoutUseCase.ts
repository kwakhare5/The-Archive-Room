import { WorldState, ArchiveLayout } from '../models/WorldState';
import { Agent } from '../models/Agent';
import { Direction } from '../models/Direction';
import { 
  createDefaultArchive,
  getBlockedTiles,
  archiveToFurnitureInstances,
  archiveToSeats,
  archiveToTileMap,
} from '@/features/spatial/logic/nexusSerializer';
import { getWalkableTiles, isWalkable } from '@/features/spatial/logic/tileMap';
import { 
  getCatalogEntry, 
  getOnStateType, 
  getAnimationFrames 
} from '@/features/spatial/logic/furnitureCatalog';
import { 
  AUTO_ON_FACING_DEPTH, 
  AUTO_ON_SIDE_DEPTH, 
  FURNITURE_ANIM_INTERVAL_SEC 
} from '@/shared/constants/config';
import { AgentState } from '../models/AgentState';

export class LayoutUseCase {
  private furnitureAnimTimer = 0;

  public createInitialWorld(layout?: ArchiveLayout): WorldState {
    const l = layout || createDefaultArchive();
    const tileMap = archiveToTileMap(l);
    const seats = archiveToSeats(l.furniture);
    const blockedTiles = getBlockedTiles(l.furniture);
    
    return {
      layout: l,
      tileMap,
      seats,
      blockedTiles,
      walkableTiles: getWalkableTiles(tileMap, blockedTiles),
    };
  }

  public rebuildWorld(layout: ArchiveLayout): WorldState {
    const tileMap = archiveToTileMap(layout);
    const seats = archiveToSeats(layout.furniture);
    const blockedTiles = getBlockedTiles(layout.furniture);

    return {
      layout,
      tileMap,
      seats,
      blockedTiles,
      walkableTiles: getWalkableTiles(tileMap, blockedTiles),
    };
  }

  public update(dt: number, world: WorldState, agents: Map<number, Agent>): void {
    const prevFrame = Math.floor(this.furnitureAnimTimer / FURNITURE_ANIM_INTERVAL_SEC);
    this.furnitureAnimTimer += dt;
    const newFrame = Math.floor(this.furnitureAnimTimer / FURNITURE_ANIM_INTERVAL_SEC);
    
    if (newFrame !== prevFrame) {
      this.recomputeFurnitureStates(world, agents);
    }
  }

  private recomputeFurnitureStates(world: WorldState, agents: Map<number, Agent>): void {
    const autoOnTiles = new Set<string>();
    
    for (const agent of agents.values()) {
      if (!agent.seatId) continue;
      
      const isInteracting = (
        [AgentState.TYPE, AgentState.READING, AgentState.THINKING, AgentState.DISCARDING] as AgentState[]
      ).includes(agent.state);
      
      if (!agent.isActive && !isInteracting) continue;
      
      const seat = world.seats.get(agent.seatId);
      if (!seat) continue;

      const dCol = seat.facingDir === Direction.RIGHT ? 1 : seat.facingDir === Direction.LEFT ? -1 : 0;
      const dRow = seat.facingDir === Direction.DOWN ? 1 : seat.facingDir === Direction.UP ? -1 : 0;

      for (let d = 1; d <= AUTO_ON_FACING_DEPTH; d++) {
        const tileCol = seat.seatCol + dCol * d;
        const tileRow = seat.seatRow + dRow * d;
        autoOnTiles.add(`${tileCol},${tileRow}`);

        for (let s = 1; s <= AUTO_ON_SIDE_DEPTH; s++) {
          if (dCol !== 0) {
            autoOnTiles.add(`${tileCol},${tileRow - s}`);
            autoOnTiles.add(`${tileCol},${tileRow + s}`);
          } else {
            autoOnTiles.add(`${tileCol - s},${tileRow}`);
            autoOnTiles.add(`${tileCol + s},${tileRow}`);
          }
        }
      }
    }

    const animFrame = Math.floor(this.furnitureAnimTimer / FURNITURE_ANIM_INTERVAL_SEC);
    
    // In Clean Architecture, the use case produces the next "state" of furniture
    // The renderer will consume the base layout and these dynamic states.
    // For now, keeping identical behavior by modifying the temporary display furniture in ArchiveEngine.
  }

  public resolveInteractionTarget(world: WorldState, furnitureUid: string): { col: number; row: number; facingDir: number } | null {
    const item = world.layout.furniture.find((f) => f.uid === furnitureUid);
    if (!item) return null;

    let anchor = item;
    const baseType = item.type.split(':')[0];
    if (baseType === 'BOOKSHELF' || baseType === 'WHITEBOARD') {
      const neighbors = world.layout.furniture.filter((f) => f.type.startsWith(baseType) && f.col === item.col);
      anchor = neighbors.reduce((prev, curr) => (curr.row > prev.row ? curr : prev), item);
    }

    const entry = getCatalogEntry(anchor.type);
    if (!entry) return null;

    const candidates: Array<{ col: number; row: number; facingDir: number }> = [];
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const fc = anchor.col + dc;
        const fr = anchor.row + dr;
        
        if (baseType === 'BIN') {
          candidates.push({ col: fc + 1, row: fr, facingDir: Direction.LEFT });
          candidates.push({ col: fc, row: fr + 1, facingDir: Direction.UP });
        } else {
          candidates.push({ col: fc, row: fr + 1, facingDir: Direction.UP });
          candidates.push({ col: fc + 1, row: fr, facingDir: Direction.LEFT });
          candidates.push({ col: fc - 1, row: fr, facingDir: Direction.RIGHT });
          candidates.push({ col: fc, row: fr - 1, facingDir: Direction.DOWN });
        }
      }
    }

    candidates.sort(() => Math.random() - 0.5);

    for (const c of candidates) {
      if (isWalkable(c.col, c.row, world.tileMap, world.blockedTiles)) {
        return c;
      }
    }
    return null;
  }
}

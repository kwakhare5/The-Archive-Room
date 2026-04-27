import { Direction } from '@/shared/types/types';
import type { ArchiveEngine } from '../ArchiveEngine';

/**
 * InputManager
 * 
 * Extracts input mapping and world interaction logic from the UI layer.
 * Translates raw clicks/coordinates into Engine intents.
 */
export class InputManager {
  constructor(private engine: ArchiveEngine) {}

  /**
   * Handle a primary click interaction in the world.
   * Returns true if the click was handled by the engine.
   */
  public handlePrimaryClick(
    worldX: number, 
    worldY: number, 
    tile: { col: number; row: number } | null,
    onFurnitureSelect?: (uid: string, name: string) => void
  ): boolean {
    const hitId = this.engine.getCharacterAt(worldX, worldY);
    
    if (hitId !== null) {
      this.handleAgentClick(hitId);
      return true;
    }

    if (tile) {
      return this.handleWorldTileClick(tile, onFurnitureSelect);
    }

    // Clicked void
    this.engine.setSelectedAgentId(null);
    this.engine.setCameraFollowId(null);
    return false;
  }

  /**
   * Handle right-click / context menu interaction.
   */
  public handleContextMenu(col: number, row: number): void {
    if (this.engine.selectedAgentId !== null) {
      this.engine.walkToTile(this.engine.selectedAgentId, col, row);
    }
  }

  private handleAgentClick(id: number): void {
    if (this.engine.selectedAgentId === id) {
      this.engine.setSelectedAgentId(null);
      this.engine.setCameraFollowId(null);
    } else {
      this.engine.setSelectedAgentId(id);
      this.engine.setCameraFollowId(id);
    }
  }

  private handleWorldTileClick(
    tile: { col: number; row: number },
    onFurnitureSelect?: (uid: string, name: string) => void
  ): boolean {
    const targetFurniture = this.engine.getFurnitureAt(tile.col, tile.row);
    
    if (targetFurniture) {
      if (onFurnitureSelect) {
        onFurnitureSelect(targetFurniture.uid, (targetFurniture as any).name || targetFurniture.type);
      }

      const activeId = this.engine.selectedAgentId ?? 1; // Default to lead agent
      if (this.engine.characters.has(activeId)) {
        const handled = this.engine.handleFurnitureClick(activeId, targetFurniture.uid);
        if (handled) {
          this.engine.setSelectedAgentId(null);
          this.engine.setCameraFollowId(null);
          return true;
        }
      }
    }

    // Seat assignment logic
    if (this.engine.selectedAgentId !== null) {
      const selectedCh = this.engine.characters.get(this.engine.selectedAgentId);
      if (selectedCh && !selectedCh.isSubagent) {
        const seatId = this.engine.getSeatAtTile(tile.col, tile.row);
        if (seatId) {
          return this.handleSeatClick(this.engine.selectedAgentId, seatId);
        }
      }
    }

    this.engine.setSelectedAgentId(null);
    this.engine.setCameraFollowId(null);
    return false;
  }

  private handleSeatClick(agentId: number, seatId: string): boolean {
    const ch = this.engine.characters.get(agentId);
    const seat = this.engine.seats.get(seatId);
    if (!ch || !seat) return false;

    if (ch.seatId === seatId) {
      this.engine.sendToSeat(agentId);
    } else if (!seat.assigned) {
      this.engine.reassignSeat(agentId, seatId);
      this.engine.persistSeatAssignments();
    } else {
      return false;
    }

    this.engine.setSelectedAgentId(null);
    this.engine.setCameraFollowId(null);
    return true;
  }
}

import {
  createDefaultArchive,
  getBlockedTiles,
  archiveToFurnitureInstances,
  archiveToSeats,
  archiveToTileMap,
} from '@/features/spatial/logic/nexusSerializer';
import { getWalkableTiles } from '@/features/spatial/logic/tileMap';
import type { ArchiveLayout, FurnitureInstance, Seat, TileType as TileTypeVal, PlacedFurniture } from '@/shared/types/types';
import { getCatalogEntry } from '@/features/spatial/logic/furnitureCatalog';

/**
 * LayoutManager
 * 
 * Extracts layout, grid, and furniture management from the monolithic ArchiveEngine.
 * Handles parsing, rebuilding, and querying the ArchiveLayout state.
 */
export class LayoutManager {
  private layout: ArchiveLayout;
  private tileMap: TileTypeVal[][];
  private seats: Map<string, Seat>;
  private blockedTiles: Set<string>;
  private furniture: FurnitureInstance[];
  private walkableTiles: Array<{ col: number; row: number }>;

  constructor(initialLayout?: ArchiveLayout) {
    this.layout = initialLayout || createDefaultArchive();
    this.tileMap = archiveToTileMap(this.layout);
    this.seats = archiveToSeats(this.layout.furniture);
    this.blockedTiles = getBlockedTiles(this.layout.furniture);
    this.furniture = archiveToFurnitureInstances(this.layout.furniture);
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);
  }

  /**
   * Rebuilds the internal state caches from a new layout.
   */
  public rebuildFromLayout(layout: ArchiveLayout): void {
    this.layout = layout;
    this.tileMap = archiveToTileMap(layout);
    this.seats = archiveToSeats(layout.furniture);
    this.blockedTiles = getBlockedTiles(layout.furniture);
    this.furniture = archiveToFurnitureInstances(layout.furniture);
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);
  }

  // --- Getters ---
  
  public getLayout(): ArchiveLayout {
    return this.layout;
  }

  public getTileMap(): TileTypeVal[][] {
    return this.tileMap;
  }

  public getSeats(): Map<string, Seat> {
    return this.seats;
  }

  public getBlockedTiles(): Set<string> {
    return this.blockedTiles;
  }

  public getFurniture(): FurnitureInstance[] {
    return this.furniture;
  }

  public getWalkableTiles(): Array<{ col: number; row: number }> {
    return this.walkableTiles;
  }

  public getFurnitureAt(col: number, row: number): PlacedFurniture | null {
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
   * Clears internal state arrays.
   */
  public destroy(): void {
    this.seats.clear();
    this.blockedTiles.clear();
    this.furniture = [];
    this.walkableTiles = [];
  }
}

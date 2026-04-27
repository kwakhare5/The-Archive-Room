import { TileType } from './TileType';
import { Seat, PlacedFurniture } from './Seat';
import { ColorValue } from '@/shared/types/types';

export interface ArchiveLayout {
  version: 1;
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
  tileColors?: Array<ColorValue | null>;
  layoutRevision?: number;
  isLocked?: boolean;
}

export interface WorldState {
  tileMap: TileType[][];
  blockedTiles: Set<string>;
  seats: Map<string, Seat>;
  layout: ArchiveLayout;
  walkableTiles: Array<{ col: number; row: number }>;
}

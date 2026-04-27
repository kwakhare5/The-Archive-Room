import { Direction } from './Direction';
import { ColorValue } from '@/shared/types/types';

export interface Seat {
  uid: string;
  seatCol: number;
  seatRow: number;
  facingDir: Direction;
  assigned: boolean;
}

export interface PlacedFurniture {
  uid: string;
  type: string;
  col: number;
  row: number;
  color?: ColorValue;
}

export interface FurnitureInstance {
  x: number;
  y: number;
  zY: number;
  mirrored?: boolean;
  isWall?: boolean;
}

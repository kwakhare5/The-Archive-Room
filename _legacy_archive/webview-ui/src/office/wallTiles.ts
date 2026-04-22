/**
 * Wall tile auto-tiling: sprite storage and bitmask-based piece selection.
 *
 * Stores wall tile sets loaded from individual PNGs in assets/walls/.
 * Each set contains 16 wall sprites (one per 4-bit bitmask).
 * At render time, each wall tile's 4 cardinal neighbors are checked to build
 * a bitmask, and the corresponding sprite is drawn directly.
 * No changes to the layout model — auto-tiling is purely visual.
 *
 * Bitmask convention: N=1, E=2, S=4, W=8. Out-of-bounds = NOT wall.
 */

import { 
  TILE_SIZE, 
  MODULAR_WHITE, 
  MODULAR_GRAY, 
  MODULAR_SHADOW, 
  MODULAR_BORDER 
} from '../constants.js';
import { getColorizedSprite } from './colorize.js';
import type { ColorValue } from '../components/ui/types.js';
import type { FurnitureInstance, SpriteData, TileType as TileTypeVal } from './types.js';
import { TileType } from './types.js';

/** Wall tile sets: each set has 16 sprites indexed by bitmask (0-15) */
let wallSets: SpriteData[][] = [];

/** Set wall tile sets (called once when extension sends wallTilesLoaded) */
export function setWallSprites(sets: SpriteData[][]): void {
  wallSets = sets;
}

/** Check if wall sprites have been loaded */
export function hasWallSprites(): boolean {
  return wallSets.length > 0;
}

/** Get number of available wall sets */
export function getWallSetCount(): number {
  return wallSets.length;
}

/** Get a specific sprite (bitmask index 0-15) from a wall set */
export function getWallSprite(setIndex: number, spriteIndex: number): SpriteData | null {
  const set = wallSets[setIndex];
  if (!set) return null;
  return set[spriteIndex] ?? null;
}


/**
 * Build FurnitureInstance-like objects for all wall tiles so they can participate
 * in z-sorting with furniture and characters.
 */
/** @internal */
export function getWallInstances(
  tileMap: TileTypeVal[][],
  tileColors?: (ColorValue | null)[],
  selectedWallSetIndex: number = 0
): FurnitureInstance[] {
  const tmRows = tileMap.length;
  const tmCols = tmRows > 0 ? tileMap[0].length : 0;
  if (wallSets.length === 0 || tmCols === 0) return [];

  const instances: FurnitureInstance[] = [];

  // Use the requested set (fallback to first set)
  const setIndex = Math.max(0, Math.min(wallSets.length - 1, selectedWallSetIndex));
  const set = wallSets[setIndex];

  // Professional Palette Tokens
  const whiteHex = MODULAR_WHITE;
  const grayHex = MODULAR_GRAY;
  const shadowHex = MODULAR_SHADOW;
  const borderHex = MODULAR_BORDER;

  for (let r = 0; r < tmRows; r++) {
    for (let c = 0; c < tmCols; c++) {
      const tile = tileMap[r][c];
      
      const isBottom = (tile >= TileType.WALL_TILE_BOTTOM_START && tile <= TileType.WALL_TILE_BOTTOM_END);
      const isTop = (tile >= TileType.WALL_TILE_TOP_START && tile <= TileType.WALL_TILE_TOP_END);
      const isHalf = tile >= TileType.WALL_TILE_HALF_BOTTOM && tile <= TileType.WALL_TILE_HALF_RIGHT;
      const isFlat = tile === TileType.WALL_TILE_FLAT || tile === TileType.WALL_TILE_FLAT_BASE || 
                     tile === TileType.WALL_TILE_PANEL_WHITE || tile === TileType.WALL_TILE_PANEL_BASE ||
                     (tile >= TileType.WALL_TILE_BORDER_BOTTOM_WHITE && tile <= TileType.WALL_TILE_BORDER_TOP_SIDES_GRAY);
      const isTransition = tile === TileType.WALL_TILE_MODULAR_TRANSITION || tile === TileType.WALL_TILE_MODULAR_INVERTED || tile === TileType.WALL_TILE_PANEL_TRANSITION || tile === TileType.WALL_TILE_PANEL_INVERTED;
      const isWhiteboard = tile === TileType.WALL_TILE_WHITEBOARD;

      if (!isBottom && !isTop && !isHalf && !isFlat && !isTransition && !isWhiteboard) continue;

      const wallIdx = (isHalf || isFlat || isTransition || isWhiteboard) ? 0 : (isBottom ? (tile - TileType.WALL_TILE_BOTTOM_START) : (tile - TileType.WALL_TILE_TOP_START));
      
      let bSprite: string[][];
      let isStatic = false;

      if (isTransition) {
        const isInverted = tile === TileType.WALL_TILE_MODULAR_INVERTED || tile === TileType.WALL_TILE_PANEL_INVERTED;
        const isPanel = tile === TileType.WALL_TILE_PANEL_TRANSITION || tile === TileType.WALL_TILE_PANEL_INVERTED;
        const topColor = isInverted ? grayHex : whiteHex;
        const bottomColor = isInverted ? whiteHex : grayHex;
        
        bSprite = [];
        for (let y = 0; y < TILE_SIZE; y++) {
          const row = [];
          for (let x = 0; x < TILE_SIZE; x++) {
            let color = (y < 8) ? topColor : bottomColor;
            
            if (y === 8 && !isInverted) color = shadowHex;
            if (y === 0 && isInverted && !isPanel) color = borderHex;
            if (isPanel && (x === 0 || x === TILE_SIZE - 1)) color = borderHex;
            if (isPanel && y === TILE_SIZE - 1 && !isInverted) color = borderHex;
            
            row.push(color);
          }
          bSprite.push(row);
        }
        isStatic = true;
      } else if (isHalf || isFlat) {
        const isHoriz = tile === TileType.WALL_TILE_HALF_BOTTOM || tile === TileType.WALL_TILE_HALF_TOP;
        const isPanel = tile === TileType.WALL_TILE_PANEL_WHITE || tile === TileType.WALL_TILE_PANEL_BASE;
        const isBotOnly = tile === TileType.WALL_TILE_BORDER_BOTTOM_WHITE || tile === TileType.WALL_TILE_BORDER_BOTTOM_GRAY;
        const isSideOnly = tile === TileType.WALL_TILE_BORDER_SIDES_WHITE || tile === TileType.WALL_TILE_BORDER_SIDES_GRAY;
        const isLeftOnly = tile === TileType.WALL_TILE_BORDER_LEFT_WHITE || tile === TileType.WALL_TILE_BORDER_LEFT_GRAY;
        const isRightOnly = tile === TileType.WALL_TILE_BORDER_RIGHT_WHITE || tile === TileType.WALL_TILE_BORDER_RIGHT_GRAY;
        const isTopSides = tile === TileType.WALL_TILE_BORDER_TOP_SIDES_WHITE || tile === TileType.WALL_TILE_BORDER_TOP_SIDES_GRAY;
        
        const w = isFlat ? TILE_SIZE : (isHoriz ? TILE_SIZE : TILE_SIZE / 2);
        const h = isFlat ? TILE_SIZE : (isHoriz ? TILE_SIZE / 2 : TILE_SIZE);
        const baseHex = (tile === TileType.WALL_TILE_FLAT_BASE || tile === TileType.WALL_TILE_PANEL_BASE || 
                         tile === TileType.WALL_TILE_BORDER_BOTTOM_GRAY || tile === TileType.WALL_TILE_BORDER_SIDES_GRAY ||
                         tile === TileType.WALL_TILE_BORDER_LEFT_GRAY || tile === TileType.WALL_TILE_BORDER_RIGHT_GRAY ||
                         tile === TileType.WALL_TILE_BORDER_TOP_SIDES_GRAY) ? grayHex : whiteHex;
        
        bSprite = [];
        for (let y = 0; y < h; y++) {
          const row = [];
          for (let x = 0; x < w; x++) {
            let color = baseHex;
            if ((isPanel || isSideOnly || isLeftOnly || isTopSides) && x === 0) color = borderHex;
            if ((isPanel || isSideOnly || isRightOnly || isTopSides) && x === w - 1) color = borderHex;
            if ((isPanel || isBotOnly) && y === h - 1) color = borderHex;
            if (isTopSides && y === 0) color = borderHex;
            row.push(color);
          }
          bSprite.push(row);
        }
        
        isStatic = true;
      } else if (isWhiteboard) {
        const neighbors = {
          n: r > 0 ? tileMap[r - 1][c] === TileType.WALL_TILE_WHITEBOARD : false,
          s: r < tmRows - 1 ? tileMap[r + 1][c] === TileType.WALL_TILE_WHITEBOARD : false,
          e: c < tmCols - 1 ? tileMap[r][c + 1] === TileType.WALL_TILE_WHITEBOARD : false,
          w: c > 0 ? tileMap[r][c - 1] === TileType.WALL_TILE_WHITEBOARD : false,
        };

        bSprite = [];
        for (let y = 0; y < TILE_SIZE; y++) {
          const row = [];
          for (let x = 0; x < TILE_SIZE; x++) {
            let color = MODULAR_WHITE;
            if (y === 0 && !neighbors.n) color = borderHex;
            if (y === TILE_SIZE - 1 && !neighbors.s) color = borderHex;
            if (x === 0 && !neighbors.w) color = borderHex;
            if (x === TILE_SIZE - 1 && !neighbors.e) color = borderHex;
            row.push(color);
          }
          bSprite.push(row);
        }
        isStatic = true;
      } else {
        const raw = set[wallIdx];
        if (!raw) continue;
        bSprite = [...raw];
        if (bSprite.length > TILE_SIZE) {
          bSprite = isTop ? bSprite.slice(0, TILE_SIZE) : bSprite.slice(bSprite.length - TILE_SIZE);
        }
      }
      
      // Colorize the sprite (unless it's a procedural modular tile)
      let colorized = bSprite;
      if (!isStatic) {
        const colorIdx = r * tmCols + c;
        const color = tileColors?.[colorIdx] ?? { h: 0, s: 0, b: 0, c: 0 };
        const normalizedColor = color.b > 0 
          ? { h: 0, s: 0, b: 80, c: 0 }
          : { h: 230, s: 15, b: -20, c: 0 };

        const cacheKey = `wall-${setIndex}-${wallIdx}-${isTop ? 'top' : 'bottom'}-${normalizedColor.h}-${normalizedColor.s}-${normalizedColor.b}-${normalizedColor.c}`;
        colorized = getColorizedSprite(cacheKey, bSprite, { ...normalizedColor, colorize: true });
      }

      // Calculate position
      const xPos = c * TILE_SIZE + (tile === TileType.WALL_TILE_HALF_RIGHT ? TILE_SIZE / 2 : 0);
      const yPos = r * TILE_SIZE + (tile === TileType.WALL_TILE_HALF_BOTTOM ? TILE_SIZE / 2 : 0);
      const zDepth = (r + 1) * TILE_SIZE;

      instances.push({ sprite: colorized, x: xPos, y: yPos, zY: zDepth, isWall: true });
    }
  }

  return instances;
}

/**
 * Compute the flat fill hex color for a wall tile with a given ColorValue.
 * Uses same Colorize algorithm as floor tiles: 50% gray → HSL.
 */
export function wallColorToHex(color: ColorValue): string {
  const { h, s, b, c } = color;
  // Start with 50% gray (wall base)
  let lightness = 0.5;

  // Apply contrast
  if (c !== 0) {
    const factor = (100 + c) / 100;
    lightness = 0.5 + (lightness - 0.5) * factor;
  }

  // Apply brightness
  if (b !== 0) {
    lightness = lightness + b / 200;
  }

  lightness = Math.max(0, Math.min(1, lightness));

  // HSL to hex (same as colorize.ts hslToHex)
  const satFrac = s / 100;
  const ch = (1 - Math.abs(2 * lightness - 1)) * satFrac;
  const hp = h / 60;
  const x = ch * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (hp < 1) {
    r1 = ch;
    g1 = x;
    b1 = 0;
  } else if (hp < 2) {
    r1 = x;
    g1 = ch;
    b1 = 0;
  } else if (hp < 3) {
    r1 = 0;
    g1 = ch;
    b1 = x;
  } else if (hp < 4) {
    r1 = 0;
    g1 = x;
    b1 = ch;
  } else if (hp < 5) {
    r1 = x;
    g1 = 0;
    b1 = ch;
  } else {
    r1 = ch;
    g1 = 0;
    b1 = x;
  }

  const m = lightness - ch / 2;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255)));

  return `#${clamp(r1).toString(16).padStart(2, '0')}${clamp(g1).toString(16).padStart(2, '0')}${clamp(b1).toString(16).padStart(2, '0')}`;
}

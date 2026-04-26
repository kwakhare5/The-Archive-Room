/**
 * Browser runtime mock — fetches assets and injects the same postMessage
 * events the VS Code extension would send.
 *
 * In Vite dev, it prefers pre-decoded JSON endpoints from middleware.
 * In plain browser builds, it falls back to decoding PNGs at runtime.
 *
 * Only imported in browser runtime; tree-shaken from VS Code webview runtime.
 */

import { rgbaToHex } from './colorize';
import {
  CHAR_FRAME_H,
  CHAR_FRAME_W,
  CHAR_FRAMES_PER_ROW,
  CHARACTER_DIRECTIONS,
  FLOOR_TILE_SIZE,
  WALL_BITMASK_COUNT,
  WALL_GRID_COLS,
  WALL_PIECE_HEIGHT,
  WALL_PIECE_WIDTH,
} from '@/shared/constants/config';
import type {
  AssetIndex,
  LegacyCatalogEntry,
  CharacterDirectionSprites,
} from '@/shared/types/types';

interface MockPayload {
  characters: CharacterDirectionSprites[];
  floorSprites: string[][][];
  wallSets: string[][][][];
  furnitureCatalog: LegacyCatalogEntry[];
  furnitureSprites: Record<string, string[][]>;
  layout: unknown;
  settings: {
    soundEnabled: boolean;
    alwaysShowLabels: boolean;
    watchAllSessions: boolean;
    hooksEnabled: boolean;
  };
  agentSeats: Record<number, { palette: number; seatId: string | null }>;
}

// ── Module-level state ─────────────────────────────────────────────────────────

let mockPayload: MockPayload | null = null;

// ── PNG decode helpers (browser fallback) ───────────────────────────────────

interface DecodedPng {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function getPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const idx = (y * width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
}

function readSprite(
  png: DecodedPng,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
): string[][] {
  const sprite: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(png.data, png.width, offsetX + x, offsetY + y);
      row.push(rgbaToHex(r, g, b, a));
    }
    sprite.push(row);
  }
  return sprite;
}

async function decodePng(url: string): Promise<DecodedPng> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch PNG: ${url} (${res.status.toString()})`);
  }
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Failed to create 2d canvas context for PNG decode');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: imageData.data };
}

async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function getIndexedAssetPath(kind: 'characters' | 'floors' | 'walls', relPath: string): string {
  return relPath.startsWith(`${kind}/`) ? relPath : `${kind}/${relPath}`;
}

async function decodeCharactersFromPng(
  base: string,
  index: AssetIndex,
): Promise<CharacterDirectionSprites[]> {
  const sprites: CharacterDirectionSprites[] = [];
  for (const relPath of index.characters) {
    const png = await decodePng(`${base}assets/${getIndexedAssetPath('characters', relPath)}`);
    const byDir: CharacterDirectionSprites = { down: [], up: [], right: [] };

    for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
      const dir = CHARACTER_DIRECTIONS[dirIdx];
      const rowOffsetY = dirIdx * CHAR_FRAME_H;
      const frames: string[][][] = [];
      for (let frame = 0; frame < CHAR_FRAMES_PER_ROW; frame++) {
        frames.push(readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, rowOffsetY));
      }
      byDir[dir] = frames;
    }

    sprites.push(byDir);
  }
  return sprites;
}

async function decodeFloorsFromPng(base: string, index: AssetIndex): Promise<string[][][]> {
  const floors: string[][][] = [];
  for (const relPath of index.floors) {
    const png = await decodePng(`${base}assets/${getIndexedAssetPath('floors', relPath)}`);
    floors.push(readSprite(png, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE));
  }
  return floors;
}

async function decodeWallsFromPng(base: string, index: AssetIndex): Promise<string[][][][]> {
  const wallSets: string[][][][] = [];
  for (const relPath of index.walls) {
    const png = await decodePng(`${base}assets/${getIndexedAssetPath('walls', relPath)}`);
    const set: string[][][] = [];
    for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
      const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
      const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
      set.push(readSprite(png, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT, ox, oy));
    }
    wallSets.push(set);
  }
  return wallSets;
}

async function decodeFurnitureFromPng(
  base: string,
  catalog: LegacyCatalogEntry[],
): Promise<Record<string, string[][]>> {
  const sprites: Record<string, string[][]> = {};
  for (const entry of catalog) {
    const png = await decodePng(`${base}assets/${entry.furniturePath}`);
    sprites[entry.id] = readSprite(png, entry.width, entry.height);
  }
  return sprites;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Call before createRoot() in main.tsx.
 * Fetches all pre-decoded assets from the Vite dev server and stores them
 * for dispatchMockMessages().
 */
export async function initBrowserMock(): Promise<void> {
  console.log('[BrowserMock] Loading assets...');

  const base = '/'; // '/' in dev, '/sub/' with a subpath, './' in production

  const [assetIndex, catalog] = await Promise.all([
    fetch(`${base}assets/asset-index.json`).then((r) => r.json()) as Promise<AssetIndex>,
    fetch(`${base}assets/furniture-catalog.json`).then((r) => r.json()) as Promise<LegacyCatalogEntry[]>,
  ]);

  const shouldTryDecoded = process.env.NODE_ENV === 'development';
  const [decodedCharacters, decodedFloors, decodedWalls, decodedFurniture] = shouldTryDecoded
    ? await Promise.all([
        fetchJsonOptional<CharacterDirectionSprites[]>(`${base}assets/decoded/characters.json`),
        fetchJsonOptional<string[][][]>(`${base}assets/decoded/floors.json`),
        fetchJsonOptional<string[][][][]>(`${base}assets/decoded/walls.json`),
        fetchJsonOptional<Record<string, string[][]>>(`${base}assets/decoded/furniture.json`),
      ])
    : [null, null, null, null];

  const hasDecoded = !!(decodedCharacters && decodedFloors && decodedWalls && decodedFurniture);

  if (!hasDecoded) {
    if (shouldTryDecoded) {
      console.log('[BrowserMock] Decoded JSON not found, decoding PNG assets in browser...');
    } else {
      console.log('[BrowserMock] Decoding PNG assets in browser...');
    }
  }

  const [characters, floorSprites, wallSets, furnitureSprites] = hasDecoded
    ? [decodedCharacters!, decodedFloors!, decodedWalls!, decodedFurniture!]
    : await Promise.all([
        decodeCharactersFromPng(base, assetIndex),
        decodeFloorsFromPng(base, assetIndex),
        decodeWallsFromPng(base, assetIndex),
        decodeFurnitureFromPng(base, catalog),
      ]);

  const CONFIG_KEY = 'archive-room-config';
  const rawConfig = localStorage.getItem(CONFIG_KEY);
  let config = rawConfig ? JSON.parse(rawConfig) : null;

  // Migration logic
  if (!config) {
    console.log('[BrowserMock] New config not found, attempting migration from legacy keys...');
    const legacyLayout = localStorage.getItem('office-layout');
    const legacySound = localStorage.getItem('office-sound-enabled');
    const legacyLabels = localStorage.getItem('office-always-show-labels');
    const legacyWatch = localStorage.getItem('office-watch-all-sessions');
    const legacyState = localStorage.getItem('vscode-state');

    if (legacyLayout || legacySound || legacyLabels || legacyWatch || legacyState) {
      config = {
        layout: legacyLayout ? JSON.parse(legacyLayout) : null,
        agentSeats: {},
        settings: {
          soundEnabled: legacySound ? JSON.parse(legacySound) : false,
          alwaysShowLabels: legacyLabels ? JSON.parse(legacyLabels) : false,
          watchAllSessions: legacyWatch ? JSON.parse(legacyWatch) : false,
          hooksEnabled: true,
        },
        vscodeState: legacyState ? JSON.parse(legacyState) : {},
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      console.log('[BrowserMock] Migration complete.');
      
      // Cleanup legacy keys
      localStorage.removeItem('office-layout');
      localStorage.removeItem('office-sound-enabled');
      localStorage.removeItem('office-always-show-labels');
      localStorage.removeItem('office-watch-all-sessions');
      localStorage.removeItem('vscode-state');
    }
  }

  let layout = config?.layout;

  if (assetIndex.defaultLayout) {
    const fileLayout = await fetch(`${base}assets/${assetIndex.defaultLayout}?t=${Date.now()}`).then((r) => r.json());
    const fileRev = fileLayout.layoutRevision || 0;

    const savedRev = layout?.layoutRevision || 0;
    console.log(`[BrowserMock] File revision: ${fileRev}, Saved revision: ${savedRev}`);

    // Force update ONLY if no saved layout exists at all
    if (!layout) {
      console.log(`[BrowserMock] Initializing to default layout (v${fileRev})`);
      layout = fileLayout;
      const updatedConfig = config || {
        layout: null,
        agentSeats: {},
        settings: { soundEnabled: false, alwaysShowLabels: false, watchAllSessions: false, hooksEnabled: true },
        vscodeState: {}
      };
      updatedConfig.layout = layout;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(updatedConfig));
      config = updatedConfig;
    }
  }

  const settings = config?.settings || {
    soundEnabled: false,
    alwaysShowLabels: false,
    watchAllSessions: false,
    hooksEnabled: true,
  };

  mockPayload = {
    characters,
    floorSprites,
    wallSets,
    furnitureCatalog: catalog,
    furnitureSprites,
    layout,
    settings,
    agentSeats: config?.agentSeats || {},
  };

  console.log(
    `[BrowserMock] Ready (${hasDecoded ? 'decoded-json' : 'browser-png-decode'}) — ${characters.length} chars, ${floorSprites.length} floors, ${wallSets.length} wall sets, ${catalog.length} furniture items`,
  );
}

/**
 * Call inside a useEffect in App.tsx — after the window message listener
 * in useExtensionMessages has been registered.
 */
export function dispatchMockMessages(): void {
  if (!mockPayload) return;

  const {
    characters,
    floorSprites,
    wallSets,
    furnitureCatalog,
    furnitureSprites,
    layout,
    settings,
  } = mockPayload;

  function dispatch(data: unknown): void {
    window.dispatchEvent(new MessageEvent('message', { data }));
  }
  dispatch({
    type: 'settingsLoaded',
    soundEnabled: settings.soundEnabled,
    alwaysShowLabels: settings.alwaysShowLabels,
    watchAllSessions: settings.watchAllSessions,
    hooksEnabled: settings.hooksEnabled,
    extensionVersion: '1.3.0',
    lastSeenVersion: '1.2',
  });

  // characterSpritesLoaded → floorTilesLoaded → wallTilesLoaded → furnitureAssetsLoaded → existingAgents → layoutLoaded
  dispatch({ type: 'characterSpritesLoaded', characters });
  dispatch({ type: 'floorTilesLoaded', sprites: floorSprites });
  dispatch({ type: 'wallTilesLoaded', sets: wallSets });
  dispatch({ type: 'furnitureAssetsLoaded', catalog: furnitureCatalog, sprites: furnitureSprites });
  
  // Merge persistence metadata into existingAgents message
  const agents = [1]; // Primary agent
  const agentMeta: Record<number, { palette: number; hueShift: number; seatId?: string }> = { 1: { palette: 0, hueShift: 0 } };
  const folderNames: Record<number, string> = { 1: 'archive-room' };

  for (const idStr of Object.keys(mockPayload.agentSeats)) {
    const id = parseInt(idStr);
    if (!agents.includes(id)) agents.push(id);
    const seatData = mockPayload.agentSeats[id];
    agentMeta[id] = {
      palette: seatData.palette,
      hueShift: 0,
      seatId: seatData.seatId ?? undefined
    };
  }

  dispatch({ 
    type: 'existingAgents', 
    agents, 
    agentMeta,
    folderNames
  });

  dispatch({ type: 'layoutLoaded', layout });

  console.log('[BrowserMock] Messages dispatched');
}


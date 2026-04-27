import type { ColorValue } from '@/shared/components/ui/types';
import {
  BUBBLE_FADE_DURATION_SEC,
  BUBBLE_SITTING_OFFSET_PX,
  BUBBLE_VERTICAL_OFFSET_PX,
  CHARACTER_SITTING_OFFSET_PX,
  CHARACTER_SHADOW_COLOR,
  CHARACTER_Z_SORT_OFFSET,
  HOVERED_OUTLINE_ALPHA,
  OUTLINE_Z_SORT_OFFSET,
  SELECTED_OUTLINE_ALPHA,
  SELECTION_HIGHLIGHT_COLOR,
  SELECTION_DASH_PATTERN,
  DELETE_BUTTON_BG,
  ROTATE_BUTTON_BG,
  BUTTON_ICON_COLOR,
  BUTTON_MIN_RADIUS,
  BUTTON_RADIUS_ZOOM_FACTOR,
  BUTTON_LINE_WIDTH_MIN,
  BUTTON_LINE_WIDTH_ZOOM_FACTOR,
  BUTTON_ICON_SIZE_FACTOR,
  FALLBACK_FLOOR_COLOR,
} from '@/shared/constants/config';
import { getColorizedFloorSprite, hasFloorSprites, WALL_COLOR } from '@/shared/lib/engine/floorTiles';
import { getCachedSprite, getOutlineSprite } from '@/shared/lib/engine/sprites/spriteCache';
import {
  BUBBLE_PERMISSION_SPRITE,
  BUBBLE_READING_SPRITE,
  BUBBLE_THINKING_SPRITE,
  BUBBLE_TYPING_SPRITE,
  BUBBLE_WAITING_SPRITE,
  getCharacterSprites,
} from '@/shared/lib/engine/sprites/characterSpriteManifest';
import { Agent } from '../../domain/models/Agent';
import { AgentState } from '../../domain/models/AgentState';
import { FurnitureInstance, PlacedFurniture, Seat } from '../../domain/models/Seat';
import { TileType } from '../../domain/models/TileType';
import { getCatalogEntry } from '@/features/spatial/logic/furnitureCatalog';
import { TILE_SIZE } from '@/shared/types/types';
import { getWallInstances, hasWallSprites, wallColorToHex } from '@/shared/lib/engine/wallTiles';
import { getAgentSprite } from './SpriteSelector';
import { renderMatrixEffect } from '@/features/agents/logic/matrixEffect';

// Interfaces for rendering state (Adapters)
export interface ButtonBounds {
  cx: number;
  cy: number;
  radius: number;
}
export type DeleteButtonBounds = ButtonBounds;
export type RotateButtonBounds = ButtonBounds;

export interface EditorRenderState {
  showGrid: boolean;
  ghostSprite: string[][] | null;
  ghostMirrored: boolean;
  ghostCol: number;
  ghostRow: number;
  ghostValid: boolean;
  selectedCol: number;
  selectedRow: number;
  selectedW: number;
  selectedH: number;
  hasSelection: boolean;
  isRotatable: boolean;
  deleteButtonBounds: DeleteButtonBounds | null;
  rotateButtonBounds: RotateButtonBounds | null;
  showGhostBorder: boolean;
  ghostBorderHoverCol: number;
  ghostBorderHoverRow: number;
  selectedWallSet: number;
}

export interface SelectionRenderState {
  selectedAgentId: number | null;
  hoveredAgentId: number | null;
  hoveredTile: { col: number; row: number } | null;
  seats: Map<string, Seat>;
  characters: Map<number, Agent>;
}

interface ZDrawable {
  zY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  tileMap: number[][],
  furniture: FurnitureInstance[],
  agents: Agent[],
  zoom: number,
  panX: number,
  panY: number,
  selection?: SelectionRenderState,
  editor?: EditorRenderState,
  tileColors?: Array<ColorValue | null>,
  layoutCols?: number,
  layoutRows?: number,
): { offsetX: number; offsetY: number } {
  if (!hasFloorSprites()) return { offsetX: 0, offsetY: 0 };

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const cols = layoutCols ?? (tileMap.length > 0 ? tileMap[0].length : 0);
  const rows = layoutRows ?? tileMap.length;

  const mapW = cols * TILE_SIZE * zoom;
  const mapH = rows * TILE_SIZE * zoom;
  const offsetX = Math.floor((canvasWidth - mapW) / 2) + Math.round(panX);
  const offsetY = Math.floor((canvasHeight - mapH) / 2) + Math.round(panY);

  renderTileGrid(ctx, tileMap, offsetX, offsetY, zoom, tileColors, layoutCols);

  const wallInstances = hasWallSprites()
    ? getWallInstances(tileMap as any, tileColors as any, editor?.selectedWallSet ?? 0)
    : [];
  const allDrawables = [...(wallInstances as any), ...furniture];

  renderScene(ctx, allDrawables, agents, offsetX, offsetY, zoom, selection?.selectedAgentId ?? null, selection?.hoveredAgentId ?? null);
  renderBubbles(ctx, agents, offsetX, offsetY, zoom);

  return { offsetX, offsetY };
}

function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  tileMap: number[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
  tileColors?: Array<ColorValue | null>,
  cols?: number,
): void {
  const s = TILE_SIZE * zoom;
  const tmRows = tileMap.length;
  const tmCols = tmRows > 0 ? tileMap[0].length : 0;
  const layoutCols = cols ?? tmCols;

  for (let r = 0; r < tmRows; r++) {
    const rowY = Math.round(offsetY + r * s);
    const rowH = Math.round(offsetY + (r + 1) * s) - rowY;

    for (let c = 0; c < tmCols; c++) {
      const tile = tileMap[r][c];
      if (tile === TileType.VOID) continue;

      const colX = Math.round(offsetX + c * s);
      const colW = Math.round(offsetX + (c + 1) * s) - colX;

      if (tile === TileType.WALL || !hasFloorSprites()) {
        const colorIdx = r * layoutCols + c;
        const color = tileColors?.[colorIdx];
        ctx.fillStyle = color ? wallColorToHex(color as any) : (tile === TileType.WALL ? WALL_COLOR : FALLBACK_FLOOR_COLOR);
        ctx.fillRect(colX, rowY, colW, rowH);
        continue;
      }

      const colorIdx = r * layoutCols + c;
      const color = tileColors?.[colorIdx] ?? { h: 0, s: 0, b: 0, c: 0 };
      const sprite = getColorizedFloorSprite(tile, color as any);
      const cached = getCachedSprite(sprite, zoom);
      ctx.drawImage(cached, colX, rowY, colW, rowH);
    }
  }
}

function renderScene(
  ctx: CanvasRenderingContext2D,
  furniture: any[],
  agents: Agent[],
  offsetX: number,
  offsetY: number,
  zoom: number,
  selectedAgentId: number | null,
  hoveredAgentId: number | null,
): void {
  const drawables: ZDrawable[] = [];

  for (const f of furniture) {
    const cached = getCachedSprite(f.sprite, zoom);
    const fx = offsetX + f.x * zoom;
    const fy = offsetY + f.y * zoom;
    drawables.push({
      zY: f.zY,
      draw: (c) => {
        if (f.mirrored) {
          c.save();
          c.translate(fx + cached.width, fy);
          c.scale(-1, 1);
          c.drawImage(cached, 0, 0);
          c.restore();
        } else {
          c.drawImage(cached, fx, fy);
        }
      },
    });
  }

  for (const agent of agents) {
    const sprites = getCharacterSprites(agent.palette, agent.hueShift);
    const spriteData = getAgentSprite(agent, sprites);
    const cached = getCachedSprite(spriteData, zoom);
    const sittingOffset = agent.isSeated ? CHARACTER_SITTING_OFFSET_PX : 0;

    const drawX = Math.round(offsetX + agent.x * TILE_SIZE * zoom - cached.width / 2);
    const drawY = Math.round(offsetY + (agent.y * TILE_SIZE + sittingOffset) * zoom - cached.height);
    const charZY = agent.y * TILE_SIZE + TILE_SIZE / 2 + CHARACTER_Z_SORT_OFFSET;

    // Shadow
    if (agent.matrixEffect !== 'despawn') {
        const shadowX = Math.round(offsetX + agent.x * TILE_SIZE * zoom);
        const shadowY = Math.round(offsetY + (agent.y * TILE_SIZE + sittingOffset) * zoom);
        ctx.fillStyle = CHARACTER_SHADOW_COLOR;
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, (12 * zoom) / 2, (6 * zoom) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    if (agent.matrixEffect) {
      drawables.push({
        zY: charZY,
        draw: (c) => renderMatrixEffect(c, agent as any, spriteData, drawX, drawY, zoom),
      });
      continue;
    }

    const isSelected = selectedAgentId !== null && agent.id === selectedAgentId;
    const isHovered = hoveredAgentId !== null && agent.id === hoveredAgentId;
    if (isSelected || isHovered) {
      const outlineAlpha = isSelected ? SELECTED_OUTLINE_ALPHA : HOVERED_OUTLINE_ALPHA;
      const outlineData = getOutlineSprite(spriteData);
      const outlineCached = getCachedSprite(outlineData, zoom);
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET,
        draw: (c) => {
          c.save();
          c.globalAlpha = outlineAlpha;
          c.drawImage(outlineCached, drawX - zoom, drawY - zoom);
          c.restore();
        },
      });
    }

    drawables.push({
      zY: charZY,
      draw: (c) => {
        c.drawImage(cached, drawX, drawY);
        // RED SCREEN TEST: Diagnostic dot to prove new Renderer is active
        c.fillStyle = 'red';
        c.beginPath();
        c.arc(drawX + cached.width / 2, drawY + cached.height / 2, 2 * zoom, 0, Math.PI * 2);
        c.fill();
      },
    });
  }

  drawables.sort((a, b) => a.zY - b.zY);
  for (const d of drawables) d.draw(ctx);
}

function renderBubbles(ctx: CanvasRenderingContext2D, agents: Agent[], offsetX: number, offsetY: number, zoom: number): void {
  for (const agent of agents) {
    if (!agent.bubbleType) continue;
    let sprite = BUBBLE_WAITING_SPRITE;
    if (agent.bubbleType === 'permission') sprite = BUBBLE_PERMISSION_SPRITE;
    else if (agent.bubbleType === 'thinking') sprite = BUBBLE_THINKING_SPRITE;
    else if (agent.bubbleType === 'reading') sprite = BUBBLE_READING_SPRITE;
    else if (agent.bubbleType === 'typing') sprite = BUBBLE_TYPING_SPRITE;

    let alpha = 1.0;
    if (agent.bubbleType === 'waiting' && agent.bubbleTimer < BUBBLE_FADE_DURATION_SEC) {
      alpha = agent.bubbleTimer / BUBBLE_FADE_DURATION_SEC;
    }

    const cached = getCachedSprite(sprite, zoom);
    const sittingOff = agent.isSeated ? BUBBLE_SITTING_OFFSET_PX : 0;
    const bx = Math.round(offsetX + agent.x * TILE_SIZE * zoom - cached.width / 2);
    const by = Math.round(offsetY + (agent.y * TILE_SIZE + sittingOff - BUBBLE_VERTICAL_OFFSET_PX) * zoom - cached.height - 1 * zoom);

    ctx.save();
    if (alpha < 1.0) ctx.globalAlpha = alpha;
    ctx.drawImage(cached, bx, by);
    ctx.restore();
  }
}

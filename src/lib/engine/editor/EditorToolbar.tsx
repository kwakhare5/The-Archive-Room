import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ItemSelect } from '@/components/ui/ItemSelect';
import type { ColorValue } from '@/components/ui/types';
import { 
  CANVAS_FALLBACK_TILE_COLOR, 
  MODULAR_WHITE, 
  MODULAR_GRAY, 
  MODULAR_SHADOW, 
  MODULAR_BORDER 
} from '@/lib/engine/constants';

import { getColorizedFloorSprite, getFloorPatternCount, hasFloorSprites } from '../floorTiles';
import type { FurnitureCategory, LoadedAssetData } from '@/lib/engine/layout/furnitureCatalog';
import {
  buildDynamicCatalog,
  getActiveCategories,
  getCatalogByCategory,
} from '@/lib/engine/layout/furnitureCatalog';
import { getCachedSprite } from '@/lib/engine/sprites/spriteCache';
import { EditTool, TileType } from '@/lib/engine/types';
import type { TileType as TileTypeVal } from '@/lib/engine/types';


interface EditorToolbarProps {
  activeTool: EditTool;
  selectedTileType: TileTypeVal;
  selectedFurnitureType: string;
  selectedFurnitureUid: string | null;
  selectedFurnitureColor: ColorValue | null;
  floorColor: ColorValue;
  wallColor: ColorValue;
  onTileTypeChange: (type: TileTypeVal) => void;
  onFloorColorChange: (color: ColorValue) => void;
  onWallColorChange: (color: ColorValue) => void;
  onSelectedFurnitureColorChange: (color: ColorValue | null) => void;
  onFurnitureTypeChange: (type: string) => void;
  onWallSetChange: (index: number) => void;
  onToolChange: (tool: EditTool) => void;
  selectedWallSet: number;
  onUndo: () => void;
  onRedo: () => void;
  onFactoryReset: () => void;
  onSave: () => void;
  onToggleLock: () => void;
  isLocked: boolean;
  loadedAssets?: LoadedAssetData;
}

const THUMB_ZOOM = 2;

const DEFAULT_FURNITURE_COLOR: ColorValue = { h: 0, s: 0, b: 0, c: 0 };

export function EditorToolbar({
  activeTool,
  selectedTileType,
  selectedFurnitureType,
  selectedFurnitureUid,
  selectedFurnitureColor,
  floorColor,
  wallColor,
  onToolChange,
  onTileTypeChange,
  onFloorColorChange,
  onSelectedFurnitureColorChange,
  onFurnitureTypeChange,
  onUndo,
  onRedo,
  onFactoryReset,
  onSave,
  onToggleLock,
  isLocked,
  loadedAssets,
}: EditorToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('desks');
  const [showColor, setShowColor] = useState(false);
  const [showFurnitureColor, setShowFurnitureColor] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastMainTool, setLastMainTool] = useState<EditTool>(activeTool);

  // Update lastMainTool whenever a main tool is selected
  useEffect(() => {
    if (activeTool !== EditTool.EYEDROPPER && activeTool !== lastMainTool) {
      setLastMainTool(activeTool);
    }
  }, [activeTool, lastMainTool]);

  // Build dynamic catalog from loaded assets
  useEffect(() => {
    if (loadedAssets) {
      try {
        buildDynamicCatalog(loadedAssets);
        const activeCategories = getActiveCategories();
        if (activeCategories.length > 0) {
          const firstCat = activeCategories[0]?.id;
          if (firstCat && activeCategory !== firstCat) {
            setActiveCategory(firstCat);
          }
        }
      } catch (err) {
        console.error(`[EditorToolbar] Error building dynamic catalog:`, err);
      }
    }
  }, [loadedAssets]);

  // For selected furniture: use existing color or default
  const effectiveColor = selectedFurnitureColor ?? DEFAULT_FURNITURE_COLOR;
  const categoryItems = getCatalogByCategory(activeCategory);
  const patternCount = getFloorPatternCount();
  const floorPatterns = Array.from({ length: patternCount }, (_, i) => i + 1);
  const thumbSize = 42;

  const isEyedropper = activeTool === EditTool.EYEDROPPER;
  const effectiveTool = isEyedropper ? lastMainTool : activeTool;

  const isFloorActive = effectiveTool === EditTool.TILE_PAINT;
  const isWallActive = effectiveTool === EditTool.WALL_PAINT;
  const isFurnitureActive = effectiveTool === EditTool.FURNITURE_PLACE || effectiveTool === EditTool.FURNITURE_PICK;

  return (
    <div className="absolute bottom-76 left-10 z-10 pixel-panel p-4 flex flex-col-reverse gap-4 max-w-[calc(100vw-20px)]">
      {/* Tool row — at the bottom */}
      <div className="flex gap-4 flex-wrap">
        <Button
          variant={isFurnitureActive ? 'active' : 'default'}
          size="md"
          onClick={() => onToolChange(EditTool.FURNITURE_PLACE)}
          title="Place furniture"
        >
          Furniture
        </Button>
        <Button
          variant={isFloorActive ? 'active' : 'default'}
          size="md"
          onClick={() => onToolChange(EditTool.TILE_PAINT)}
          title="Paint floor tiles"
        >
          Floor
        </Button>
        <Button
          variant={isWallActive ? 'active' : 'default'}
          size="md"
          onClick={() => onToolChange(EditTool.WALL_PAINT)}
          title="Paint walls"
        >
          Wall
        </Button>
        <Button
          variant={activeTool === EditTool.ERASE ? 'active' : 'default'}
          size="md"
          onClick={() => onToolChange(EditTool.ERASE)}
          title="Erase"
        >
          Erase
        </Button>
      </div>

      {/* Sub-panel: Floor tiles */}
      {isFloorActive && (
        <div className="flex flex-col-reverse gap-4">
          <div className="flex gap-4 items-center">
            <Button
              variant={floorColor.s === 0 && floorColor.b === -40 ? 'active' : 'default'}
              size="sm"
              onClick={() => { setShowColor(false); onFloorColorChange({ h: 210, s: 0, b: -40, c: 0, colorize: true }); }}
            >
              Dark Gray
            </Button>
            <Button
              variant={showColor ? 'active' : 'ghost'}
              size="sm"
              onClick={() => setShowColor((v) => !v)}
            >
              Custom
            </Button>
            <Button
              variant={isEyedropper ? 'active' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(EditTool.EYEDROPPER)}
            >
              Pick
            </Button>
          </div>
          {showColor && <ColorPicker value={floorColor} onChange={onFloorColorChange} colorize />}
          <div className="carousel">
            {floorPatterns.map((patIdx) => (
              <ItemSelect
                key={patIdx}
                width={32}
                height={32}
                title={`Pattern ${patIdx}`}
                selected={selectedTileType === patIdx}
                onClick={() => onTileTypeChange(patIdx as TileTypeVal)}
                deps={[patIdx, floorColor]}
                draw={(ctx, w, h) => {
                  if (!hasFloorSprites()) {
                    ctx.fillStyle = CANVAS_FALLBACK_TILE_COLOR;
                    ctx.fillRect(0, 0, w, h);
                    return;
                  }
                  const sprite = getColorizedFloorSprite(patIdx, floorColor);
                  ctx.drawImage(getCachedSprite(sprite, THUMB_ZOOM), 0, 0);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sub-panel: Wall */}
      {isWallActive && (
        <div className="flex flex-col-reverse gap-4">
          <div className="flex gap-4 items-center">
            <Button
              variant={isEyedropper ? 'active' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(EditTool.EYEDROPPER)}
            >
              Pick Existing Tile
            </Button>
          </div>

          <div className="text-xs font-semibold text-slate-400">Modular Wall (3-Tile System)</div>
          <div className="flex gap-2 py-2">
            <ItemSelect
              width={32}
              height={32}
              title="Top (White)"
              selected={selectedTileType === TileType.WALL_TILE_FLAT}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_FLAT as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Middle (Transition)"
              selected={selectedTileType === TileType.WALL_TILE_MODULAR_TRANSITION}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_MODULAR_TRANSITION as TileTypeVal)}
              deps={[selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 8);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(8, 16, 16, 1);
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 17, 16, 7);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Base (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_FLAT_BASE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_FLAT_BASE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Inverted Transition"
              selected={selectedTileType === TileType.WALL_TILE_MODULAR_INVERTED}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_MODULAR_INVERTED as TileTypeVal)}
              deps={[selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 8);
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 16, 16, 8);
              }}
            />
          </div>

          <div className="text-xs font-semibold text-slate-400">Panelled Wall (with Borders)</div>
          <div className="flex gap-2 py-2">
            <ItemSelect
              width={32}
              height={32}
              title="Panel (White)"
              selected={selectedTileType === TileType.WALL_TILE_PANEL_WHITE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_PANEL_WHITE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16); // Left
                ctx.fillRect(23, 8, 1, 16); // Right
                ctx.fillRect(8, 23, 16, 1); // Bottom
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Panel Transition"
              selected={selectedTileType === TileType.WALL_TILE_PANEL_TRANSITION}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_PANEL_TRANSITION as TileTypeVal)}
              deps={[selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 8);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 16, 16, 1);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(8, 17, 16, 7);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16); // Left
                ctx.fillRect(23, 8, 1, 16); // Right
                ctx.fillRect(8, 23, 16, 1); // Bottom
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Panel (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_PANEL_BASE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_PANEL_BASE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(8, 8, 1, 16); // Left
                ctx.fillRect(23, 8, 1, 16); // Right
                ctx.fillRect(8, 23, 16, 1); // Bottom
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Panel Inverted"
              selected={selectedTileType === TileType.WALL_TILE_PANEL_INVERTED}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_PANEL_INVERTED as TileTypeVal)}
              deps={[selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 8);
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 16, 16, 8);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16); // Left
                ctx.fillRect(23, 8, 1, 16); // Right
                ctx.fillRect(8, 23, 16, 1); // Bottom
              }}
            />
          </div>

          <div className="text-xs font-semibold text-slate-400">Granular Borders (White & Gray)</div>
          <div className="flex gap-2 py-2">
            <ItemSelect
              width={32}
              height={32}
              title="Bottom Only (White)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_BOTTOM_WHITE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_BOTTOM_WHITE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 23, 16, 1);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Sides Only (White)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_SIDES_WHITE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_SIDES_WHITE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16);
                ctx.fillRect(23, 8, 1, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Bottom Only (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_BOTTOM_GRAY}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_BOTTOM_GRAY as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(8, 23, 16, 1);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Sides Only (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_SIDES_GRAY}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_SIDES_GRAY as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(8, 8, 1, 16);
                ctx.fillRect(23, 8, 1, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Left Only (White)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_LEFT_WHITE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_LEFT_WHITE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Right Only (White)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_RIGHT_WHITE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_RIGHT_WHITE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(23, 8, 1, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="U-Shape (White)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_TOP_SIDES_WHITE}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_TOP_SIDES_WHITE as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16); // Left
                ctx.fillRect(23, 8, 1, 16); // Right
                ctx.fillRect(8, 8, 16, 1); // Top
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Whiteboard Wall"
              selected={selectedTileType === TileType.WALL_TILE_WHITEBOARD}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_WHITEBOARD as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_WHITE;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.strokeRect(8.5, 8.5, 15, 15); // Frame look
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="U-Shape (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_TOP_SIDES_GRAY}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_TOP_SIDES_GRAY as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_BORDER;
                ctx.fillRect(8, 8, 1, 16); // Left
                ctx.fillRect(23, 8, 1, 16); // Right
                ctx.fillRect(8, 8, 16, 1); // Top
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Left Only (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_LEFT_GRAY}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_LEFT_GRAY as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(8, 8, 1, 16);
              }}
            />
            <ItemSelect
              width={32}
              height={32}
              title="Right Only (Gray)"
              selected={selectedTileType === TileType.WALL_TILE_BORDER_RIGHT_GRAY}
              onClick={() => onTileTypeChange(TileType.WALL_TILE_BORDER_RIGHT_GRAY as TileTypeVal)}
              deps={[wallColor, selectedTileType]}
              draw={(ctx) => {
                ctx.fillStyle = MODULAR_GRAY;
                ctx.fillRect(8, 8, 16, 16);
                ctx.fillStyle = MODULAR_SHADOW;
                ctx.fillRect(23, 8, 1, 16);
              }}
            />
          </div>
        </div>
      )}

      {/* Sub-panel: Furniture */}
      {isFurnitureActive && (
        <div className="flex flex-col-reverse gap-4">
          <div className="flex gap-4 flex-wrap items-center">
            {getActiveCategories().map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'active' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
            <div className="w-[1px] h-14 bg-white/15 mx-2 shrink-0" />
            <Button
              variant={activeTool === EditTool.FURNITURE_PICK ? 'active' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(EditTool.FURNITURE_PICK)}
            >
              Pick
            </Button>
          </div>
          <div className="carousel">
            {categoryItems.map((entry) => (
              <ItemSelect
                key={entry.type}
                width={thumbSize}
                height={thumbSize}
                selected={selectedFurnitureType === entry.type}
                onClick={() => onFurnitureTypeChange(entry.type)}
                title={entry.label}
                deps={[entry.type, entry.sprite]}
                draw={(ctx, w, h) => {
                  const cached = getCachedSprite(entry.sprite, 2);
                  const scale = Math.min(w / cached.width, h / cached.height) * 0.85;
                  const dw = cached.width * scale;
                  const dh = cached.height * scale;
                  ctx.drawImage(cached, (w - dw) / 2, (h - dh) / 2, dw, dh);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected furniture color panel */}
      {selectedFurnitureUid && (
        <div className="flex flex-col-reverse gap-4">
          <div className="flex gap-4 items-center">
            <Button
              variant={showFurnitureColor ? 'active' : 'default'}
              size="sm"
              onClick={() => setShowFurnitureColor((v) => !v)}
            >
              Color
            </Button>
            {selectedFurnitureColor && (
              <Button variant="ghost" size="sm" onClick={() => onSelectedFurnitureColorChange(null)}>
                Clear
              </Button>
            )}
          </div>
          {showFurnitureColor && (
            <ColorPicker value={effectiveColor} onChange={onSelectedFurnitureColorChange} showColorizeToggle />
          )}
        </div>
      )}

      {/* Main bottom tool row (Select, Eyedropper, Erase) */}
      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <Button
            variant={activeTool === EditTool.EYEDROPPER ? 'active' : 'default'}
            size="sm"
            className="flex-1"
            onClick={() => onToolChange(EditTool.EYEDROPPER)}
          >
            Eyedropper
          </Button>
          <Button
            variant={activeTool === EditTool.SELECT ? 'active' : 'default'}
            size="sm"
            className="flex-1"
            onClick={() => onToolChange(EditTool.SELECT)}
          >
            Select
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 px-3 py-2 text-xs font-medium bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            onClick={onUndo}
          >
            Undo
          </button>
          <button
            className="flex-1 px-3 py-2 text-xs font-medium bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            onClick={onRedo}
          >
            Redo
          </button>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 px-3 py-2 text-xs font-medium border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded transition-colors"
            onClick={onFactoryReset}
          >
            Factory Reset
          </button>
          <button
            className={`flex-1 px-3 py-2 text-xs font-medium border rounded transition-all duration-300 ${
              isLocked 
                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' 
                : 'border-slate-500/30 hover:bg-slate-700/30 text-slate-400'
            }`}
            onClick={onToggleLock}
          >
            {isLocked ? '🔓 Unlock' : '🔒 Lock Layout'}
          </button>
          <button
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-all duration-300 ${
              isSaved 
                ? 'bg-emerald-600 text-white scale-95' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            onClick={() => {
              onSave();
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 2000);
            }}
          >
            {isSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

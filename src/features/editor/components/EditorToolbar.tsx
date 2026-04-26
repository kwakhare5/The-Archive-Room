import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import { ColorPicker } from '@/shared/components/ui/ColorPicker';
import { ItemSelect } from '@/shared/components/ui/ItemSelect';
import type { ColorValue } from '@/shared/components/ui/types';
import { 
  CANVAS_FALLBACK_TILE_COLOR, 
  MODULAR_WHITE, 
  MODULAR_GRAY, 
  MODULAR_SHADOW, 
  MODULAR_BORDER 
} from '@/shared/constants/config';

import { getColorizedFloorSprite, getFloorPatternCount, hasFloorSprites } from '@/shared/lib/engine/floorTiles';
import type { FurnitureCategory, LoadedAssetData } from '@/features/spatial/logic/furnitureCatalog';
import {
  buildDynamicCatalog,
  getActiveCategories,
  getCatalogByCategory,
} from '@/features/spatial/logic/furnitureCatalog';
import { getCachedSprite } from '@/shared/lib/engine/sprites/spriteCache';
import { EditTool, TileType } from '@/shared/types/types';
import type { TileType as TileTypeVal } from '@/shared/types/types';
import { Undo2, Redo2, Save, Lock, Unlock, RotateCcw, Pipette, MousePointer2, Eraser, Layers, Box, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';


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

/**
 * 🛠️ Archive Editor Nexus - Original Aesthetic
 */
export function EditorToolbar({
  activeTool,
  selectedTileType,
  selectedFurnitureType,
  selectedFurnitureUid,
  selectedFurnitureColor,
  floorColor,
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

  useEffect(() => {
    if (activeTool !== EditTool.EYEDROPPER && activeTool !== lastMainTool) {
      setLastMainTool(activeTool);
    }
  }, [activeTool, lastMainTool]);

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

  const categoryItems = getCatalogByCategory(activeCategory);
  const floorPatterns = Array.from({ length: getFloorPatternCount() }, (_, i) => i + 1);
  const isEyedropper = activeTool === EditTool.EYEDROPPER;
  const effectiveTool = isEyedropper ? lastMainTool : activeTool;

  const isFloorActive = effectiveTool === EditTool.TILE_PAINT;
  const isWallActive = effectiveTool === EditTool.WALL_PAINT;
  const isFurnitureActive = effectiveTool === EditTool.FURNITURE_PLACE || effectiveTool === EditTool.FURNITURE_PICK;

  return (
    <div className="absolute bottom-36 left-12 z-20 pixel-panel-original pixel-floating p-8 flex flex-col gap-8 max-w-[440px] rounded-none animate-in fade-in slide-in-from-left-4 duration-500 font-mono">
      
      {/* Minimal Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <span className="pixel-text-telemetry whitespace-nowrap">Nexus_Stream</span>
          <span className="pixel-text-telemetry text-[9px] text-text-muted/40 font-mono tracking-[0.2em]">v4.0.2</span>
        </div>
      </div>

      {/* Primary Tool Selection - High-Visibility 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: EditTool.FURNITURE_PLACE, icon: Layout, label: 'Objects', active: isFurnitureActive },
          { id: EditTool.TILE_PAINT, icon: Layers, label: 'Floors', active: isFloorActive },
          { id: EditTool.WALL_PAINT, icon: Box, label: 'Walls', active: isWallActive },
          { id: EditTool.ERASE, icon: Eraser, label: 'Delete', active: activeTool === EditTool.ERASE },
        ].map((tool) => (
          <Button
            key={tool.id}
            variant={tool.active ? "default" : "secondary"}
            onClick={() => onToolChange(tool.id)}
            className={`flex flex-col items-center gap-2 h-auto p-4 border pixel-magnetic rounded-none
              ${tool.active 
                ? 'bg-accent/20 border-accent/40 text-text shadow-sm' 
                : 'pixel-button-secondary'}`}
          >
            <tool.icon className="w-6 h-6" />
            <span className="pixel-text-label whitespace-nowrap">{tool.label}</span>
          </Button>
        ))}
      </div>

      {/* Dynamic Assets / Sub-Menu */}
      <div className="min-h-[100px] py-1 border-t border-border mt-1">
        {isFloorActive && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Select_Pattern</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setShowColor(!showColor)}
                  className={`p-1 rounded border transition-all ${showColor ? 'bg-accent border-accent text-bg' : 'bg-bg-dark/40 border-border text-text-muted/60'}`}
                  title="Toggle Color Picker"
                >
                  <div className="w-3 h-3 rounded-sm border border-black/10" style={{ backgroundColor: `hsl(${floorColor.h}, ${floorColor.s}%, ${floorColor.b + 50}%)` }} />
                </button>
                <button 
                  onClick={() => onToolChange(EditTool.EYEDROPPER)}
                  className={`p-2 rounded border transition-all ${isEyedropper ? 'bg-accent/20 border-accent/40' : 'bg-bg-dark/40 border-border'}`}
                >
                  <Pipette className="w-4 h-4 text-text-muted/60" />
                </button>
              </div>
            </div>
            
            {showColor && (
              <div className="mb-4 animate-in zoom-in-95 duration-200">
                <ColorPicker 
                  value={floorColor} 
                  onChange={onFloorColorChange} 
                  colorize 
                />
              </div>
            )}
            <div className="carousel gap-4 py-2">
              {floorPatterns.map((patIdx) => (
                <ItemSelect
                  key={patIdx}
                  width={48}
                  height={48}
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

        {isFurnitureActive && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-1 no-scrollbar border-b border-border">
              {getActiveCategories().map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap
                    ${activeCategory === cat.id ? 'bg-bg-dark border-border text-text' : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted'}`}
                >
                  {cat.label}
                </button>
              ))}
              <div className="flex-1" />
              {selectedFurnitureUid && (
                <button
                  onClick={() => setShowFurnitureColor(!showFurnitureColor)}
                  className={`px-4 py-2 rounded border transition-all flex items-center justify-center
                    ${showFurnitureColor ? 'bg-accent border-accent text-bg' : 'bg-bg-dark/40 border-border text-text-muted/60'}`}
                  title="Furniture Color"
                >
                  <Pipette className="w-4 h-4" />
                </button>
              )}
            </div>

            {showFurnitureColor && selectedFurnitureUid && (
              <div className="mb-4 animate-in zoom-in-95 duration-200">
                <ColorPicker 
                  value={selectedFurnitureColor || DEFAULT_FURNITURE_COLOR} 
                  onChange={onSelectedFurnitureColorChange} 
                  colorize 
                />
              </div>
            )}
            <div className="carousel gap-4 py-4">
              {categoryItems.map((entry) => (
                <ItemSelect
                  key={entry.type}
                  width={56}
                  height={56}
                  title={entry.type}
                  selected={selectedFurnitureType === entry.type}
                  onClick={() => onFurnitureTypeChange(entry.type)}
                  deps={[entry.type, entry.sprite]}
                  draw={(ctx, w, h) => {
                    const cached = getCachedSprite(entry.sprite, 2);
                    const scale = Math.min(w / cached.width, h / cached.height) * 0.8;
                    const dw = cached.width * scale;
                    const dh = cached.height * scale;
                    ctx.drawImage(cached, (w - dw) / 2, (h - dh) / 2, dw, dh);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Persistence Controls - Hardened Hierarchy */}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={onUndo} 
            title="Undo (Ctrl+Z)"
            className="flex-1 pixel-magnetic rounded-none"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onRedo} 
            title="Redo (Ctrl+Y)"
            className="flex-1 pixel-magnetic rounded-none"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button 
            variant={isLocked ? 'outline' : 'secondary'}
            size="icon"
            onClick={onToggleLock} 
            title={isLocked ? "Unlock Layout" : "Lock Layout"}
            className={cn(
              "flex-1 pixel-magnetic rounded-none",
              isLocked && "bg-accent/20 border-accent/40 text-accent"
            )}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </Button>
        </div>
        
        <Button 
          variant={isSaved ? 'outline' : 'default'}
          onClick={() => { onSave(); setIsSaved(true); setTimeout(() => setIsSaved(false), 2000); }}
          className={cn(
            "w-full h-14 rounded-none text-[14px] transition-all border-2 whitespace-nowrap",
            isSaved 
              ? 'bg-status-success/20 text-status-success border-status-success/40 font-bold uppercase tracking-[0.2em]' 
              : 'pixel-button-primary'
          )}
        >
          {isSaved ? 'WORKSPACE_SYNCED' : 'SAVE_LAYOUT_CHANGES'}
        </Button>
      </div>
    </div>
  );
}





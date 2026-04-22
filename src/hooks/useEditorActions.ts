import { useCallback, useRef, useState } from 'react';

import type { ColorValue } from '@/components/ui/types';
import { LAYOUT_SAVE_DEBOUNCE_MS, ZOOM_MAX, ZOOM_MIN } from '@/lib/engine/constants';
import type { ExpandDirection } from '@/lib/engine/editor/editorActions';
import {
  canPlaceFurniture,
  expandLayout,
  getWallPlacementRow,
  moveFurniture,
  paintTile,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  toggleFurnitureState,
} from '@/lib/engine/editor/editorActions';
import type { EditorState } from '@/lib/engine/editor/editorState';
import type { OfficeState } from '@/lib/engine/engine/officeState';
import {
  getCatalogEntry,
  getRotatedType,
  getToggledType,
} from '@/lib/engine/layout/furnitureCatalog';
import { defaultZoom } from '@/lib/engine/toolUtils';
import type {
  EditTool as EditToolType,
  OfficeLayout,
  PlacedFurniture,
  TileType as TileTypeVal,
} from '@/lib/engine/types';
import { EditTool } from '@/lib/engine/types';
import { TileType } from '@/lib/engine/types';
import { vscode } from '@/lib/engine/vscodeApi';

interface EditorActions {
  isEditMode: boolean;
  editorTick: number;
  isDirty: boolean;
  zoom: number;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  saveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setLastSavedLayout: (layout: OfficeLayout) => void;
  handleOpenClaude: () => void;
  handleToggleEditMode: () => void;
  handleToolChange: (tool: EditToolType) => void;
  handleTileTypeChange: (type: TileTypeVal) => void;
  handleFloorColorChange: (color: ColorValue) => void;
  handleWallColorChange: (color: ColorValue) => void;
  handleWallSetChange: (setIndex: number) => void;
  handleSelectedFurnitureColorChange: (color: ColorValue | null) => void;
  handleFurnitureTypeChange: (type: string) => void; // FurnitureType enum or asset ID
  handleDeleteSelected: () => void;
  handleRotateSelected: () => void;
  handleToggleState: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleReset: () => void;
  handleFactoryReset: () => void;
  handleToggleLock: () => void;
  handleSave: () => void;
  handleZoomChange: (zoom: number) => void;
  handleEditorTileAction: (col: number, row: number) => void;
  handleEditorEraseAction: (col: number, row: number) => void;
  handleEditorSelectionChange: () => void;
  handleDragMove: (uid: string, newCol: number, newRow: number) => void;
}

export function useEditorActions(
  getOfficeState: () => OfficeState,
  editorState: EditorState,
): EditorActions {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editorTick, setEditorTick] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [zoom, setZoom] = useState(defaultZoom);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const lastSavedLayoutRef = useRef<OfficeLayout | null>(null);

  // Called by useExtensionMessages on layoutLoaded to set the initial checkpoint
  const setLastSavedLayout = useCallback((layout: OfficeLayout) => {
    lastSavedLayoutRef.current = structuredClone(layout);
  }, []);

  // Debounced layout save
  const saveLayout = useCallback((layout: OfficeLayout) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      vscode.postMessage({ type: 'saveLayout', layout });
    }, LAYOUT_SAVE_DEBOUNCE_MS);
  }, []);

  // Apply a layout edit: push undo, clear redo, rebuild state, save, mark dirty
  const applyEdit = useCallback(
    (newLayout: OfficeLayout) => {
      const os = getOfficeState();
      if (os.getLayout().isLocked) return;
      editorState.pushUndo(os.getLayout());
      editorState.clearRedo();
      editorState.setDirty(true);
      setIsDirty(true);
      os.rebuildFromLayout(newLayout);
      saveLayout(newLayout);
      setEditorTick((n) => n + 1);
    },
    [getOfficeState, editorState, saveLayout],
  );

  const handleToggleLock = useCallback(() => {
    const os = getOfficeState();
    const layout = os.getLayout();
    const newLayout = { ...layout, isLocked: !layout.isLocked };
    
    // If locking, exit edit mode
    if (newLayout.isLocked) {
      setIsEditMode(false);
      editorState.setIsEditMode(false);
      editorState.clearSelection();
      editorState.clearGhost();
      editorState.clearDrag();
    }

    os.rebuildFromLayout(newLayout);
    vscode.postMessage({ type: 'saveLayout', layout: newLayout });
    setEditorTick((n) => n + 1);
  }, [getOfficeState, editorState]);

  const handleOpenClaude = useCallback(() => {
    vscode.postMessage({ type: 'openClaude' });
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const layout = getOfficeState().getLayout();
      if (layout.isLocked) {
        handleToggleLock(); // Unlock if clicking while locked
        return false;
      }
      const next = !prev;
      editorState.setIsEditMode(next);
      if (next) {
        // Initialize wallColor from existing wall tiles so new walls match
        const os = getOfficeState();
        const layout = os.getLayout();
        if (layout.tileColors) {
          for (let i = 0; i < layout.tiles.length; i++) {
            if (layout.tiles[i] === TileType.WALL && layout.tileColors[i]) {
              editorState.setWallColor({ ...layout.tileColors[i]! });
              break;
            }
          }
        }
      } else {
        editorState.clearSelection();
        editorState.clearGhost();
        editorState.clearDrag();
        wallColorEditActiveRef.current = false;
      }
      return next;
    });
  }, [editorState, getOfficeState, handleToggleLock]);

  // Tool toggle: clicking already-active tool deselects it (returns to SELECT)
  const handleToolChange = useCallback(
    (tool: EditToolType) => {
      if (editorState.activeTool === tool) {
        editorState.setActiveTool(EditTool.SELECT);
      } else {
        editorState.setActiveTool(tool);
      }
      editorState.clearSelection();
      editorState.clearGhost();
      editorState.clearDrag();
      colorEditUidRef.current = null;
      wallColorEditActiveRef.current = false;
      setEditorTick((n) => n + 1);
    },
    [editorState],
  );

  const handleTileTypeChange = useCallback(
    (type: TileTypeVal) => {
      editorState.setSelectedTileType(type);
      setEditorTick((n) => n + 1);
    },
    [editorState],
  );

  const handleFloorColorChange = useCallback(
    (color: ColorValue) => {
      editorState.setFloorColor(color);
      setEditorTick((n) => n + 1);
    },
    [editorState],
  );

  // Track whether we've already pushed undo for the current wall color editing session
  const wallColorEditActiveRef = useRef(false);

  const handleWallColorChange = useCallback(
    (color: ColorValue) => {
      editorState.setWallColor(color);

      // Update all existing wall tiles to the new color
      const os = getOfficeState();
      const layout = os.getLayout();
      const existingColors = layout.tileColors || new Array(layout.tiles.length).fill(null);
      const newColors = [...existingColors];
      let changed = false;
      for (let i = 0; i < layout.tiles.length; i++) {
        if (layout.tiles[i] === TileType.WALL) {
          newColors[i] = { ...color };
          changed = true;
        }
      }
      if (changed) {
        // Push undo only once per editing session (first slider touch)
        if (!wallColorEditActiveRef.current) {
          editorState.pushUndo(layout);
          editorState.clearRedo();
          wallColorEditActiveRef.current = true;
        }
        const newLayout = { ...layout, tileColors: newColors };
        editorState.setDirty(true);
        setIsDirty(true);
        os.rebuildFromLayout(newLayout);
        saveLayout(newLayout);
      }
      setEditorTick((n) => n + 1);
    },
    [editorState, getOfficeState, saveLayout],
  );

  const handleWallSetChange = useCallback(
    (setIndex: number) => {
      editorState.setSelectedWallSet(setIndex);
      setEditorTick((n) => n + 1);
    },
    [editorState],
  );

  // Track which uid we've already pushed undo for during color editing
  // so dragging sliders doesn't create N undo entries
  const colorEditUidRef = useRef<string | null>(null);

  const handleSelectedFurnitureColorChange = useCallback(
    (color: ColorValue | null) => {
      const uid = editorState.selectedFurnitureUid;
      if (!uid) return;
      const os = getOfficeState();
      const layout = os.getLayout();

      // Push undo only once per selection (first slider touch)
      if (colorEditUidRef.current !== uid) {
        editorState.pushUndo(layout);
        editorState.clearRedo();
        colorEditUidRef.current = uid;
      }

      // Update color on the placed furniture item (null removes color)
      const newFurniture = layout.furniture.map((f) =>
        f.uid === uid ? { ...f, color: color ?? undefined } : f,
      );
      const newLayout = { ...layout, furniture: newFurniture };

      editorState.setDirty(true);
      setIsDirty(true);
      os.rebuildFromLayout(newLayout);
      saveLayout(newLayout);
      setEditorTick((n) => n + 1);
    },
    [getOfficeState, editorState, saveLayout],
  );

  const handleFurnitureTypeChange = useCallback(
    (type: string) => {
      // Clicking the same item deselects it (no ghost), stays in furniture mode
      if (editorState.selectedFurnitureType === type) {
        editorState.setSelectedFurnitureType('');
        editorState.clearGhost();
      } else {
        editorState.setSelectedFurnitureType(type);
      }
      setEditorTick((n) => n + 1);
    },
    [editorState],
  );

  const handleDeleteSelected = useCallback(() => {
    const uid = editorState.selectedFurnitureUid;
    if (!uid) return;
    const os = getOfficeState();
    const newLayout = removeFurniture(os.getLayout(), uid);
    if (newLayout !== os.getLayout()) {
      applyEdit(newLayout);
      editorState.clearSelection();
      colorEditUidRef.current = null;
    }
  }, [getOfficeState, editorState, applyEdit]);

  const handleRotateSelected = useCallback(() => {
    // If in furniture placement mode, cycle the selected type through the rotation group
    if (editorState.activeTool === EditTool.FURNITURE_PLACE) {
      const rotated = getRotatedType(editorState.selectedFurnitureType, 'cw');
      if (rotated) {
        editorState.setSelectedFurnitureType(rotated);
        setEditorTick((n) => n + 1);
      }
      return;
    }
    // Otherwise rotate the selected placed furniture
    const uid = editorState.selectedFurnitureUid;
    if (!uid) return;
    const os = getOfficeState();
    const newLayout = rotateFurniture(os.getLayout(), uid, 'cw');
    if (newLayout !== os.getLayout()) {
      applyEdit(newLayout);
    }
  }, [getOfficeState, editorState, applyEdit]);

  const handleToggleState = useCallback(() => {
    // If in furniture placement mode, toggle the selected type's state
    if (editorState.activeTool === EditTool.FURNITURE_PLACE) {
      const toggled = getToggledType(editorState.selectedFurnitureType);
      if (toggled) {
        editorState.setSelectedFurnitureType(toggled);
        setEditorTick((n) => n + 1);
      }
      return;
    }
    // Otherwise toggle the selected placed furniture's state
    const uid = editorState.selectedFurnitureUid;
    if (!uid) return;
    const os = getOfficeState();
    const newLayout = toggleFurnitureState(os.getLayout(), uid);
    if (newLayout !== os.getLayout()) {
      applyEdit(newLayout);
    }
  }, [getOfficeState, editorState, applyEdit]);

  const handleUndo = useCallback(() => {
    const prev = editorState.popUndo();
    if (!prev) return;
    const os = getOfficeState();
    // Push current layout to redo stack before restoring
    editorState.pushRedo(os.getLayout());
    os.rebuildFromLayout(prev);
    saveLayout(prev);
    editorState.setDirty(true);
    setIsDirty(true);
    setEditorTick((n) => n + 1);
  }, [getOfficeState, editorState, saveLayout]);

  const handleRedo = useCallback(() => {
    const next = editorState.popRedo();
    if (!next) return;
    const os = getOfficeState();
    // Push current layout to undo stack before restoring
    editorState.pushUndo(os.getLayout());
    os.rebuildFromLayout(next);
    saveLayout(next);
    editorState.setDirty(true);
    setIsDirty(true);
    setEditorTick((n) => n + 1);
  }, [getOfficeState, editorState, saveLayout]);

  const handleReset = useCallback(() => {
    if (!lastSavedLayoutRef.current) return;
    const saved = structuredClone(lastSavedLayoutRef.current);
    applyEdit(saved);
    editorState.reset();
    setIsDirty(false);
  }, [editorState, applyEdit]);

  const handleFactoryReset = useCallback(() => {
    if (window.confirm('Reset everything and reload default layout?')) {
      localStorage.removeItem('office-layout');
      window.location.reload();
    }
  }, []);

  const handleSave = useCallback(() => {
    // Flush any pending debounced save immediately
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const os = getOfficeState();
    const layout = os.getLayout();
    lastSavedLayoutRef.current = structuredClone(layout);
    vscode.postMessage({ type: 'saveLayout', layout });
    editorState.setDirty(false);
    setIsDirty(false);
  }, [getOfficeState, editorState]);

  // Notify React that imperative editor selection changed (e.g., from OfficeCanvas mouseUp)
  const handleEditorSelectionChange = useCallback(() => {
    colorEditUidRef.current = null;
    setEditorTick((n) => n + 1);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom)));
  }, []);

  const handleDragMove = useCallback(
    (uid: string, newCol: number, newRow: number) => {
      const os = getOfficeState();
      const layout = os.getLayout();
      const newLayout = moveFurniture(layout, uid, newCol, newRow);
      if (newLayout !== layout) {
        applyEdit(newLayout);
      }
    },
    [getOfficeState, applyEdit],
  );

  /**
   * Expand layout if click is on a ghost border tile (outside current bounds).
   * Returns the expanded layout and adjusted col/row, or null if no expansion needed.
   */
  const maybeExpand = useCallback(
    (
      layout: OfficeLayout,
      col: number,
      row: number,
    ): {
      layout: OfficeLayout;
      col: number;
      row: number;
      shift: { col: number; row: number };
    } | null => {
      if (col >= 0 && col < layout.cols && row >= 0 && row < layout.rows) return null;

      // Determine which directions to expand
      const directions: ExpandDirection[] = [];
      if (col < 0) directions.push('left');
      if (col >= layout.cols) directions.push('right');
      if (row < 0) directions.push('up');
      if (row >= layout.rows) directions.push('down');

      let current = layout;
      let totalShiftCol = 0;
      let totalShiftRow = 0;
      for (const dir of directions) {
        const result = expandLayout(current, dir);
        if (!result) return null; // exceeded max
        current = result.layout;
        totalShiftCol += result.shift.col;
        totalShiftRow += result.shift.row;
      }

      return {
        layout: current,
        col: col + totalShiftCol,
        row: row + totalShiftRow,
        shift: { col: totalShiftCol, row: totalShiftRow },
      };
    },
    [],
  );

  const handleEditorTileAction = useCallback(
    (col: number, row: number) => {
      const os = getOfficeState();
      let layout = os.getLayout();
      let effectiveCol = col;
      let effectiveRow = row;

      // Handle ghost border expansion for floor/wall tools
      if (
        editorState.activeTool === EditTool.TILE_PAINT ||
        editorState.activeTool === EditTool.WALL_PAINT
      ) {
        const expansion = maybeExpand(layout, col, row);
        if (expansion) {
          layout = expansion.layout;
          effectiveCol = expansion.col;
          effectiveRow = expansion.row;
          // Rebuild from expanded layout first, shifting character positions
          os.rebuildFromLayout(layout, expansion.shift);
        }
      }

      if (editorState.activeTool === EditTool.TILE_PAINT) {
        const newLayout = paintTile(
          layout,
          effectiveCol,
          effectiveRow,
          editorState.selectedTileType,
          editorState.floorColor,
        );
        if (newLayout !== layout) {
          applyEdit(newLayout);
        }
      } else if (editorState.activeTool === EditTool.WALL_PAINT) {
        const idx = effectiveRow * layout.cols + effectiveCol;
        const isWall = layout.tiles[idx] === TileType.WALL;

        // First tile of drag sets direction
        if (editorState.wallDragAdding === null) {
          editorState.setWallDragAdding(!isWall);
        }

        if (editorState.wallDragAdding) {
          // Add wall with color. Use selected manual piece if one is picked, otherwise standard auto-wall.
          const wallToPaint = (editorState.selectedTileType === TileType.WALL || 
                               (editorState.selectedTileType >= TileType.WALL_TILE_BOTTOM_START && 
                                editorState.selectedTileType <= TileType.WALL_TILE_BOTTOM_END) ||
                               (editorState.selectedTileType >= TileType.WALL_TILE_TOP_START && 
                                editorState.selectedTileType <= TileType.WALL_TILE_TOP_END))
                                ? editorState.selectedTileType : TileType.WALL;
          
          const newLayout = paintTile(
            layout,
            effectiveCol,
            effectiveRow,
            wallToPaint,
            editorState.wallColor,
          );
          if (newLayout !== layout) {
            applyEdit(newLayout);
          }
        } else {
          // Remove wall → paint floor with current floor settings
          if (isWall) {
            const newLayout = paintTile(
              layout,
              effectiveCol,
              effectiveRow,
              editorState.selectedTileType,
              editorState.floorColor,
            );
            if (newLayout !== layout) {
              applyEdit(newLayout);
            }
          }
        }
      } else if (editorState.activeTool === EditTool.ERASE) {
        if (col < 0 || col >= layout.cols || row < 0 || row >= layout.rows) return;

        // LAYER 1: Check for furniture first (Eraser hits top layer)
        const hit = layout.furniture.find((f) => {
          const entry = getCatalogEntry(f.type);
          if (!entry) return false;
          return (
            col >= f.col &&
            col < f.col + entry.footprintW &&
            row >= f.row &&
            row < f.row + entry.footprintH
          );
        });

        if (hit) {
          // Only erase the furniture, leave the tile alone
          const newLayout = removeFurniture(layout, hit.uid);
          if (newLayout !== layout) {
            applyEdit(newLayout);
          }
          return;
        }

        // LAYER 0: If no furniture, erase the tile underneath
        const idx = row * layout.cols + col;
        if (layout.tiles[idx] === TileType.VOID) return;
        const newLayout = paintTile(layout, col, row, TileType.VOID);
        if (newLayout !== layout) {
          applyEdit(newLayout);
        }
      } else if (editorState.activeTool === EditTool.FURNITURE_PLACE) {
        const type = editorState.selectedFurnitureType;
        if (type === '') {
          // No item selected — act like SELECT (find furniture hit)
          const hit = layout.furniture.find((f) => {
            const entry = getCatalogEntry(f.type);
            if (!entry) return false;
            return (
              col >= f.col &&
              col < f.col + entry.footprintW &&
              row >= f.row &&
              row < f.row + entry.footprintH
            );
          });
          editorState.selectedFurnitureUid = hit ? hit.uid : null;
          setEditorTick((n) => n + 1);
        } else {
          const placementRow = getWallPlacementRow(type, row);
          if (!canPlaceFurniture(layout, type, col, placementRow)) return;
          const uid = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const placed: PlacedFurniture = { uid, type, col, row: placementRow };
          if (editorState.pickedFurnitureColor) {
            placed.color = { ...editorState.pickedFurnitureColor };
          }
          const newLayout = placeFurniture(layout, placed);
          if (newLayout !== layout) {
            applyEdit(newLayout);
          }
        }
      } else if (editorState.activeTool === EditTool.FURNITURE_PICK) {
        // Find furniture at clicked tile, copy its type and color for placement
        const hit = layout.furniture.find((f) => {
          const entry = getCatalogEntry(f.type);
          if (!entry) return false;
          return (
            col >= f.col &&
            col < f.col + entry.footprintW &&
            row >= f.row &&
            row < f.row + entry.footprintH
          );
        });
        if (hit) {
          editorState.setSelectedFurnitureType(hit.type);
          editorState.setPickedFurnitureColor(hit.color ? { ...hit.color } : null);
          editorState.setActiveTool(EditTool.FURNITURE_PLACE);
        }
        setEditorTick((n) => n + 1);
      } else if (editorState.activeTool === EditTool.EYEDROPPER) {
        const idx = row * layout.cols + col;
        const tile = layout.tiles[idx];
        const isWall = tile === TileType.WALL || 
                       (tile >= TileType.WALL_TILE_BOTTOM_START && tile <= TileType.WALL_TILE_BOTTOM_END) ||
                       (tile >= TileType.WALL_TILE_TOP_START && tile <= TileType.WALL_TILE_TOP_END) ||
                       (tile >= TileType.WALL_TILE_HALF_BOTTOM && tile <= TileType.WALL_TILE_HALF_RIGHT) ||
                       tile === TileType.WALL_TILE_FLAT ||
                       tile === TileType.WALL_TILE_MODULAR_TRANSITION ||
                       tile === TileType.WALL_TILE_FLAT_BASE ||
                       tile === TileType.WALL_TILE_MODULAR_INVERTED ||
                       (tile >= TileType.WALL_TILE_PANEL_WHITE && tile <= TileType.WALL_TILE_PANEL_INVERTED) ||
                       (tile >= TileType.WALL_TILE_BORDER_BOTTOM_WHITE && tile <= TileType.WALL_TILE_BORDER_RIGHT_GRAY);

        if (isWall) {
          // Pick specific wall piece/color and switch to wall tool
          editorState.setSelectedTileType(tile);
          const color = layout.tileColors?.[idx];
          if (color) {
            editorState.setWallColor({ ...color });
          }
          editorState.setActiveTool(EditTool.WALL_PAINT);
        } else if (tile !== undefined && tile !== TileType.VOID) {
          // Pick floor type/color and switch to floor tool
          editorState.setSelectedTileType(tile);
          const color = layout.tileColors?.[idx];
          if (color) {
            editorState.setFloorColor({ ...color });
          }
          editorState.setActiveTool(EditTool.TILE_PAINT);
        }
        setEditorTick((n) => n + 1);
      } else if (editorState.activeTool === EditTool.SELECT) {
        const hit = layout.furniture.find((f) => {
          const entry = getCatalogEntry(f.type);
          if (!entry) return false;
          return (
            col >= f.col &&
            col < f.col + entry.footprintW &&
            row >= f.row &&
            row < f.row + entry.footprintH
          );
        });
        editorState.selectedFurnitureUid = hit ? hit.uid : null;
        setEditorTick((n) => n + 1);
      }
    },
    [getOfficeState, editorState, applyEdit, maybeExpand],
  );

  const handleEditorEraseAction = useCallback(
    (col: number, row: number) => {
      const os = getOfficeState();
      const layout = os.getLayout();
      if (col < 0 || col >= layout.cols || row < 0 || row >= layout.rows) return;

      // LAYER 1: Check for furniture first (Eraser hits top layer)
      const hit = layout.furniture.find((f) => {
        const entry = getCatalogEntry(f.type);
        if (!entry) return false;
        return (
          col >= f.col &&
          col < f.col + entry.footprintW &&
          row >= f.row &&
          row < f.row + entry.footprintH
        );
      });

      if (hit) {
        // Only erase the furniture, leave the tile alone
        const newLayout = removeFurniture(layout, hit.uid);
        if (newLayout !== layout) {
          applyEdit(newLayout);
        }
        return;
      }

      // LAYER 0: If no furniture, erase the tile underneath
      const idx = row * layout.cols + col;
      if (layout.tiles[idx] === TileType.VOID) return;
      const newLayout = paintTile(layout, col, row, TileType.VOID);
      if (newLayout !== layout) {
        applyEdit(newLayout);
      }
    },
    [getOfficeState, applyEdit],
  );


  return {
    isEditMode,
    editorTick,
    isDirty,
    zoom,
    panRef,
    saveTimerRef,
    setLastSavedLayout,
    handleOpenClaude,
    handleToggleEditMode,
    handleToolChange,
    handleTileTypeChange,
    handleFloorColorChange,
    handleWallColorChange,
    handleWallSetChange,
    handleSelectedFurnitureColorChange,
    handleFurnitureTypeChange,
    handleDeleteSelected,
    handleRotateSelected,
    handleToggleState,
    handleUndo,
    handleRedo,
    handleReset,
    handleFactoryReset,
    handleToggleLock,
    handleSave,
    handleZoomChange,
    handleEditorTileAction,
    handleEditorEraseAction,
    handleEditorSelectionChange,
    handleDragMove,
  };
}

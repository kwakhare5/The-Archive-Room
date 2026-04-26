"use no memo";
import { useCallback, useEffect, useRef } from 'react';

import {
  CAMERA_FOLLOW_LERP,
  CAMERA_FOLLOW_SNAP_THRESHOLD,
  PAN_MARGIN_FRACTION,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_SCROLL_THRESHOLD,
} from '@/shared/constants/config';
import { unlockAudio } from '@/shared/lib/engine/notificationSound';
import { vscode } from '@/shared/lib/apiBridge';
import { canPlaceFurniture, getWallPlacementRow } from '@/features/editor/logic/editorActions';
import type { EditorState } from '@/features/editor/logic/editorState';
import { startGameLoop } from '@/features/spatial/logic/gameLoop';
import type { ArchiveEngine } from '@/features/spatial/logic/ArchiveEngine';
import type {
  DeleteButtonBounds,
  EditorRenderState,
  RotateButtonBounds,
  SelectionRenderState,
} from '@/features/spatial/logic/renderer';
import { renderFrame } from '@/features/spatial/logic/renderer';
import { hasFloorSprites } from '@/shared/lib/engine/floorTiles';
import { getCatalogEntry, isCatalogReady, isRotatable } from '@/features/spatial/logic/furnitureCatalog';
import { getDPR } from '@/shared/lib/engine/agentToolParser';
import { EditTool, TILE_SIZE } from '@/shared/types/types';
import { hasWallSprites } from '@/shared/lib/engine/wallTiles';

interface NexusCanvasProps {
  archiveEngine: ArchiveEngine;
  onClick: (agentId: number) => void;
  isEditMode: boolean;
  editorState: EditorState;
  onEditorTileAction: (col: number, row: number) => void;
  onEditorEraseAction: (col: number, row: number) => void;
  onEditorSelectionChange: () => void;
  onDeleteSelected: () => void;
  onRotateSelected: () => void;
  onDragMove: (uid: string, newCol: number, newRow: number) => void;
  editorTick: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  assetsLoaded: boolean;
  onFurnitureSelect: (uid: string, name: string) => void;
}

export function NexusCanvas({
  archiveEngine,
  onClick,
  isEditMode,
  editorState,
  onEditorTileAction,
  onEditorEraseAction,
  onEditorSelectionChange,
  onDeleteSelected,
  onRotateSelected,
  onDragMove,
  editorTick: _editorTick,
  zoom,
  onZoomChange,
  panRef,
  assetsLoaded,
  onFurnitureSelect,
}: NexusCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  // Middle-mouse pan state (imperative, no re-renders)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  // Delete/rotate button bounds (updated each frame by renderer)
  const deleteButtonBoundsRef = useRef<DeleteButtonBounds | null>(null);
  const rotateButtonBoundsRef = useRef<RotateButtonBounds | null>(null);
  // Right-click erase dragging
  const isEraseDraggingRef = useRef(false);
  // Zoom scroll accumulator for trackpad pinch sensitivity
  const zoomAccumulatorRef = useRef(0);

  // Clamp pan so the map edge can't go past a margin inside the viewport
  const clampPan = useCallback(
    (px: number, py: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: px, y: py };
      const layout = archiveEngine.getLayout();
      const mapW = layout.cols * TILE_SIZE * zoom;
      const mapH = layout.rows * TILE_SIZE * zoom;
      const marginX = canvas.width * PAN_MARGIN_FRACTION;
      const marginY = canvas.height * PAN_MARGIN_FRACTION;
      const maxPanX = mapW / 2 + canvas.width / 2 - marginX;
      const maxPanY = mapH / 2 + canvas.height / 2 - marginY;
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, px)),
        y: Math.max(-maxPanY, Math.min(maxPanY, py)),
      };
    },
    [archiveEngine, zoom],
  );

  // Resize canvas backing store to device pixels (no DPR transform on ctx)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = getDPR();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    // No ctx.scale(dpr) — we render directly in device pixels
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        archiveEngine.update(dt);
      },
      render: (ctx) => {
        // Canvas dimensions are in device pixels
        const w = canvas.width;
        const h = canvas.height;

        // Build editor render state
        let editorRender: EditorRenderState | undefined;
        if (isEditMode) {
          const showGhostBorder =
            editorState.activeTool === EditTool.TILE_PAINT ||
            editorState.activeTool === EditTool.WALL_PAINT ||
            editorState.activeTool === EditTool.ERASE;
          editorRender = {
            showGrid: true,
            ghostSprite: null,
            ghostMirrored: false,
            ghostCol: editorState.ghostCol,
            ghostRow: editorState.ghostRow,
            ghostValid: editorState.ghostValid,
            selectedCol: 0,
            selectedRow: 0,
            selectedW: 0,
            selectedH: 0,
            hasSelection: false,
            isRotatable: false,
            deleteButtonBounds: null,
            rotateButtonBounds: null,
            showGhostBorder,
            ghostBorderHoverCol: showGhostBorder ? editorState.ghostCol : -999,
            ghostBorderHoverRow: showGhostBorder ? editorState.ghostRow : -999,
            selectedWallSet: 0,
          };

          // Ghost preview for furniture placement
          if (editorState.activeTool === EditTool.FURNITURE_PLACE && editorState.ghostCol >= 0) {
            const entry = getCatalogEntry(editorState.selectedFurnitureType);
            if (entry) {
              const placementRow = getWallPlacementRow(
                editorState.selectedFurnitureType,
                editorState.ghostRow,
              );
              editorRender.ghostSprite = entry.sprite;
              editorRender.ghostRow = placementRow;
              editorRender.ghostMirrored =
                !!entry.mirrorSide && editorState.selectedFurnitureType.endsWith(':left');
              editorRender.ghostValid = canPlaceFurniture(
                archiveEngine.getLayout(),
                editorState.selectedFurnitureType,
                editorState.ghostCol,
                placementRow,
              );
            }
          }

          // Ghost preview for drag-to-move
          if (editorState.isDragMoving && editorState.dragUid && editorState.ghostCol >= 0) {
            const draggedItem = archiveEngine
              .getLayout()
              .furniture.find((f) => f.uid === editorState.dragUid);
            if (draggedItem) {
              const entry = getCatalogEntry(draggedItem.type);
              if (entry) {
                const ghostCol = editorState.ghostCol - editorState.dragOffsetCol;
                const ghostRow = editorState.ghostRow - editorState.dragOffsetRow;
                editorRender.ghostSprite = entry.sprite;
                editorRender.ghostCol = ghostCol;
                editorRender.ghostRow = ghostRow;
                editorRender.ghostMirrored =
                  !!entry.mirrorSide && draggedItem.type.endsWith(':left');
                editorRender.ghostValid = canPlaceFurniture(
                  archiveEngine.getLayout(),
                  draggedItem.type,
                  ghostCol,
                  ghostRow,
                  editorState.dragUid,
                );
              }
            }
          }

          // Selection highlight
          if (editorState.selectedFurnitureUid && !editorState.isDragMoving) {
            const item = archiveEngine
              .getLayout()
              .furniture.find((f) => f.uid === editorState.selectedFurnitureUid);
            if (item) {
              const entry = getCatalogEntry(item.type);
              if (entry) {
                editorRender.hasSelection = true;
                editorRender.selectedCol = item.col;
                editorRender.selectedRow = item.row;
                editorRender.selectedW = entry.footprintW;
                editorRender.selectedH = entry.footprintH;
                editorRender.isRotatable = isRotatable(item.type);
              }
            }
          }
        }

        // Camera follow: smoothly center on followed agent
        if (archiveEngine.cameraFollowId !== null) {
          const followCh = archiveEngine.characters.get(archiveEngine.cameraFollowId);
          if (followCh) {
            const layout = archiveEngine.getLayout();
            const mapW = layout.cols * TILE_SIZE * zoom;
            const mapH = layout.rows * TILE_SIZE * zoom;
            const targetX = mapW / 2 - followCh.x * zoom;
            const targetY = mapH / 2 - followCh.y * zoom;
            const dx = targetX - panRef.current.x;
            const dy = targetY - panRef.current.y;
            if (
              Math.abs(dx) < CAMERA_FOLLOW_SNAP_THRESHOLD &&
              Math.abs(dy) < CAMERA_FOLLOW_SNAP_THRESHOLD
            ) {
              panRef.current = { x: targetX, y: targetY };
            } else {
              panRef.current = {
                x: panRef.current.x + dx * CAMERA_FOLLOW_LERP,
                y: panRef.current.y + dy * CAMERA_FOLLOW_LERP,
              };
            }
          }
        }

        // Build selection render state
        const selectionRender: SelectionRenderState = {
          selectedAgentId: archiveEngine.selectedAgentId,
          hoveredAgentId: archiveEngine.hoveredAgentId,
          hoveredTile: archiveEngine.hoveredTile,
          seats: archiveEngine.seats,
          characters: archiveEngine.characters,
        };

        const { offsetX, offsetY } = renderFrame(
          ctx,
          w,
          h,
          archiveEngine.tileMap,
          archiveEngine.furniture,
          archiveEngine.getCharacters(),
          zoom,
          panRef.current.x,
          panRef.current.y,
          selectionRender,
          editorRender,
          archiveEngine.getLayout().tileColors,
          archiveEngine.getLayout().cols,
          archiveEngine.getLayout().rows,
          archiveEngine.getLayout().furniture,
        );
        offsetRef.current = { x: offsetX, y: offsetY };

        // Store delete/rotate button bounds for hit-testing
        deleteButtonBoundsRef.current = editorRender?.deleteButtonBounds ?? null;
        rotateButtonBoundsRef.current = editorRender?.rotateButtonBounds ?? null;
      },
    });

    return () => {
      stop();
      observer.disconnect();
    };
  }, [archiveEngine, resizeCanvas, isEditMode, editorState, _editorTick, zoom, panRef]);

  // Convert CSS mouse coords to world (sprite pixel) coords
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const dpr = getDPR();
      // CSS coords relative to canvas
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
      // Convert to device pixels
      const deviceX = cssX * dpr;
      const deviceY = cssY * dpr;
      // Convert to world (sprite pixel) coords
      const worldX = (deviceX - offsetRef.current.x) / zoom;
      const worldY = (deviceY - offsetRef.current.y) / zoom;
      return { worldX, worldY, screenX: cssX, screenY: cssY, deviceX, deviceY };
    },
    [zoom],
  );

  const screenToTile = useCallback(
    (clientX: number, clientY: number): { col: number; row: number } | null => {
      const pos = screenToWorld(clientX, clientY);
      if (!pos) return null;
      const col = Math.floor(pos.worldX / TILE_SIZE);
      const row = Math.floor(pos.worldY / TILE_SIZE);
      const layout = archiveEngine.getLayout();
      // In edit mode with floor/wall/erase tool, extend valid range by 1 for ghost border
      if (
        isEditMode &&
        (editorState.activeTool === EditTool.TILE_PAINT ||
          editorState.activeTool === EditTool.WALL_PAINT ||
          editorState.activeTool === EditTool.ERASE)
      ) {
        if (col < -1 || col > layout.cols || row < -1 || row > layout.rows) return null;
        return { col, row };
      }
      if (col < 0 || col >= layout.cols || row < 0 || row >= layout.rows) return null;
      return { col, row };
    },
    [screenToWorld, archiveEngine, isEditMode, editorState],
  );

  // Check if device-pixel coords hit the delete button
  const hitTestDeleteButton = useCallback((deviceX: number, deviceY: number): boolean => {
    const bounds = deleteButtonBoundsRef.current;
    if (!bounds) return false;
    const dx = deviceX - bounds.cx;
    const dy = deviceY - bounds.cy;
    return dx * dx + dy * dy <= (bounds.radius + 2) * (bounds.radius + 2); // small padding
  }, []);

  // Check if device-pixel coords hit the rotate button
  const hitTestRotateButton = useCallback((deviceX: number, deviceY: number): boolean => {
    const bounds = rotateButtonBoundsRef.current;
    if (!bounds) return false;
    const dx = deviceX - bounds.cx;
    const dy = deviceY - bounds.cy;
    return dx * dx + dy * dy <= (bounds.radius + 2) * (bounds.radius + 2);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Handle middle-mouse panning
      if (isPanningRef.current) {
        const dpr = getDPR();
        const dx = (e.clientX - panStartRef.current.mouseX) * dpr;
        const dy = (e.clientY - panStartRef.current.mouseY) * dpr;
        panRef.current = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
        return;
      }

      if (isEditMode) {
        const tile = screenToTile(e.clientX, e.clientY);
        if (tile) {
          editorState.setGhostPosition(tile.col, tile.row);

          // Drag-to-move: check if cursor moved to different tile
          if (editorState.dragUid && !editorState.isDragMoving) {
            if (tile.col !== editorState.dragStartCol || tile.row !== editorState.dragStartRow) {
              editorState.setIsDragMoving(true);
            }
          }

          // Paint on drag (tile/wall/erase paint tool only, not during furniture drag)
          if (
            editorState.isDragging &&
            (editorState.activeTool === EditTool.TILE_PAINT ||
              editorState.activeTool === EditTool.WALL_PAINT ||
              editorState.activeTool === EditTool.ERASE) &&
            !editorState.dragUid
          ) {
            onEditorTileAction(tile.col, tile.row);
          }
          // Right-click erase drag
          if (
            isEraseDraggingRef.current &&
            (editorState.activeTool === EditTool.TILE_PAINT ||
              editorState.activeTool === EditTool.WALL_PAINT ||
              editorState.activeTool === EditTool.ERASE)
          ) {
            const layout = archiveEngine.getLayout();
            if (
              tile.col >= 0 &&
              tile.col < layout.cols &&
              tile.row >= 0 &&
              tile.row < layout.rows
            ) {
              onEditorEraseAction(tile.col, tile.row);
            }
          }
        } else {
          editorState.setGhostPosition(-1, -1);
        }

        // Cursor: show grab during drag, pointer over delete button, crosshair otherwise
        const canvas = canvasRef.current;
        if (canvas) {
          if (editorState.isDragMoving) {
            canvas.style.cursor = 'grabbing';
          } else {
            const pos = screenToWorld(e.clientX, e.clientY);
            if (
              pos &&
              (hitTestDeleteButton(pos.deviceX, pos.deviceY) ||
                hitTestRotateButton(pos.deviceX, pos.deviceY))
            ) {
              canvas.style.cursor = 'pointer';
            } else if (editorState.activeTool === EditTool.FURNITURE_PICK && tile) {
              // Pick mode: show pointer over furniture, crosshair elsewhere
              const layout = archiveEngine.getLayout();
              const hitFurniture = layout.furniture.find((f) => {
                const entry = getCatalogEntry(f.type);
                if (!entry) return false;
                return (
                  tile.col >= f.col &&
                  tile.col < f.col + entry.footprintW &&
                  tile.row >= f.row &&
                  tile.row < f.row + entry.footprintH
                );
              });
              canvas.style.cursor = hitFurniture ? 'pointer' : 'crosshair';
            } else if (
              (editorState.activeTool === EditTool.SELECT ||
                (editorState.activeTool === EditTool.FURNITURE_PLACE &&
                  editorState.selectedFurnitureType === '')) &&
              tile
            ) {
              // Check if hovering over furniture
              const layout = archiveEngine.getLayout();
              const hitFurniture = layout.furniture.find((f) => {
                const entry = getCatalogEntry(f.type);
                if (!entry) return false;
                return (
                  tile.col >= f.col &&
                  tile.col < f.col + entry.footprintW &&
                  tile.row >= f.row &&
                  tile.row < f.row + entry.footprintH
                );
              });
              canvas.style.cursor = hitFurniture ? 'grab' : 'crosshair';
            } else {
              canvas.style.cursor = 'crosshair';
            }
          }
        }
        return;
      }

      const pos = screenToWorld(e.clientX, e.clientY);
      if (!pos) return;
      const hitId = archiveEngine.getCharacterAt(pos.worldX, pos.worldY);
      const tile = screenToTile(e.clientX, e.clientY);
      archiveEngine.setHoveredTile(tile);
      const canvas = canvasRef.current;
      if (canvas) {
        let cursor = 'default';
        if (hitId !== null) {
          cursor = 'pointer';
        } else if (archiveEngine.selectedAgentId !== null && tile) {
          // Check if hovering over a clickable seat (available or own)
          const seatId = archiveEngine.getSeatAtTile(tile.col, tile.row);
          if (seatId) {
            const seat = archiveEngine.seats.get(seatId);
            if (seat) {
              const selectedCh = archiveEngine.characters.get(archiveEngine.selectedAgentId);
              if (!seat.assigned || (selectedCh && selectedCh.seatId === seatId)) {
                cursor = 'pointer';
              }
            }
          }
        }
        canvas.style.cursor = cursor;
      }
      archiveEngine.setHoveredAgentId(hitId);
    },
    [
      archiveEngine,
      screenToWorld,
      screenToTile,
      isEditMode,
      editorState,
      onEditorTileAction,
      onEditorEraseAction,
      panRef,
      hitTestDeleteButton,
      hitTestRotateButton,
      clampPan,
    ],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      unlockAudio();
      // Middle mouse button (button 1) starts panning
      if (e.button === 1) {
        e.preventDefault();
        // Break camera follow on manual pan
        archiveEngine.setCameraFollowId(null);
        isPanningRef.current = true;
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'grabbing';
        return;
      }

      // Right-click in edit mode for erasing
      if (e.button === 2 && isEditMode) {
        const tile = screenToTile(e.clientX, e.clientY);
        if (
          tile &&
          (editorState.activeTool === EditTool.TILE_PAINT ||
            editorState.activeTool === EditTool.WALL_PAINT ||
            editorState.activeTool === EditTool.ERASE)
        ) {
          const layout = archiveEngine.getLayout();
          if (tile.col >= 0 && tile.col < layout.cols && tile.row >= 0 && tile.row < layout.rows) {
            isEraseDraggingRef.current = true;
            onEditorEraseAction(tile.col, tile.row);
          }
        }
        return;
      }

      if (!isEditMode) return;

      // Check rotate/delete button hit first
      const pos = screenToWorld(e.clientX, e.clientY);
      if (pos && hitTestRotateButton(pos.deviceX, pos.deviceY)) {
        onRotateSelected();
        return;
      }
      if (pos && hitTestDeleteButton(pos.deviceX, pos.deviceY)) {
        onDeleteSelected();
        return;
      }

      const tile = screenToTile(e.clientX, e.clientY);

      // SELECT tool (or furniture tool with nothing selected): check for furniture hit to start drag
      const actAsSelect =
        editorState.activeTool === EditTool.SELECT ||
        (editorState.activeTool === EditTool.FURNITURE_PLACE &&
          editorState.selectedFurnitureType === '');
      if (actAsSelect && tile) {
        const layout = archiveEngine.getLayout();
        // Find all furniture at clicked tile, prefer surface items (on top of desks)
        let hitFurniture = null as (typeof layout.furniture)[0] | null;
        for (const f of layout.furniture) {
          const entry = getCatalogEntry(f.type);
          if (!entry) continue;
          if (
            tile.col >= f.col &&
            tile.col < f.col + entry.footprintW &&
            tile.row >= f.row &&
            tile.row < f.row + entry.footprintH
          ) {
            if (!hitFurniture || entry.canPlaceOnSurfaces) hitFurniture = f;
          }
        }
        if (hitFurniture) {
          // Start drag — record offset from furniture's top-left
          editorState.startDrag(
            hitFurniture.uid,
            tile.col,
            tile.row,
            tile.col - hitFurniture.col,
            tile.row - hitFurniture.row,
          );
          return;
        } else {
          // Clicked empty space — deselect
          editorState.clearSelection();
          onEditorSelectionChange();
        }
      }

      // Non-select tools: start paint drag
      editorState.setIsDragging(true);
      if (tile) {
        onEditorTileAction(tile.col, tile.row);
      }
    },
    [
      archiveEngine,
      isEditMode,
      editorState,
      screenToTile,
      screenToWorld,
      onEditorTileAction,
      onEditorEraseAction,
      onEditorSelectionChange,
      onDeleteSelected,
      onRotateSelected,
      hitTestDeleteButton,
      hitTestRotateButton,
      panRef,
    ],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = isEditMode ? 'crosshair' : 'default';
        return;
      }
      if (e.button === 2) {
        isEraseDraggingRef.current = false;
        return;
      }

      // Handle drag-to-move completion
      if (editorState.dragUid) {
        if (editorState.isDragMoving) {
          // Compute target position
          const ghostCol = editorState.ghostCol - editorState.dragOffsetCol;
          const ghostRow = editorState.ghostRow - editorState.dragOffsetRow;
          const draggedItem = archiveEngine
            .getLayout()
            .furniture.find((f) => f.uid === editorState.dragUid);
          if (draggedItem) {
            const valid = canPlaceFurniture(
              archiveEngine.getLayout(),
              draggedItem.type,
              ghostCol,
              ghostRow,
              editorState.dragUid,
            );
            if (valid) {
              onDragMove(editorState.dragUid, ghostCol, ghostRow);
            }
          }
          editorState.clearSelection();
        } else {
          // Click (no movement) — toggle selection
          if (editorState.selectedFurnitureUid === editorState.dragUid) {
            editorState.clearSelection();
          } else {
            editorState.setSelectedFurnitureUid(editorState.dragUid);
          }
        }
        editorState.clearDrag();
        onEditorSelectionChange();
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'crosshair';
        return;
      }

      editorState.setIsDragging(false);
      editorState.setWallDragAdding(null);
    },
    [editorState, isEditMode, archiveEngine, onDragMove, onEditorSelectionChange],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isEditMode) return; // handled by mouseDown/mouseUp
      const pos = screenToWorld(e.clientX, e.clientY);
      if (!pos) return;

      const hitId = archiveEngine.getCharacterAt(pos.worldX, pos.worldY);
      if (hitId !== null) {
        // Dismiss any active bubble on click
        archiveEngine.dismissBubble(hitId);
        // Toggle selection: click same agent deselects, different agent selects
        if (archiveEngine.selectedAgentId === hitId) {
          archiveEngine.setSelectedAgentId(null);
          archiveEngine.setCameraFollowId(null);
        } else {
          archiveEngine.setSelectedAgentId(hitId);
          archiveEngine.setCameraFollowId(hitId);
        }
        onClick(hitId); // still focus terminal
        return;
      }

      // No agent hit — check furniture or seat click
      const tile = screenToTile(e.clientX, e.clientY);
      if (tile) {
        // --- Furniture Click Action ---
        const targetFurniture = archiveEngine.getFurnitureAt(tile.col, tile.row);
          if (targetFurniture) {
            // Trigger selection callback for inspector
            onFurnitureSelect(targetFurniture.uid, (targetFurniture as any).name || targetFurniture.type);

            // Default to primary agent if none selected for potential interaction
            const activeId = archiveEngine.selectedAgentId ?? 1;
          if (archiveEngine.characters.has(activeId)) {
            const handled = archiveEngine.handleFurnitureClick(activeId, targetFurniture.uid);
            if (handled) {
              // On success, deselect and return
              archiveEngine.setSelectedAgentId(null);
              archiveEngine.setCameraFollowId(null);
              return;
            }
          }
        }

        // --- Seat Assignment Logic ---
        if (archiveEngine.selectedAgentId !== null) {
          const selectedCh = archiveEngine.characters.get(archiveEngine.selectedAgentId);
          // Skip seat reassignment for sub-agents
          if (selectedCh && !selectedCh.isSubagent) {
            const seatId = archiveEngine.getSeatAtTile(tile.col, tile.row);
            if (seatId) {
              const seat = archiveEngine.seats.get(seatId);
              if (seat && selectedCh) {
                if (selectedCh.seatId === seatId) {
                  // Clicked own seat — send agent back to it
                  archiveEngine.sendToSeat(archiveEngine.selectedAgentId);
                  archiveEngine.setSelectedAgentId(null);
                  archiveEngine.setCameraFollowId(null);
                  return;
                } else if (!seat.assigned) {
                  // Clicked available seat — reassign
                  archiveEngine.reassignSeat(archiveEngine.selectedAgentId, seatId);
                  archiveEngine.setSelectedAgentId(null);
                  archiveEngine.setCameraFollowId(null);
                  // Persist seat assignments (exclude sub-agents)
                  const seats: Record<number, { palette: number; seatId: string | null }> = {};
                  for (const ch of archiveEngine.characters.values()) {
                    if (ch.isSubagent) continue;
                    seats[ch.id] = { palette: ch.palette, seatId: ch.seatId };
                  }
                  vscode.postMessage({ type: 'saveAgentSeats', seats });
                  return;
                }
              }
            }
          }
        }
        // Clicked empty space — deselect
        archiveEngine.setSelectedAgentId(null);
        archiveEngine.setCameraFollowId(null);
      }
    },
    [archiveEngine, onClick, screenToWorld, screenToTile, isEditMode],
  );

  const handleMouseLeave = useCallback(() => {
    isPanningRef.current = false;
    isEraseDraggingRef.current = false;
    editorState.setIsDragging(false);
    editorState.setWallDragAdding(null);
    editorState.clearDrag();
    editorState.setGhostPosition(-1, -1);
    archiveEngine.setHoveredAgentId(null);
    archiveEngine.setHoveredTile(null);
  }, [archiveEngine, editorState]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isEditMode) return;
      // Right-click to walk selected agent to tile
      if (archiveEngine.selectedAgentId !== null) {
        const tile = screenToTile(e.clientX, e.clientY);
        if (tile) {
          archiveEngine.walkToTile(archiveEngine.selectedAgentId, tile.col, tile.row);
        }
      }
    },
    [isEditMode, archiveEngine, screenToTile],
  );

  // Wheel: Ctrl+wheel to zoom, plain wheel/trackpad to pan
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Accumulate scroll delta, step zoom when threshold crossed
        zoomAccumulatorRef.current += e.deltaY;
        if (Math.abs(zoomAccumulatorRef.current) >= ZOOM_SCROLL_THRESHOLD) {
          const delta = zoomAccumulatorRef.current < 0 ? 1 : -1;
          zoomAccumulatorRef.current = 0;
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta));
          if (newZoom !== zoom) {
            onZoomChange(newZoom);
          }
        }
      } else {
        // Pan via trackpad two-finger scroll or mouse wheel
        const dpr = getDPR();
        archiveEngine.setCameraFollowId(null);
        panRef.current = clampPan(
          panRef.current.x - e.deltaX * dpr,
          panRef.current.y - e.deltaY * dpr,
        );
      }
    },
    [zoom, onZoomChange, archiveEngine, panRef, clampPan],
  );

  // Prevent default middle-click browser behavior (auto-scroll)
  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  }, []);

  const isReady =
    assetsLoaded &&
    hasFloorSprites() &&
    hasWallSprites() &&
    isCatalogReady() &&
    archiveEngine.getLayout().cols > 0;

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-bg">
      {!isReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg text-text-muted font-sans text-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-pulse">Loading Assets...</div>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ visibility: isReady ? 'visible' : 'hidden' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className="block"
      />
    </div>
  );
}




'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OfficeState } from '@/lib/engine/engine/officeState';
import { OfficeCanvas } from '@/lib/engine/components/OfficeCanvas';
import { EditorState } from '@/lib/engine/editor/editorState';
import { palaceBridge } from '@/lib/bridge';
import { useExtensionMessages } from '@/hooks/useExtensionMessages';
import { useEditorActions } from '@/hooks/useEditorActions';
import { useEditorKeyboard } from '@/hooks/useEditorKeyboard';
import { isBrowserRuntime } from '@/lib/engine/runtime';
import { vscode } from '@/lib/engine/vscodeApi';

// UI Components
import { BottomToolbar } from './BottomToolbar';
import { MigrationNotice } from './MigrationNotice';
import { SettingsModal } from './SettingsModal';
import { ZoomControls } from '../ZoomControls'; // Need to port this
import { ToolOverlay } from '@/lib/engine/components/ToolOverlay';
import { EditorToolbar } from '@/lib/engine/editor/EditorToolbar';

/**
 * 🚨 UI IMMUTABILITY LOCK: RoomDashboard
 * This component represents the final, user-approved 'Archive Room' redesign.
 * NO MODIFICATIONS to the layout or aesthetic are permitted without explicit user override.
 */
export default function RoomDashboard() {
  const [officeState] = useState(() => new OfficeState());
  const [editorState] = useState(() => new EditorState());

  // Browser runtime mock dispatch
  useEffect(() => {
    if (isBrowserRuntime) {
      setTimeout(() => {
        void import('@/lib/engine/browserMock').then(({ dispatchMockMessages }) => {
          dispatchMockMessages();
        });
      }, 500);
    }
  }, []);

  const editor = useEditorActions(() => officeState, editorState);

  const isEditDirty = useCallback(
    () => editor.isEditMode && editor.isDirty,
    [editor.isEditMode, editor.isDirty],
  );

  const {
    agents,
    agentTools,
    subagentCharacters,
    layoutReady,
    layoutWasReset,
    loadedAssets,
    workspaceFolders,
    externalAssetDirectories,
    extensionVersion,
    watchAllSessions,
    setWatchAllSessions,
    alwaysShowLabels,
    hooksEnabled,
    setHooksEnabled,
    assetsLoaded,
  } = useExtensionMessages(() => officeState, editor.setLastSavedLayout, isEditDirty);

  const [migrationNoticeDismissed, setMigrationNoticeDismissed] = useState(false);
  const showMigrationNotice = layoutWasReset && !migrationNoticeDismissed;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [alwaysShowOverlay, setAlwaysShowOverlay] = useState(false);

  useEffect(() => {
    setAlwaysShowOverlay(alwaysShowLabels);
  }, [alwaysShowLabels]);

  const handleToggleAlwaysShowOverlay = useCallback(() => {
    setAlwaysShowOverlay((prev) => {
      const newVal = !prev;
      vscode.postMessage({ type: 'setAlwaysShowLabels', enabled: newVal });
      return newVal;
    });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0);
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  );

  const handleCloseAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'closeAgent', id });
  }, []);

  const handleClick = useCallback((agentId: number) => {
    vscode.postMessage({ type: 'focusAgent', id: agentId });
  }, []);

  // Connect WebSocket bridge
  useEffect(() => {
    if (layoutReady) {
      palaceBridge.connect(officeState);
      return () => palaceBridge.disconnect();
    }
  }, [layoutReady, officeState]);

  if (!layoutReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg font-pixel text-base text-text">
        INITIATING DATA NEXUS...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-screen relative overflow-hidden bg-bg font-pixel">
      <OfficeCanvas
        officeState={officeState}
        onClick={handleClick}
        isEditMode={editor.isEditMode}
        editorState={editorState}
        onEditorTileAction={editor.handleEditorTileAction}
        onEditorEraseAction={editor.handleEditorEraseAction}
        onEditorSelectionChange={editor.handleEditorSelectionChange}
        onDeleteSelected={editor.handleDeleteSelected}
        onRotateSelected={editor.handleRotateSelected}
        onDragMove={editor.handleDragMove}
        editorTick={editor.editorTick}
        zoom={editor.zoom}
        onZoomChange={editor.handleZoomChange}
        panRef={editor.panRef}
        assetsLoaded={assetsLoaded}
      />

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--vignette)' }} />

      {editor.isEditMode &&
        (() => {
          const selUid = editorState.selectedFurnitureUid;
          const selColor = selUid
            ? (officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null)
            : null;
          return (
            <EditorToolbar
              activeTool={editorState.activeTool}
              selectedTileType={editorState.selectedTileType}
              selectedFurnitureType={editorState.selectedFurnitureType}
              selectedFurnitureUid={selUid}
              selectedFurnitureColor={selColor}
              floorColor={editorState.floorColor}
              wallColor={editorState.wallColor}
              selectedWallSet={editorState.selectedWallSet}
              onToolChange={editor.handleToolChange}
              onTileTypeChange={editor.handleTileTypeChange}
              onFloorColorChange={editor.handleFloorColorChange}
              onWallColorChange={editor.handleWallColorChange}
              onWallSetChange={editor.handleWallSetChange}
              onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
              onFurnitureTypeChange={editor.handleFurnitureTypeChange}
              onUndo={editor.handleUndo}
              onRedo={editor.handleRedo}
              onFactoryReset={editor.handleFactoryReset}
              onSave={editor.handleSave}
              loadedAssets={loadedAssets}
            />
          );
        })()}

      <ToolOverlay
        officeState={officeState}
        agents={agents}
        agentTools={agentTools}
        subagentCharacters={subagentCharacters}
        containerRef={containerRef}
        zoom={editor.zoom}
        panRef={editor.panRef}
        onCloseAgent={handleCloseAgent}
        alwaysShowOverlay={alwaysShowOverlay}
      />

      <BottomToolbar
        isEditMode={editor.isEditMode}
        onOpenClaude={editor.handleOpenClaude}
        onToggleEditMode={editor.handleToggleEditMode}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen((v) => !v)}
        workspaceFolders={workspaceFolders}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDebugMode={false}
        onToggleDebugMode={() => {}}
        alwaysShowOverlay={alwaysShowOverlay}
        onToggleAlwaysShowOverlay={handleToggleAlwaysShowOverlay}
        externalAssetDirectories={externalAssetDirectories}
        watchAllSessions={watchAllSessions}
        onToggleWatchAllSessions={() => {
          const newVal = !watchAllSessions;
          setWatchAllSessions(newVal);
          vscode.postMessage({ type: 'setWatchAllSessions', enabled: newVal });
        }}
        hooksEnabled={hooksEnabled}
        onToggleHooksEnabled={() => {
          const newVal = !hooksEnabled;
          setHooksEnabled(newVal);
          vscode.postMessage({ type: 'setHooksEnabled', enabled: newVal });
        }}
      />

      {showMigrationNotice && (
        <MigrationNotice onDismiss={() => setMigrationNoticeDismissed(true)} />
      )}
    </div>
  );
}

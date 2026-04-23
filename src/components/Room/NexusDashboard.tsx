'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArchiveEngine } from '@/lib/engine/engine/ArchiveEngine';
import { NexusCanvas } from '@/lib/engine/components/NexusCanvas';
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
import { ZoomControls } from '../ZoomControls';
import { ToolOverlay } from '@/lib/engine/components/ToolOverlay';
import { EditorToolbar } from '@/lib/engine/editor/EditorToolbar';
import { AgentQueryInput } from './AgentQueryInput';

/**
 * 🚨 UI IMMUTABILITY LOCK: NexusDashboard
 * This component represents the final, user-approved 'Archive Room' redesign.
 * NO MODIFICATIONS to the layout or aesthetic are permitted without explicit user override.
 */
export default function NexusDashboard() {
  const [archiveEngine] = useState(() => new ArchiveEngine());
  const [editorState] = useState(() => new EditorState());

  // Browser runtime mock dispatch
  useEffect(() => {
    if (isBrowserRuntime) {
      setTimeout(() => {
        void import('@/lib/engine/browserMock').then(async ({ initBrowserMock, dispatchMockMessages }) => {
          await initBrowserMock();
          dispatchMockMessages();
        });
      }, 500);
    }
  }, []);

  const editor = useEditorActions(() => archiveEngine, editorState);

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
    // extensionVersion,
    watchAllSessions,
    setWatchAllSessions,
    alwaysShowLabels,
    hooksEnabled,
    setHooksEnabled,
    assetsLoaded,
  } = useExtensionMessages(() => archiveEngine, editor.setLastSavedLayout, isEditDirty);

  const [migrationNoticeDismissed, setMigrationNoticeDismissed] = useState(false);
  const showMigrationNotice = layoutWasReset && !migrationNoticeDismissed;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Use alwaysShowLabels directly from hook to avoid cascading renders
  const showOverlay = alwaysShowLabels;

  const handleToggleAlwaysShowOverlay = useCallback(() => {
    vscode.postMessage({ type: 'setAlwaysShowLabels', enabled: !alwaysShowLabels });
  }, [alwaysShowLabels]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleAgentQuery = useCallback(async (query: string) => {
    setIsQuerying(true);
    try {
      // Pick a random active agent to represent the query if none selected
      const activeAgents = Array.from(archiveEngine.characters.values()).filter(c => c.isActive && !c.isSubagent);
      const agentId = archiveEngine.selectedAgentId || (activeAgents.length > 0 ? activeAgents[0].id : 1);
      
      // Build spatial manifest for Gemini context
      const layout = archiveEngine.getLayout();
      const spatial_manifest = {
        furniture: layout.furniture.map(f => ({
          uid: f.uid,
          type: f.type,
          name: f.name || f.type
        }))
      };
      
      const response = await fetch('http://localhost:8765/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          agent_id: agentId,
          spatial_manifest
        })
      });
      
      if (!response.ok) {
        console.error('Agent query failed:', await response.text());
      }
    } catch (err) {
      console.error('Failed to send agent query:', err);
    } finally {
      setIsQuerying(false);
    }
  }, [archiveEngine]);

  const [, setEditorTickForKeyboard] = useState(0);
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
      palaceBridge.connect(archiveEngine);
      return () => palaceBridge.disconnect();
    }
  }, [layoutReady, archiveEngine]);

  if (!layoutReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg font-pixel text-base text-text">
        INITIATING THE ARCHIVE ROOM...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-screen relative overflow-hidden bg-bg font-pixel">
      <NexusCanvas
        archiveEngine={archiveEngine}
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

      <AgentQueryInput onQuery={handleAgentQuery} isLoading={isQuerying} />

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--vignette)' }} />

      {editor.isEditMode &&
        (() => {
          const selUid = editorState.selectedFurnitureUid;
          const selColor = selUid
            ? (archiveEngine.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null)
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
              onToggleLock={editor.handleToggleLock}
              isLocked={!!archiveEngine.getLayout().isLocked}
              loadedAssets={loadedAssets}
            />
          );
        })()}

      <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />

      <ToolOverlay
        archiveEngine={archiveEngine}
        agents={agents}
        agentTools={agentTools}
        subagentCharacters={subagentCharacters}
        containerRef={containerRef}
        zoom={editor.zoom}
        panRef={editor.panRef}
        onCloseAgent={handleCloseAgent}
        alwaysShowOverlay={showOverlay}
      />

      <BottomToolbar
        isEditMode={editor.isEditMode}
        onOpenClaude={editor.handleOpenClaude}
        onToggleEditMode={editor.handleToggleEditMode}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen((v) => !v)}
        workspaceFolders={workspaceFolders}
        isLocked={!!archiveEngine.getLayout().isLocked}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDebugMode={false}
        onToggleDebugMode={() => {}}
        alwaysShowOverlay={showOverlay}
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

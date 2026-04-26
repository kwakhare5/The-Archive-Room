'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArchiveEngine } from '@/features/spatial/logic/ArchiveEngine';
import { NexusCanvas } from '@/features/spatial/components/NexusCanvas';
import { EditorState } from '@/features/editor/logic/editorState';
import { palaceBridge } from '@/shared/lib/bridge';
import { useExtensionMessages } from '@/shared/hooks/useExtensionMessages';
import { useEditorActions } from '@/features/editor/hooks/useEditorActions';
import { useEditorKeyboard } from '@/features/editor/hooks/useEditorKeyboard';
import { isBrowserRuntime } from '@/shared/lib/engine/runtime';
import { vscode } from '@/shared/lib/apiBridge';
import { cn } from '@/lib/utils';

// UI Components
import { BottomToolbar } from '@/shared/components/BottomToolbar';
import { SettingsModal } from '@/shared/components/SettingsModal';
import { ZoomControls } from '@/features/spatial/components/ZoomControls';
import { EditorToolbar } from '@/features/editor/components/EditorToolbar';
import { ArchiveChatPanel } from '@/features/agents/components/ArchiveChatPanel';
import { Button } from '@/shared/components/ui/Button';
import { knowledgeStore, type KnowledgeMap } from '@/shared/lib/engine/knowledgeStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        void import('@/shared/lib/engine/browserMock').then(async ({ initBrowserMock, dispatchMockMessages }) => {
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

  // --- KNOWLEDGE ENGINE (Persistence) ---
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeMap>({});
  const [selectedFurniture, setSelectedFurniture] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Initial load of the Thought Tree
    setKnowledgeMap(knowledgeStore.load());
  }, []);

  const handlePlantNote = (content: string) => {
    if (!selectedFurniture) return;
    knowledgeStore.plant(selectedFurniture.id, content);
    setKnowledgeMap(knowledgeStore.load()); // Refresh local state
  };

  const handleFurnitureSelect = useCallback((id: string, name: string) => {
    console.log(`[Palace] Focused on object: ${name} (${id})`);
    setSelectedFurniture({ id, name });
  }, []);

  // --- AUTO-STAFFING (Zero-Friction Resident Model) ---
  const hasAutoDispatched = useRef(false);
  useEffect(() => {
    if (layoutReady && workspaceFolders.length > 0 && agents.length === 0 && !hasAutoDispatched.current) {
      console.log('[Resident Staff] Auto-dispatching primary Librarian...');
      const primaryFolder = workspaceFolders[0];
      vscode.postMessage({ 
        type: 'spawnAgent', 
        folderPath: primaryFolder.path, 
        folderName: primaryFolder.name 
      });
      hasAutoDispatched.current = true;
    }
  }, [layoutReady, workspaceFolders, agents.length]);

  // Use alwaysShowLabels directly from hook to avoid cascading renders
  const showOverlay = alwaysShowLabels;

  const handleToggleAlwaysShowOverlay = useCallback(() => {
    vscode.postMessage({ type: 'setAlwaysShowLabels', enabled: !alwaysShowLabels });
  }, [alwaysShowLabels]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          name: (f as any).name || f.type
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
      <div className="w-full h-full flex items-center justify-center bg-bg font-mono text-base text-text">
        INITIATING THE ARCHIVE ROOM...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-screen w-full overflow-hidden bg-bg font-mono selection:bg-accent/30">
      {/* Primary Interaction Zone (The Map) */}
      <div className="flex-1 relative h-full overflow-hidden flex flex-col">
        <div className="flex-1 relative overflow-hidden">
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
            onFurnitureSelect={handleFurnitureSelect}
          />

          {/* Sidebar Toggle Button (Luxury Glass Design) */}
          <Button
            variant="ghost"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 right-0 z-50 h-20 w-1 bg-bg border-l border-y border-border hover:w-2 hover:bg-accent/40 transition-all duration-300 group shadow-2xl rounded-none p-0",
              !isSidebarOpen && "right-[-1px]"
            )}
          >
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-bg border border-border rounded-none transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center gap-2 font-mono
              ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`}>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted whitespace-nowrap">
                {isSidebarOpen ? 'CLOSE_NEXUS' : 'OPEN_NEXUS'}
              </span>
            </div>
          </Button>

          {/* Vignette overlay (Local to Map) */}
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

          <BottomToolbar
            isEditMode={editor.isEditMode}
            onToggleEditMode={editor.handleToggleEditMode}
            onToggleSettings={() => setIsSettingsOpen((v) => !v)}
            workspaceFolders={workspaceFolders}
          />
        </div>
      </div>

      {/* Intelligence Nexus (The Command Panel) */}
      <div 
        className={`h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden border-l border-border
          ${isSidebarOpen ? 'w-[500px] opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="w-[500px] h-full">
          <ArchiveChatPanel 
            furnitureId={selectedFurniture?.id ?? null}
            furnitureName={selectedFurniture?.name ?? null}
            notes={selectedFurniture ? (knowledgeMap[selectedFurniture.id] || []) : []}
            onCloseContext={() => setSelectedFurniture(null)}
            onPlantNote={handlePlantNote}
            onQuery={handleAgentQuery}
            isLoading={isQuerying}
          />
        </div>
      </div>

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

    </div>
  );
}



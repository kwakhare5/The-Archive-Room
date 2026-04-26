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
import { Button } from '@/shared/components/ui/Button';
import { knowledgeStore, type KnowledgeMap } from '@/shared/lib/engine/knowledgeStore';


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
    layoutReady,
    layoutWasReset,
    workspaceFolders,
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
    if (layoutReady && workspaceFolders.length > 0 && archiveEngine.getCharacters().length === 0 && !hasAutoDispatched.current) {
      console.log('[Resident Staff] Auto-dispatching primary Librarian...');
      const primaryFolder = workspaceFolders[0];
      vscode.postMessage({ 
        type: 'spawnAgent', 
        folderPath: primaryFolder.path, 
        folderName: primaryFolder.name 
      });
      hasAutoDispatched.current = true;
    }
  }, [layoutReady, workspaceFolders, archiveEngine]);

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
    <div ref={containerRef} className="h-screen w-full overflow-hidden bg-bg font-mono selection:bg-accent/30">
      {/* Primary Interaction Zone (The Map) - Now Full Screen */}
      <div className="relative h-full w-full overflow-hidden flex flex-col">
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
            panRef={editor.panRef}
            zoom={editor.zoom}
            onZoomChange={editor.handleZoomChange}
            editorTick={editor.editorTick}
            assetsLoaded={assetsLoaded}
            onFurnitureSelect={handleFurnitureSelect}
          />

          {/* Agent Labels & Thought Bubbles Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {archiveEngine.getCharacters().map((ch) => {
              // Convert world position to screen position
              const screenX = (ch.x * 32 * editor.zoom) + editor.panRef.current.x;
              const screenY = (ch.y * 32 * editor.zoom) + editor.panRef.current.y;
              
              // Only render if within or near viewport bounds
              if (screenX < -200 || screenX > window.innerWidth + 200 || 
                  screenY < -200 || screenY > window.innerHeight + 200) return null;

              const isPermission = ch.bubbleType === 'permission';
              const hasText = ch.bubbleText && ch.bubbleText.trim().length > 0;
              
              return (
                <div 
                  key={ch.id}
                  className="absolute left-0 top-0 transition-opacity duration-300"
                  style={{ 
                    transform: `translate(${screenX}px, ${screenY}px)`,
                    zIndex: Math.floor(ch.y)
                  }}
                >
                  <div className="relative -translate-x-1/2 -translate-y-[120%] flex flex-col items-center gap-2">
                    {/* Thought Bubble / Speech Bubble */}
                    {(hasText || isPermission) && (
                      <div className={`
                        px-4 py-3 rounded-2xl max-w-[280px] min-w-[120px] shadow-2xl border-2 animate-in fade-in zoom-in duration-300
                        ${isPermission 
                          ? 'bg-accent/90 border-accent text-white font-bold' 
                          : 'bg-white/95 border-bg/10 text-bg backdrop-blur-md'}
                        pointer-events-auto cursor-default
                      `}>
                        <p className="text-[14px] leading-relaxed break-words">
                          {isPermission ? "⚠️ NEEDS APPROVAL" : ch.bubbleText}
                        </p>
                        {isPermission && (
                          <div className="mt-2 flex gap-2 justify-end">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveEngine.dismissBubble(ch.id);
                              }}
                              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[12px] transition-colors"
                            >
                              DISMISS
                            </button>
                          </div>
                        )}
                        {/* Tail */}
                        <div className={`
                          absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r-2 border-b-2
                          ${isPermission ? 'bg-accent border-accent' : 'bg-white border-bg/10'}
                        `} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vignette overlay (Immersive Office Aesthetic) */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--vignette)' }} />
        </div>
      </div>
    </div>
  );
}

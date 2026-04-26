'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Box, Terminal, Zap, Shield, Sparkles, Cpu, Activity } from 'lucide-react';

interface Note {
  id: string;
  furnitureId: string;
  content: string;
  timestamp: number;
}

interface ArchiveChatPanelProps {
  furnitureId: string | null;
  furnitureName: string | null;
  notes: Note[];
  onCloseContext: () => void;
  onPlantNote: (content: string) => void;
  onQuery: (query: string) => void;
  isLoading?: boolean;
}

/**
 * 🛰️ Archive Intelligence Nexus - Minimal Game Mode
 * Aesthetic: Ghost Terminal + Translucent HUD
 * Fixed: Visibility on light/cream backgrounds
 */
export const ArchiveChatPanel: React.FC<ArchiveChatPanelProps> = ({
  furnitureId,
  furnitureName,
  notes,
  onCloseContext,
  onPlantNote,
  onQuery,
  isLoading = false,
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [notes]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (furnitureId) {
      onPlantNote(input);
    } else {
      onQuery(input);
    }
    setInput('');
  };

  return (
    <div className="relative flex flex-col h-full bg-white/20 backdrop-blur-3xl overflow-hidden font-mono border-l border-border/20 shadow-2xl">
      
      {/* HUD Telemetry - Ultra Minimal */}
      <div className="p-6 flex items-center justify-between border-b border-border/10">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-1.5 bg-accent shadow-[0_0_8px_var(--color-accent)] animate-pulse" />
          <h2 className="pixel-text-telemetry text-text/60">Nexus_Live</h2>
        </div>
        <span className="text-[8px] text-text/30 uppercase tracking-[0.5em] font-bold">Encrypted_V4.0</span>
      </div>

      {/* Message Stream - Ghost Terminal Style */}
      <ScrollArea ref={scrollRef} className="flex-1 px-6">
        <div className="py-8 flex flex-col gap-8">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-center opacity-20">
              <p className="text-[10px] uppercase tracking-[0.6em] text-text">Awaiting_Data</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="relative group animate-in fade-in slide-in-from-right-2 duration-700">
                <div className="flex items-start gap-4">
                  <span className="text-[10px] text-accent/60 font-black mt-0.5">#</span>
                  <div className="flex-1 text-[13px] text-text/80 leading-relaxed tracking-wide group-hover:text-text transition-colors">
                    {note.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Module - Floating Blade */}
      <div className="p-6 bg-white/5 border-t border-border/10">
        <div className="relative group">
          {/* Spatial Focus Tab */}
          {furnitureId && (
            <div className="absolute -top-10 left-0 flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-none animate-in slide-in-from-bottom-2 duration-500">
              <Box className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">{furnitureName}</span>
              <button onClick={onCloseContext} className="ml-2 opacity-40 hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-text" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 bg-bg-dark/20 border border-border/20 p-1.5 pr-1.5 focus-within:border-accent/40 focus-within:bg-bg-dark/40 transition-all duration-300 shadow-inner">
            <div className="pl-4 text-accent/40">
              <Terminal className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="COMMAND_INPUT..."
              className="flex-1 bg-transparent border-none py-3 text-[13px] text-text placeholder:text-text/20 focus:ring-0 font-mono uppercase tracking-widest"
            />
            <Button
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
              variant="accent"
              className="h-12 px-8 text-[11px] bg-accent/90 hover:bg-accent text-bg"
            >
              {isLoading ? '...' : 'EXEC'}
            </Button>
          </div>
        </div>

        {/* Console Stats */}
        <div className="mt-4 flex justify-between items-center opacity-30 px-1">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="w-0.5 h-3.5 bg-text/40" />
              <div className="w-0.5 h-3.5 bg-text/20" />
              <div className="w-0.5 h-3.5 bg-text/10" />
            </div>
            <p className="text-[8px] tracking-[0.4em] uppercase text-text font-bold">System_Stable</p>
          </div>
          <p className="text-[8px] tracking-[0.4em] uppercase text-text font-bold">Ping: 24ms</p>
        </div>
      </div>
    </div>
  );
};

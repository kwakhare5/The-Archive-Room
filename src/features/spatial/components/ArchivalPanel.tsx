'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Minus,
  Plus,
  LayoutGrid,
  Settings,
  ChevronRight,
  RotateCw,
  Trash2,
  Send,
  Terminal,
  Cpu,
  User,
  Activity,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLOR = {
  cream: '#fdfbf7', // Brighter, more modern cream
  brown: '#4a3728',
  amber: '#d97706',
  red: '#991b1b',
  surface: '#ffffff',
  ghost: 'rgba(74, 55, 40, 0.05)',
};

type Message = {
  id: string;
  author: 'user' | 'system';
  label: string;
  text: string;
  timestamp: string;
};

const SEED_MESSAGES: Message[] = [
  {
    id: 'm1',
    author: 'system',
    label: 'ARCHIVIST',
    text: 'Welcome to the Nexus. 1,402 artifacts synchronized. How shall we proceed with the restoration?',
    timestamp: '14:22',
  },
  {
    id: 'm2',
    author: 'user',
    label: 'YOU',
    text: 'Locate all cartographic records from the 19th century Eastern Atrium.',
    timestamp: '14:23',
  },
  {
    id: 'm3',
    author: 'system',
    label: 'ARCHIVIST',
    text: 'Analyzing... Surfacing 36 matches from the Linwood Ledger. I have prepared the spatial coordinates for your review.',
    timestamp: '14:23',
  },
];

function Typewriter({ text, speed = 15 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span>{shown}</span>;
}

interface ArchivalPanelProps {
  magnification: number;
  setMagnification: (m: number) => void;
  selectedFurniture: { id: string; name: string } | null;
  onRotate: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  onToggleEdit: () => void;
  onQuery: (query: string) => void;
}

/**
 * 👑 ELITE CHAT REDESIGN (Nexus v.2)
 * Fuses Modern App Aesthetics with Archival Soul.
 * Focus: Premium readability, smooth motion, and deep visual hierarchy.
 */
export function ArchivalPanel({
  magnification,
  setMagnification,
  selectedFurniture,
  onRotate,
  onDelete,
  onDeselect,
  onToggleEdit,
  onQuery,
}: ArchivalPanelProps) {
  const [messages] = useState<Message[]>(SEED_MESSAGES);
  const [input, setInput] = useState('');
  const [ping, setPing] = useState(24);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setPing(Math.floor(18 + Math.random() * 12)), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  return (
    <aside
      className="relative z-20 flex h-full w-[460px] flex-col shrink-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.15)]"
      style={{
        backgroundColor: COLOR.cream,
        color: COLOR.brown,
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* 1. THEMED TACTICAL HEADER */}
      <header 
        className="flex items-center justify-between border-b-2 px-6 py-6 shrink-0 shadow-lg"
        style={{ backgroundColor: COLOR.brown, borderColor: COLOR.amber }}
      >
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-amber bg-black/20 text-amber shadow-[0_0_10px_rgba(217,119,6,0.3)]">
            <Terminal size={26} strokeWidth={3} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-black uppercase tracking-[0.3em] text-white">Nexus_Terminal</span>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber/80">
              <span className="flex h-2 w-2 rounded-full bg-amber animate-pulse shadow-[0_0_5px_#d97706]" />
              <span>Link_Stable • {ping}ms</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex h-11 w-11 items-center justify-center border-2 border-white/10 hover:border-amber/50 hover:bg-amber/10 transition-all text-cream/70 hover:text-amber">
            <Maximize2 size={22} />
          </button>
        </div>
      </header>

      {/* 2. THEMED CHAT STREAM */}
      <div
        ref={streamRef}
        className="flex-1 overflow-y-auto px-6 py-10 space-y-10 no-scrollbar relative"
        style={{ 
          backgroundColor: COLOR.cream,
          backgroundImage: 'radial-gradient(#4a3728 0.4px, transparent 0.4px)',
          backgroundSize: '32px 32px',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: m.author === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              layout
              className={`flex w-full ${m.author === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-4 max-w-[88%] ${m.author === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar (Themed) */}
                <div className={`flex-shrink-0 h-10 w-10 border-2 flex items-center justify-center shadow-sm ${
                  m.author === 'system' ? 'bg-amber/10 border-amber text-amber' : 'bg-brown border-brown text-cream'
                }`}>
                  {m.author === 'system' ? <Cpu size={20} strokeWidth={2.5} /> : <User size={20} strokeWidth={2.5} />}
                </div>

                {/* Bubble Container (Themed) */}
                <div className={`flex flex-col gap-2 ${m.author === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`px-5 py-4 border-2 shadow-[4px_4px_0px_rgba(74,55,40,0.1)] text-[14px] leading-relaxed tracking-wide ${
                      m.author === 'user' 
                        ? 'bg-brown text-cream border-brown' 
                        : 'bg-cream text-brown border-brown'
                    }`}
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    {idx === messages.length - 1 && m.author === 'system' ? (
                      <Typewriter text={m.text} />
                    ) : m.text}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">
                    {m.timestamp} // {m.label}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 3. TACTICAL HUD (Inline Card) */}
        <AnimatePresence>
          {selectedFurniture && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 rounded-3xl bg-amber/5 border border-amber/10 shadow-sm overflow-hidden relative"
            >

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber text-brown">
                    <Activity size={18} strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber">Object Protocol</span>
                    <span className="text-sm font-bold uppercase tracking-tight">{selectedFurniture.name}</span>
                  </div>
                </div>
                <button 
                  onClick={onDeselect}
                  className="text-[10px] font-bold opacity-30 hover:opacity-100 transition-opacity"
                >
                  DISMISS
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onRotate}
                  className="flex items-center justify-center gap-2 py-3 bg-brown text-white rounded-2xl text-xs font-bold hover:brightness-110 transition-all shadow-md"
                >
                  <RotateCw size={14} /> Rotate
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-2xl text-xs font-bold hover:brightness-110 transition-all shadow-md"
                >
                  <Trash2 size={14} /> Purge
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. MODERN INPUT BAR */}
      <footer className="p-6 bg-white border-t">
        <div className="flex items-center gap-4 bg-brown/5 rounded-[2rem] px-6 py-2 border border-brown/5 focus-within:border-amber/30 focus-within:bg-white transition-all shadow-sm">
          {/* Zoom Control Pill */}
          <div className="flex items-center bg-brown/10 rounded-full p-1 gap-1">
            <button 
              onClick={() => setMagnification(Math.max(1, magnification - 0.5))}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white transition-colors text-brown"
            >
              <Minus size={16} />
            </button>
            <span className="text-[10px] font-black w-8 text-center">{magnification.toFixed(1)}</span>
            <button 
              onClick={() => setMagnification(Math.min(8, magnification + 0.5))}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white transition-colors text-brown"
            >
              <Plus size={16} />
            </button>
          </div>

          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onQuery(input);
                setInput('');
              }
            }}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-brown/30 resize-none max-h-32"
            rows={1}
          />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onQuery(input);
              setInput('');
            }}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-amber text-brown shadow-lg"
          >
            <Send size={20} strokeWidth={2.5} />
          </motion.button>
        </div>
        
        <div className="mt-4 flex justify-center gap-4 text-[9px] font-black uppercase tracking-widest opacity-20">
          <span>Secure Uplink</span>
          <span>•</span>
          <span>Vault ID: 17</span>
          <span>•</span>
          <span>Vercel AI SDK</span>
        </div>
      </footer>
    </aside>
  );
}

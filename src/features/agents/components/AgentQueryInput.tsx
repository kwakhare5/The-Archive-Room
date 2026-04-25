import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';

interface AgentQueryInputProps {
  onQuery: (query: string) => void;
  isLoading?: boolean;
}

export function AgentQueryInput({ onQuery, isLoading }: AgentQueryInputProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;
    onQuery(query.trim());
    setQuery('');
  };

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-lg pointer-events-none z-50 flex flex-col items-center">
      <div className="pixel-blade w-full px-8 flex items-center pointer-events-auto bg-[#1a140f]/80 backdrop-blur-xl border border-white/10">
        <form 
          onSubmit={handleSubmit}
          className="flex items-center gap-4 w-full h-full"
        >
          <span className="text-[10px] font-bold text-white/20 tracking-[0.4em] uppercase whitespace-nowrap">Command</span>
          <div className="w-[1px] h-4 bg-white/5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="INTERROGATE_THE_ARCHIVE..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-xs text-white/60 placeholder:text-white/10 uppercase tracking-[0.2em] font-mono h-full"
          />
          <div className="flex items-center gap-3">
            {isLoading && <div className="w-1.5 h-1.5 bg-accent animate-pulse" />}
            <Button 
              type="submit" 
              variant="ghost" 
              disabled={isLoading || !query.trim()}
              className="text-[9px] font-mono text-white/20 hover:text-white/60 tracking-widest px-0 h-auto"
            >
              {isLoading ? 'WORKING...' : 'EXECUTE'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


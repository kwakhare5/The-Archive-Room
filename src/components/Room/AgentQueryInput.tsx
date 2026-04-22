import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';

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
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-10">
      <form 
        onSubmit={handleSubmit}
        className="pixel-panel p-4 flex items-center gap-4 bg-bg/90 backdrop-blur-sm border-2 border-accent/50 shadow-2xl"
      >
        <span className="text-accent font-bold animate-pulse text-2xl">≫</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Command the Archive Room..."
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-text placeholder:text-text/30 font-pixel text-xl"
        />
        <Button 
          type="submit" 
          variant="accent" 
          disabled={isLoading || !query.trim()}
          className="shrink-0"
        >
          {isLoading ? 'THINKING...' : 'DISPATCH'}
        </Button>
      </form>
    </div>
  );
}

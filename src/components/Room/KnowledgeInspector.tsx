import React from 'react';

interface Note {
  id: string;
  furnitureId: string;
  content: string;
  timestamp: number;
}

interface KnowledgeInspectorProps {
  furnitureId: string | null;
  furnitureName: string | null;
  notes: Note[];
  onClose: () => void;
  onPlantNote: (content: string) => void;
}

/**
 * 🕵️ Knowledge Inspector HUD
 * A sliding right-side panel for managing "Planted" knowledge.
 */
export const KnowledgeInspector: React.FC<KnowledgeInspectorProps> = ({
  furnitureId,
  furnitureName,
  notes,
  onClose,
  onPlantNote,
}) => {
  const [newNote, setNewNote] = React.useState('');

  if (!furnitureId) return null;

  const handlePlant = () => {
    if (newNote.trim()) {
      onPlantNote(newNote);
      setNewNote('');
    }
  };

  return (
    <div className="absolute right-6 top-24 bottom-6 w-80 pointer-events-none z-50 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
      <div className="pixel-panel-double pointer-events-auto flex flex-col h-full overflow-hidden bg-bg">
        
        {/* Header - Property Title */}
        <div className="p-6 border-b border-border flex justify-between items-start bg-bg-dark">
          <div>
            <div className="text-[10px] uppercase font-bold text-accent tracking-[0.2em] mb-1 opacity-50">Archive Property</div>
            <h2 className="text-sm font-bold text-text uppercase tracking-[0.15em]">
              {furnitureName || 'Knowledge Source'}
            </h2>
            <div className="mt-2 py-1 px-3 bg-accent/5 inline-block border border-accent/10">
              <span className="text-[9px] text-accent/60 font-mono uppercase tracking-widest">UID: {furnitureId}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content - Planted Intelligence */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-border/40" />
            <div className="text-[9px] uppercase font-bold text-text-muted tracking-[0.3em] whitespace-nowrap">Intelligence Stream</div>
            <div className="h-[1px] flex-1 bg-border/40" />
          </div>
          
          {notes.length === 0 ? (
            <div className="text-xs text-text-muted italic py-12 text-center border border-dashed border-border/60 bg-bg-dark/20">
              <div className="mb-2 opacity-30 text-xl">≋</div>
              No knowledge records found.<br/>
              <span className="text-[10px] uppercase not-italic font-bold tracking-widest opacity-40 mt-4 block">Awaiting Input</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {notes.map((note) => (
                <div key={note.id} className="p-4 bg-bg-dark/40 border border-border/30 hover:border-accent/30 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-mono text-accent/50">
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[8px] font-mono text-text-muted/30">ID: {note.id}</span>
                  </div>
                  <p className="text-xs text-text/80 leading-relaxed uppercase tracking-widest">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action - Input Nexus */}
        <div className="p-6 border-t border-border bg-bg-dark/40">
          <div className="mb-3 text-[9px] uppercase font-bold text-text-muted tracking-[0.2em]">Add Intelligence</div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="TYPE TO PLANT KNOWLEDGE..."
            className="w-full h-28 p-4 text-xs bg-bg border border-border rounded-none focus:outline-none focus:border-accent transition-colors resize-none placeholder:text-text-muted/20 uppercase tracking-widest leading-relaxed"
          />
          <button
            onClick={handlePlant}
            disabled={!newNote.trim()}
            className={`mt-4 w-full py-3 text-[10px] font-bold uppercase tracking-[0.3em] transition-all
              ${newNote.trim() 
                ? 'bg-accent text-white hover:bg-accent-bright shadow-pixel active:translate-y-px' 
                : 'bg-border text-text-muted/30 cursor-not-allowed'}`}
          >
            COMMIT TO ARCHIVE
          </button>
        </div>
      </div>
    </div>
  );
};

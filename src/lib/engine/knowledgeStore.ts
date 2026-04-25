/**
 * 🌳 The Thought Tree (Knowledge Persistence)
 * This module manages the mapping of user thoughts/notes to specific furniture UIDs.
 */

const KNOWLEDGE_KEY = 'archive-room-knowledge';

export interface PlantedNote {
  id: string;
  furnitureId: string;
  content: string;
  timestamp: number;
}

export type KnowledgeMap = Record<string, PlantedNote[]>;

export const knowledgeStore = {
  /** Load all planted knowledge from memory */
  load(): KnowledgeMap {
    const raw = localStorage.getItem(KNOWLEDGE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  /** Save a new thought to a specific piece of furniture */
  plant(furnitureId: string, content: string): PlantedNote {
    const map = this.load();
    const newNote: PlantedNote = {
      id: Math.random().toString(36).substring(2, 9),
      furnitureId,
      content,
      timestamp: Date.now(),
    };

    if (!map[furnitureId]) map[furnitureId] = [];
    map[furnitureId].unshift(newNote); // Newest first

    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(map));
    
    // Optional: Background sync if the bridge is running
    fetch('http://localhost:8765/save-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(map),
    }).catch(() => {/* Silent fail if no bridge */});

    return newNote;
  },

  /** Retrieve all thoughts planted on a specific object */
  getNotes(furnitureId: string): PlantedNote[] {
    const map = this.load();
    return map[furnitureId] || [];
  }
};

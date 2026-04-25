# Implementation Plan: Phase 1 - The Knowledge Planting Engine

This phase transforms the static office furniture into functional storage units for your "Visual Notion." We will enable the ability to select a bookshelf and "Plant" a note inside it.

## User Review Required
> [!IMPORTANT]
> This plan introduces a new data file: `knowledge_map.json`. This file will store your personal notes and their spatial coordinates (furniture IDs).

## Proposed Changes

### 1. Data Layer (The Memory)
#### [NEW] `src/lib/engine/knowledgeStore.ts`
- Create a singleton `KnowledgeStore` class.
- Handle Load/Save operations for `knowledge_map.json`.
- Provide methods: `addNote(furnitureId, note)`, `getNotes(furnitureId)`, `deleteNote(id)`.

### 2. UI Layer (The HUD)
#### [NEW] `src/components/Room/KnowledgeInspector.tsx`
- A clean, right-side panel that slides in when a bookshelf is selected.
- Displays the list of notes "planted" in that specific shelf.
- Includes a "Plant New Note" text area.
- Styling: Matches the light-themed, minimalist office aesthetic (FS Pixel Sans font).

### 3. Integration (The Connection)
#### [MODIFY] `src/lib/engine/engine/ArchiveEngine.ts`
- Update the `selectFurniture` logic to trigger the `KnowledgeInspector` visibility.
#### [MODIFY] `src/components/Room/NexusDashboard.tsx`
- Mount the `KnowledgeInspector` component.

## Verification Plan

### Manual Verification
1. **Selection Test**: Click a bookshelf and verify the Inspector panel opens on the right.
2. **Planting Test**: Type a note, click "Plant," and verify it appears in the shelf's list.
3. **Persistence Test**: Refresh the page and verify the note is still there.
4. **Agent Alignment**: Click an agent and verify it DOES NOT open the Knowledge Inspector (only furniture).

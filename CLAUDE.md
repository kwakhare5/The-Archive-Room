## Global Standards & Protocols

This project is governed by the **Global AI Engineer Blueprint**. All actions must adhere to the standards defined in the master files:

- **Master Blueprint:** [GEMINI.md](file:///c:/Users/kwakh/.gemini/GEMINI.md)
- **Team Handbook:** [AGENTS.md](file:///c:/Users/kwakh/.gemini/AGENTS.md)

### 🛑 Absolute Permission Protocol
You MUST obtain explicit permission from the USER for all **Big Tasks** (Structural changes, dependency installs, major refactors). Minor tweaks are autonomous. **If in doubt, ASK.**

### 🏗️ Project Tracking Standard
This project maintains its pulse via:
1.  **`task.md` (The Pulse)**: Current phase TODOs.
2.  **`walkthrough.md` (The History)**: Logical and visual changelog.
3.  **`CLAUDE.md` (The Roadmap)**: Milestones and architecture.

---

## Workflow Orchestration

### 1. Mandatory Plan Mode (NO COWBOY COMMITS)
- Enter plan mode for EVERY task involving a code change. There are no "trivial" edits.
- If something goes sideways, STOP and re-plan immediately.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## 🖥️ Screen Usage Protocol
- **Bigger Screen Priority**: Always provide major reports, audit findings, implementation plans, and architectural overviews in **Artifacts** (.md files in the brain directory).
- **Concise Chat**: Use the chat window only for quick status updates, questions, and approval requests.
- **Persistent Memory**: Ensure every major decision is documented in a file, not just in the chat history.

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.

---

# The Archive Room — Compressed Reference

Standalone React web app: pixel-art "The Archive Room" where AI agent operations (RAG search, code generation, reasoning, idle) are visualized as physical character movements and furniture interactions.

## Vision & Concept

**Black Box Breaker**: Traditional AI/RAG systems are invisible — you ask a question, text appears. The Archive Room shatters that by translating invisible AI data operations into physical, spatial movements within a virtual room. You literally watch your AI brain work.

**Core Principle — "Furniture-as-Function"**: Every piece of furniture is a functional API endpoint, not decoration. Agents physically navigate to specific furniture to perform backend operations.

## Architecture

This project is **fully decoupled from VS Code**. It is a standalone web application.

```
src/                              — Standalone React + Next.js web app (THE APP)
  app/                            — Next.js App Router (page.tsx, layout.tsx, globals.css)
  components/                     — Shared React components (NexusDashboard, Modals, etc.)
  hooks/                          — Custom React hooks (useWebSocket, useEditorActions, etc.)
  lib/
    engine/                       — The Pixel Rendering Engine
      constants.ts                — All magic numbers/strings (grid, animation, rendering, camera, zoom, editor, game logic)
      notificationSound.ts        — Web Audio API chime on agent events, with enable/disable
      runtime.ts                  — Runtime detection (browser vs webview)
      vscodeApi.ts                — VS Code API shim (legacy)
      types.ts                    — Interfaces (ArchiveLayout, FloorColor, Character, etc.)
      toolUtils.ts                — STATUS_TO_TOOL mapping, extractToolName(), defaultZoom()
      colorize.ts                 — Dual-mode color module: Colorize (grayscale→HSL) + Adjust (HSL shift)
      floorTiles.ts               — Floor sprite storage + colorized cache
      wallTiles.ts                — Wall auto-tile: 16 bitmask sprites from walls.png
      sprites/
        spriteData.ts             — Pixel data: characters, furniture, tiles, bubbles
        spriteCache.ts            — SpriteData → offscreen canvas, per-zoom WeakMap cache, outline sprites
      editor/
        editorActions.ts          — Pure layout ops: paint, place, remove, move, rotate, toggleState, canPlace, expandLayout
        editorState.ts            — Imperative state: tools, ghost, selection, undo/redo, dirty, drag
        EditorToolbar.tsx         — React toolbar/palette for edit mode
      layout/
        furnitureCatalog.ts       — Dynamic catalog from loaded assets + getCatalogEntry()
        nexusSerializer.ts        — ArchiveLayout ↔ runtime (tileMap, furniture, seats, blocked)
        tileMap.ts                — Walkability grid, BFS pathfinding
      engine/
        characters.ts             — Character FSM: idle/walk/type + wander AI (TO BE REFACTORED)
        ArchiveEngine.ts          — Game world: layout, characters, seats, selection, subagents
        gameLoop.ts               — rAF loop with delta time (capped 0.1s)
        renderer.ts               — Canvas: tiles, z-sorted entities, overlays, edit UI
        matrixEffect.ts           — Matrix-style spawn/despawn digital rain effect
      components/
        NexusCanvas.tsx           — Canvas, resize, DPR, mouse hit-testing, edit interactions, drag-to-move
        ToolOverlay.tsx           — Activity status label above hovered/selected character + close button
    bridge.ts                     — PalaceEventBridge: WebSocket communication layer

public/                           — Static assets (Sprites, Fonts, Banners)
  assets/                         — PNGs, furniture-catalog.json

backend/                          — FastAPI Backend (Intelligence Layer)
  main.py                         — FastAPI Entry point & WebSocket server
  reasoning.py                    — Gemini 1.5 Pro integration

scripts/                          — Asset extraction pipeline (KEEP)
```

## Tech Stack

```
Frontend:    React 19 + TypeScript + Next.js 16 (App Router)
Styling:     Tailwind CSS v4 (CSS variables based)
Rendering:   HTML5 Canvas (60 FPS game loop, requestAnimationFrame)
Pathfinding: BFS (Breadth-First Search) on walkability grid
Font:        FS Pixel Sans (custom pixel font, @font-face in globals.css)
Backend:     Python 3.10+ (FastAPI + Uvicorn)
AI Model:    Gemini 2.0 Flash (gemini-flash-latest)
Protocol:    JSON over WebSocket (PalaceEventBridge) with Multi-Step Queuing
```

## Core Concepts

**Game Loop**: `requestAnimationFrame` at 60 FPS with delta time capped at 0.1s. State in imperative `ArchiveEngine` class (not React state).

**Layout Model**: `{ version: 1, cols, rows, tiles: TileType[], furniture: PlacedFurniture[], tileColors?: FloorColor[] }`. Dynamic grid dimensions. Re-mapped to `ArchiveLayout`.

**Command-Driven Navigation**: Agents do NOT wander randomly. Every movement is triggered by a backend command via the WebSocket Event Bridge.

**Multi-Step Reasoning**: The backend supports sequences of commands (JSON arrays). It coordinates movement, interaction, and return-to-seat transitions via a feedback loop.

## Operational Protocol (HARDENED)
- **Sentinel Header**: EVERY response MUST begin with the Expert Scan header.
- **Diagnostic Verification**: Use a "Red Screen Test" (Diagnostic Color Change) to prove that code changes are reaching the browser.
- **Mandatory Planning**: NO code changes are allowed without an approved implementation plan.
- **The Pulse Protocol**: Every significant task or turn end MUST be saved locally via `git commit` (and pushed via `npm run save` only when requested).

---

## 🛠️ Tech Bible Alignment Audit (2026-04-23)
- [x] **Stack**: Next.js 16 + Tailwind v4 + FastAPI (Elite Stack)
- [x] **AI**: Gemini Flash (Native Integration)
- [x] **Persistence**: Git Checkpoints (Mandatory)
- [x] **Resume Goal**: "Real-time AI spatial reasoning engine with 60FPS canvas rendering."

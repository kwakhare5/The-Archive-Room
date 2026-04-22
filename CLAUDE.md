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

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.

---

# The Archive Room — Compressed Reference

Standalone React web app: pixel-art "Data Nexus" room where AI agent operations (RAG search, code generation, reasoning, idle) are visualized as physical character movements and furniture interactions.

## Vision & Concept

**Black Box Breaker**: Traditional AI/RAG systems are invisible — you ask a question, text appears. The Archive Room shatters that by translating invisible AI data operations into physical, spatial movements within a virtual room. You literally watch your AI brain work.

**Core Principle — "Furniture-as-Function"**: Every piece of furniture is a functional API endpoint, not decoration. Agents physically navigate to specific furniture to perform backend operations.

## The Three Zones

```
┌─────────────────────────────────────────────────────────────┐
│                        THE DATA NEXUS                       │
│                                                             │
│  ZONE 3: UTILITY DIVIDER      │  ZONE 2: ARCHIVE MATRIX     │
│  (Top Left)                   │  (Right Side)               │
│  ┌───────────┐                │  ┌──┐┌──┐┌──┐┌──┐┌──┐       │
│  │ Whiteboard │ = Planning    │  │01││02││03││04││05│       │
│  └───────────┘   (CoT)       │  └──┘└──┘└──┘└──┘└──┘       │
│  ┌──────┐ ┌────┐             │  ┌──┐┌──┐┌──┐┌──┐┌──┐       │
│  │Coffee│ │Sofa│ = Idle      │  │06││07││08││09││10│       │
│  └──────┘ └────┘   (Rate     │  └──┘└──┘└──┘└──┘└──┘       │
│  ┌─────┐            Limit)   │  ┌──┐┌──┐┌──┐┌──┐┌──┐       │
│  │ Bin │ = Context Trim      │  │11││12││13││14││15│       │
│  └─────┘                     │  └──┘└──┘└──┘└──┘└──┘       │
│               ZONE 1:         │  ┌──┐┌──┐┌──┐┌──┐┌──┐       │
│          EXECUTION PODS       │  │16││17││18││19││20│       │
│             (Center)          │  └──┘└──┘└──┘└──┘└──┘       │
│  ┌────┐ ┌────┐ ┌────┐         │  Vector DB / Doc Storage      │
│  │Desk│ │Desk│ │Desk│         │  = RAG retrieval / memory     │
│  │+PC │ │+PC │ │+PC │         │    fetch via BFS pathfinding  │
│  └────┘ └────┘ └────┘         │                               │
│  Output Generation            │  Labels: A-001 through A-020  │
│  = Active code writing        │                               │
│  = Agent typing at PC         │                               │
│                               │                               │
│                               │                               │
└─────────────────────────────────────────────────────────────┘
```

### Zone 1: Execution Pods (Center)

- **Furniture**: Desks, computers, ergonomic chairs
- **Meaning**: Output Generation — when an AI agent is actively writing code or generating a response, it sits here typing while the PC monitor activates
- **Backend mapping**: `GENERATE_CODE`, `WRITE_RESPONSE` commands

### Zone 2: Archive Matrix (Right Side)

- **Furniture**: 20 double bookshelves in a grid, labeled `A-001` through `A-020`
- **Meaning**: Vector Database / Document Storage — when the AI needs to retrieve a memory, look up docs, or fetch context via RAG, the agent physically walks to the exact bookshelf
- **Backend mapping**: `RAG_SEARCH`, `FETCH_MEMORY`, `LOOKUP_DOC` commands with `target: "A-012"` etc.

### Zone 3: Utility Divider (Top Left)

- **Whiteboard** → Chain-of-Thought / Planning. Agent reasons through a problem before acting
- **Coffee Machine / Sofa** → Rate Limiting / Idle. API is waiting or on a timer
- **Bin** → Context Trimming. AI deletes old memory to save tokens
- **Backend mapping**: `THINK`, `WAIT`, `TRIM_CONTEXT` commands

## Architecture

This project is **fully decoupled from VS Code**. It is a standalone web application.

```
src/                              — Standalone React + Next.js web app (THE APP)
  app/                            — Next.js App Router (page.tsx, layout.tsx, globals.css)
  components/                     — Shared React components (RoomDashboard, Modals, etc.)
  hooks/                          — Custom React hooks (useWebSocket, useEditorActions, etc.)
  lib/
    engine/                       — The Pixel Rendering Engine
      constants.ts                — All magic numbers/strings (grid, animation, rendering, camera, zoom, editor, game logic)
      notificationSound.ts        — Web Audio API chime on agent events, with enable/disable
      runtime.ts                  — Runtime detection (browser vs webview)
      vscodeApi.ts                — VS Code API shim (legacy, to be replaced by EventBridge)
      office/                     — Core rendering & state logic
        types.ts                  — Interfaces (OfficeLayout, FloorColor, Character, etc.) + re-exports constants
        toolUtils.ts              — STATUS_TO_TOOL mapping, extractToolName(), defaultZoom()
        colorize.ts               — Dual-mode color module: Colorize (grayscale→HSL) + Adjust (HSL shift)
        floorTiles.ts             — Floor sprite storage + colorized cache
        wallTiles.ts              — Wall auto-tile: 16 bitmask sprites from walls.png
        sprites/
          spriteData.ts           — Pixel data: characters, furniture, tiles, bubbles
          spriteCache.ts          — SpriteData → offscreen canvas, per-zoom WeakMap cache, outline sprites
        editor/
          editorActions.ts        — Pure layout ops: paint, place, remove, move, rotate, toggleState, canPlace, expandLayout
          editorState.ts          — Imperative state: tools, ghost, selection, undo/redo, dirty, drag
          EditorToolbar.tsx       — React toolbar/palette for edit mode
        layout/
          furnitureCatalog.ts     — Dynamic catalog from loaded assets + getCatalogEntry()
          layoutSerializer.ts     — OfficeLayout ↔ runtime (tileMap, furniture, seats, blocked)
          tileMap.ts              — Walkability grid, BFS pathfinding
        engine/
          characters.ts           — Character FSM: idle/walk/type + wander AI (TO BE REFACTORED → command-driven)
          officeState.ts          — Game world: layout, characters, seats, selection, subagents
          gameLoop.ts             — rAF loop with delta time (capped 0.1s)
          renderer.ts             — Canvas: tiles, z-sorted entities, overlays, edit UI
          matrixEffect.ts         — Matrix-style spawn/despawn digital rain effect
        components/
          OfficeCanvas.tsx        — Canvas, resize, DPR, mouse hit-testing, edit interactions, drag-to-move
          ToolOverlay.tsx          — Activity status label above hovered/selected character + close button
    bridge.ts                     — PalaceEventBridge: WebSocket communication layer

public/                           — Static assets (Sprites, Fonts, Banners)
  assets/                         — PNGs, furniture-catalog.json

backend/                          — FastAPI Backend (Intelligence Layer)
  main.py                         — FastAPI Entry point & WebSocket server
  reasoning.py                    — Gemini 1.5 Pro integration
  requirements.txt                — Backend dependencies

_legacy_archive/                  — Archived project files from migration

scripts/                          — Asset extraction pipeline (KEEP)
  generate-walls.js               — Generate walls.png (auto-tile grid)
```

## Communication: WebSocket Event Bridge (TARGET ARCHITECTURE)

The frontend and backend communicate via a **WebSocket Event Bridge**. The backend doesn't need to know anything about pixels, sprites, or pathfinding. It fires simple JSON commands.

### Backend → Frontend (Commands)

```jsonc
// Agent navigates to a bookshelf to retrieve data (RAG search)
{ "command": "RAG_SEARCH", "agentId": 2, "target": "A-012" }

// Agent goes to desk to write code (output generation)
{ "command": "GENERATE_CODE", "agentId": 1 }

// Agent walks to whiteboard to think (chain-of-thought)
{ "command": "THINK", "agentId": 1 }

// Agent grabs coffee / sits on sofa (idle / rate-limited)
{ "command": "WAIT", "agentId": 3 }

// Agent walks to bin (context trimming)
{ "command": "TRIM_CONTEXT", "agentId": 1 }

// Spawn a new agent
{ "command": "SPAWN_AGENT", "agentId": 4, "name": "ResearchBot" }

// Remove an agent
{ "command": "REMOVE_AGENT", "agentId": 4 }
```

### Frontend → Backend (Status Updates)

```jsonc
// Agent arrived at target
{ "event": "AGENT_ARRIVED", "agentId": 2, "target": "A-012" }

// Agent finished animation
{ "event": "ANIMATION_COMPLETE", "agentId": 1, "action": "RAG_SEARCH" }

// Agent is idle
{ "event": "AGENT_IDLE", "agentId": 1 }
```

### Current State: `useWebSocket.ts`

The app currently uses a custom hook `useWebSocket.ts` to manage the persistent connection to the FastAPI backend.

## Tech Stack

```
Frontend:    React 19 + TypeScript + Next.js 16 (App Router)
Styling:     Tailwind CSS v4 (CSS variables based)
Rendering:   HTML5 Canvas (60 FPS game loop, requestAnimationFrame)
Pathfinding: BFS (Breadth-First Search) on walkability grid
Font:        FS Pixel Sans (custom pixel font, @font-face in globals.css)
Backend:     Python 3.10+ (FastAPI + Uvicorn)
AI Model:    Gemini 1.5 Pro / Flash
Protocol:    JSON over WebSocket (PalaceEventBridge)
```


## Architectural Justification (Bible Drift Management)

To maintain alignment with **Karan's Tech Bible** while allowing for innovation, the following deviations from the "Elite Stack" are documented and justified:

- **Next.js 16.2.4 (Drift: Bible specifies 14/15)**: Adopted to leverage React 19 features (Server Actions, useFormStatus, etc.) and improved App Router caching mechanisms. This ensures the project remains on the absolute leading edge of the ecosystem.
- **Custom Pixel Engine (Drift: Bible specifies `shadcn/ui`)**: The core visualization requires a high-performance 2D Canvas engine with pixel-perfect integer scaling. `shadcn/ui` is utilized for standard web UI overlays (modals, toolbars), but the "Data Nexus" itself is a custom implementation to ensure high-fidelity pixel art rendering.

## Core Concepts

**Vocabulary**: Agent = pixel character in the room, bound to a backend AI process. Furniture = functional endpoint (bookshelf = memory, desk = compute, whiteboard = reasoning). Zone = logical region of the room mapping to backend architecture.

**Furniture-as-Function**: Every placed furniture item in the room maps to a backend operation. When a backend command arrives, the frontend translates it into: (1) BFS pathfind to the target furniture, (2) walk animation along the path, (3) interaction animation at the furniture (typing, reading, thinking).

**Command-Driven Navigation**: Agents do NOT wander randomly. Every movement is triggered by a backend command via the WebSocket Event Bridge. The backend says "go to A-012", the frontend handles all the pixel math, pathfinding, and animation.

## Character System

### Current FSM States (from `characters.ts`)

The Character FSM currently has three states inherited from the original project:

| State  | Animation              | Trigger                                    |
| ------ | ---------------------- | ------------------------------------------ |
| `TYPE` | Typing/reading at seat | `isActive = true` and at assigned seat     |
| `WALK` | 4-frame walk cycle     | Path computed via BFS, moving tile-by-tile |
| `IDLE` | Static standing pose   | `isActive = false`, wandering randomly     |

### FSM States (Implemented)

The FSM needs to be refactored to support command-driven behavior:

| State        | Animation                           | Trigger                              |
| ------------ | ----------------------------------- | ------------------------------------ |
| `TYPING`     | Typing at desk (Execution Pod)      | `GENERATE_CODE` command              |
| `READING`    | Reading at bookshelf (Archive)      | `RAG_SEARCH` command                 |
| `THINKING`   | Standing at whiteboard              | `THINK` command                      |
| `WALKING`    | 4-frame walk cycle                  | Any command that requires relocation |
| `IDLE`       | Sitting on sofa / at coffee machine | `WAIT` command or no active command  |
| `DISCARDING` | Tossing into bin                    | `TRIM_CONTEXT` command               |

### Wander Logic (TO BE REMOVED)

The current code in `characters.ts` still contains the **aimless wander** logic from the original boilerplate:

- `wanderTimer` — countdown before picking a random walkable tile
- `wanderCount` / `wanderLimit` — tracks number of random moves before returning to seat
- Random tile selection: `walkableTiles[Math.floor(Math.random() * walkableTiles.length)]`
- `WANDER_PAUSE_MIN_SEC` / `WANDER_PAUSE_MAX_SEC` — random pause between wanders
- `SEAT_REST_MIN_SEC` / `SEAT_REST_MAX_SEC` — rest duration at seat between wander rounds

**All of this must be surgically removed** and replaced with command-driven navigation where agents only move when instructed by the backend.

### Character Creation

`createCharacter()` sets initial state: position at seat center, palette (0-5) + hueShift for visual diversity. First 6 agents get unique skins via `pickDiversePalette()`; beyond 6, skins repeat with random hue shifts (45–315°). Matrix-style digital rain spawn effect (0.3s) on creation.

### Sprites

6 pre-colored character PNGs (`char_0.png`–`char_5.png`), each 112×96: 7 frames × 16px wide, 3 direction rows × 32px tall. Row 0 = down, Row 1 = up, Row 2 = right. Left = flipped right at runtime. Frame order: walk1, walk2, walk3, type1, type2, read1, read2.

## Rendering Engine

**Game Loop**: `requestAnimationFrame` at 60 FPS with delta time capped at 0.1s. State in imperative `OfficeState` class (not React state).

**Pixel-perfect rendering**: Zoom = integer device-pixels-per-sprite-pixel (1x–10x). No `ctx.scale(dpr)`. Default zoom = `Math.round(2 * devicePixelRatio)`. Z-sort all entities by Y.

**Camera**: Pan via middle-mouse drag. `cameraFollowId` smoothly centers on followed agent; set on click, cleared on deselection or manual pan.

**Z-sorting**: Characters use `ch.y + TILE_SIZE/2 + 0.5` so they render in front of same-row furniture. Chair z-sorting: non-back chairs `zY = (row+1)*TILE_SIZE`; back-facing chairs `zY = (row+1)*TILE_SIZE + 1`.

**Matrix spawn/despawn**: 0.3s digital rain animation. 16 columns sweep top-to-bottom with staggered timing. Spawn: green rain reveals character. Despawn: green rain consumes character.

## UI Styling

**Design Language**: Pixel art aesthetic — sharp corners (`borderRadius: 0`), solid backgrounds, `2px solid` borders, hard offset shadows (`2px 2px 0px`, no blur). BUT the overall palette is **bright white + sky-blue**, not dark.

**CSS Variables**: Defined in `globals.css` `:root` (`--pixel-bg`, `--pixel-border`, `--pixel-accent`, etc.). These need to be updated to match the Data Nexus aesthetic (white/sky-blue/soft).

**Speech Bubbles**: Permission ("..." amber dots) stays until cleared. Waiting (green checkmark) auto-fades 2s.

**Sound**: Ascending two-note chime (E5 → E6) via Web Audio API on agent status events.

## Layout System

**Layout Model**: `{ version: 1, cols, rows, tiles: TileType[], furniture: PlacedFurniture[], tileColors?: FloorColor[] }`. Dynamic grid dimensions. Default: 20×11 tiles. Max: 64×64.

**Seats**: Derived from chair furniture. `layoutToSeats()` creates a seat at every footprint tile of every chair. Multi-tile chairs produce multiple seats. Facing direction from chair orientation or adjacent desk.

**Pathfinding**: BFS on walkability grid (`tileMap.ts`). Chair tiles blocked for all characters except their own assigned seat (`withOwnSeatUnblocked`).

**Auto-state**: Electronics swap to ON sprites when active agent faces a desk with that item nearby (3 tiles deep, 1 tile to each side).

## Layout Editor

Toggle via "Layout" button. Tools: SELECT, Floor paint, Wall paint, Erase, Furniture place, Furniture pick, Eyedropper.

**Floor**: 7 grayscale patterns, colorizable via HSBC sliders.
**Walls**: Click/drag to add/remove. HSBC color sliders apply to all wall tiles.
**Furniture**: Ghost preview (green/red), R to rotate, T to toggle state. Drag-to-move. HSBC color per-item.
**Undo/Redo**: 50-level, Ctrl+Z/Y.
**Grid expansion**: Ghost border 1 tile outside grid, click to expand.

## Asset System

**Catalog**: `furniture-catalog.json` with id, name, label, category, footprint, isDesk, canPlaceOnWalls, groupId, orientation, state, canPlaceOnSurfaces, backgroundTiles. Categories: desks, chairs, storage, electronics, decor, wall, misc.

**Rotation groups**: `buildDynamicCatalog()` builds rotation groups from shared `groupId`. Editor shows 1 item per group.

**State groups**: Items with `state: "on"/"off"` sharing `groupId` + `orientation` form toggle pairs.

**Surface placement**: Items like monitors/laptops can overlap desk tiles. Z-sort ensures they render in front.

**Colorize module**: Two modes — Colorize (grayscale→HSL, for floors) and Adjust (HSL shift, for furniture/characters).

**Load order**: `characterSpritesLoaded` → `floorTilesLoaded` → `wallTilesLoaded` → `furnitureAssetsLoaded` → `layoutLoaded`.

## COMPLETED

- [x] **Milestone 1: Remove Aimless Wander** — Wander logic, timers, and random tile selection removed from `characters.ts`.
- [x] **Milestone 2: Wire Up PalaceEventBridge** — WebSocket client created in `bridge.ts` and connected to FastAPI.
- [x] **Milestone 3: Command-Driven FSM** — Characters now move and animate purely based on backend commands.

## Immediate Milestones

### Milestone 4: Data Nexus Theme

- Update CSS variables in `globals.css` to white/sky-blue/soft palette
- Update renderer colors for the bright, clean aesthetic
- Design the 3-zone room layout as the new `default-layout.json`

### Milestone 5: Strip Legacy Logic

- Remove all references to VS Code API from `src/lib/engine/`
- Standardize on `PalaceEventBridge` for all state updates
- Ensure root-level `package.json` manages all build dependencies

## Build & Dev

```sh
npm install && npm run dev
```

Dev: `next dev` at `localhost:3000`. Backend: `uvicorn backend.main:app --reload` at `localhost:8765`.

Build: `next build` → production bundle.

## TypeScript Constraints

- No `enum` (`erasableSyntaxOnly`) — use `as const` objects
- `import type` required for type-only imports (`verbatimModuleSyntax`)
- `noUnusedLocals` / `noUnusedParameters`

## Constants

All magic numbers and strings are centralized — never add inline constants:

- **Webview**: `src/lib/engine/constants.ts` — grid/layout sizes, character animation speeds, matrix effect params, rendering offsets/colors, camera, zoom, editor defaults, game logic thresholds
- **CSS styling**: `src/app/globals.css` `:root` block — `--pixel-*` custom properties
- **Canvas overlay colors** (rgba strings) live in the engine constants file (used in canvas 2D context, not CSS)
- `src/lib/engine/office/types.ts` re-exports grid/layout constants from `constants.ts`

## Key Patterns

- 60 FPS HTML5 Canvas game loop with smooth BFS pathfinding
- State-machine animations for characters (FSM in `characters.ts`)
- Imperative game state (`OfficeState` class) separate from React render cycle
- Pixel-perfect zoom with integer scaling
- Matrix-style digital rain for spawn/despawn effects
- Z-sorted isometric-style rendering for depth
- `crypto.randomUUID()` for unique IDs

## Lessons & Technical Gotchas

### Rendering & Assets
- **Tile Size**: `TILE_SIZE` is **16px**, not 32px. Assuming 32px leads to oversized sprites and visual misalignment (e.g., the "white band" issue).
- **SpriteData Structure**: `SpriteData` is a **2D array of strings** (`string[][]`), representing `[row][col]`. 
  - Standard JS `slice()` on this array extracts *rows*, not individual pixels.
  - Correct flattening for a 16px tile is `slice(0, 16)` or `slice(16, 32)` depending on asset orientation.
- **Flat Aesthetic**: For the "Data Nexus" flat aesthetic, generating solid color tiles via code is more reliable than slicing legacy 3D sprites.

### Operational Protocol (HARDENED)
- **Sentinel Header**: EVERY response MUST begin with the Expert Scan header.
- **Failure Penalty**: If the header is missed, the AI MUST stop immediately, apologize, and re-read `CLAUDE.md` before continuing. **Protocol > Speed.**
- **Diagnostic Verification**: Use a "Red Screen Test" (Diagnostic Color Change) to prove that code changes are reaching the browser.
- **Mandatory Planning**: NO code changes are allowed without an approved implementation plan.



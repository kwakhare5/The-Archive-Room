# Tasks: Archive Room Intelligence Phase

- [x] **Phase 0: Engineering Hardening**
    - [x] Consolidate Global Standards into `GEMINI.md` / `AGENTS.md`
    - [x] Implement **Absolute Permission Protocol** (Big vs Small tasks)
    - [x] Enforce **Project Tracking Standard** (`task.md`, `walkthrough.md`)
    - [x] Sync `CLAUDE.md` milestones with current project state

- [x] **Phase 1: Backend Intelligence**
    - [x] Add `google-generativeai` to `requirements.txt`
    - [x] Implement `backend/reasoning.py` (Gemini Logic)
    - [x] Create `POST /agent/query` endpoint in `main.py`
    - [x] Test agent command broadcasting via WebSockets

- [x] **Phase 2: Communication Bridge**
    - [x] Update `PalaceEventBridge` to handle Gemini command format
    - [x] Integrate `AgentQueryInput` component for user dispatch
    - [x] Connect bridge to `OfficeState.executeCommand`
    - [x] Implement "Thought" metadata passthrough to agents

- [x] **Phase 3: Visual Polish & Integration**
    - [x] Display agent thoughts in `ToolOverlay`
    - [x] Add Pulse Effect for target furniture during interaction
    - [x] Final UI verification and production lock

- [x] **Phase 4: Protocol Hardening & Alignment**
    - [x] Rename project to `the-archive-room` in `package.json`
    - [x] Perform Global Protocol Audit in `ARCHITECT_AUDIT.md`
    - [x] Update `CLAUDE.md` with Architectural Justification for Next.js 16/Custom Engine
    - [x] Verify production build stability (`npm run build`)
    - [x] Finalize "Living Documents" sync

- [x] **Phase 5: Persistence Unification**
    - [x] Consolidate fragmented `localStorage` keys in `vscodeApi.ts`
    - [x] Update `browserMock.ts` to use unified `archive-room-config`
    - [x] Implement legacy key migration path
    - [x] Sync agent seat persistence across reloads
    - [x] Verify unified state restoration in browser

- [x] **Phase 6: Architectural Mastery & Reactivity**
    - [x] Perform Semantic Renaming (Office → Nexus/Archive) across entire codebase
    - [x] Refactor `ArchiveEngine` and `EditorState` into encapsulated imperative stores
    - [x] Resolve React Hot-Reloading and Prop Mutation errors via setter methods
    - [x] Standardize `localStorage` keys to `archive-room-config`
    - [x] Verify production build stability and dev server hot-reloading
    - [x] Final sync of Living Documents (`task.md`, `walkthrough.md`, `CLAUDE.md`)

# ARCHITECT_AUDIT - The Archive Room

**Audit Date**: 2026-04-23
**Architect**: Nexus Architect (@TAG triggered)
**Status**: 🔴 CRITICAL PATH IDENTIFIED

---

## 1. Identified Risks & Vulnerabilities

### A. Semantic Mapping Gap (Critical)
*   **Risk**: The Backend (Gemini) generates high-level intent (e.g., "Check the archives"), but has no mapping to the spatial `furnitureUid` or (x,y) coordinates in the `ArchiveEngine`.
*   **Impact**: Agents will fail to move or move to incorrect locations, breaking the "Nexus" illusion.
*   **Prediction**: LLM will hallucinate target IDs like "archive_1" when the actual UID is "A-012".

### B. State Desync (High)
*   **Risk**: The Backend is stateless. If the user moves furniture in the UI (Edit Mode), the Backend's understanding of the room layout becomes stale.
*   **Impact**: Agents will walk into walls or stand where furniture used to be.
*   **Prediction**: Conflict between `default-layout.json` (baseline) and the active runtime state.

### C. WebSocket Saturation (Medium)
*   **Risk**: Rapid-fire commands from Gemini (e.g., thinking + moving + talking) might overwhelm the single WebSocket bridge if not throttled.
*   **Impact**: UI lag or disconnected socket events.
*   **Prediction**: Race conditions in `ArchiveEngine.executeCommand`.

### D. Dependency Mismatch (Low)
*   **Risk**: Next.js 16 + React 19 are bleeding edge. Standard libraries for WebSockets or LLM integration may have peer dependency conflicts.
*   **Impact**: Build failures during `npm run build`.

---

## 2. Solution Roadmap & Trade-offs

### Strategy 1: The Spatial Manifest (Solves Risk A & B)
*   **Mechanism**: The Backend will receive a **Spatial Manifest** (JSON summary of all furniture names + UIDs) at the start of every query.
*   **Trade-off**: Increases token usage slightly, but ensures 100% accuracy in target selection.

### Strategy 2: Event Acknowledgement Loop (Solves Risk C)
*   **Mechanism**: Implement a `seq` (sequence number) for commands. The Backend waits for an `AGENT_IDLE` or `COMMAND_ACK` event before sending the next complex instruction for that specific agent.
*   **Trade-off**: Slower agent reaction time, but guarantees logical consistency.

### Strategy 3: Dynamic Context Injection (Solves Risk B)
*   **Mechanism**: Before every Gemini prompt, the Backend queries the Frontend for the current layout hash. If different from baseline, it requests the full layout.
*   **Trade-off**: Higher latency for the first query in a session.

---

## 4. Final Verdict
The architecture is **Stable** but requires a **Semantic Bridge** to translate LLM logic into Spatial actions. Proceeding with Backend implementation with **Spatial Manifest** injection as the primary guardrail.

---
> [!IMPORTANT]
> **SYSTEM LOCKDOWN**: No changes to `src/lib/engine/engine/renderer.ts` permitted during backend implementation to avoid breaking the core canvas loop.

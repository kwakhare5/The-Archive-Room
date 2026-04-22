# Implementation Plan: Archive Room Intelligence Phase

Connect the "The Archive Room" UI to a real-time agent reasoning engine driven by FastAPI and Gemini.

## User Review Required

> [!IMPORTANT]
> This phase requires the **FastAPI backend (`localhost:8765`)** to be running simultaneously with the frontend.

## Proposed Changes

### 1. Backend Enhancement (FastAPI)
- [x] **Gemini Integration**: Add `google-generativeai` to `requirements.txt`.
- [x] **Reasoning Engine**: Create a `reasoning.py` module that uses Gemini to map user queries to agent actions (RAG_SEARCH, THINK, TRIM).
- [x] **Command API**: Add `POST /agent/query` to trigger agent tasks.

### 2. Frontend WebSocket Bridge (React)
- [x] **`useWebSocket` Hook**: Implement a robust hook in `src/hooks/useWebSocket.ts`.
- [x] **Agent Controller**: Create `src/lib/engine/agentController.ts` to handle incoming `AGENT_COMMAND` messages and drive character movement.

### 3. Visual Feedback
- [x] **Thought Bubbles**: Add floating UI elements over agents when they are in "THINK" or "SEARCH" mode.
- [x] **Target Highlighting**: Pulse the target furniture when an agent is moving toward it.

## Verification Plan

### Automated Tests
- Test WebSocket connection stability.
- Verify `AGENT_COMMAND` payload structure matches between Python and TS.

### Manual Verification
- Send a query via Postman/Curl: `POST /agent/query {"text": "Where is the iPod documentation?"}`.
- Observe agent moving to a Bookshelf and displaying a "Searching..." state.

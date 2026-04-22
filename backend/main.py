import os
import json
import asyncio
import logging
from typing import Dict, List, Set, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Setup logging (Industry Standard)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ArchiveRoom")

# Load environment variables
load_dotenv()
from reasoning import brain

app = FastAPI(title="The Archive Room Backend")

# Enable CORS for React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- State Management ---
class ConnectionManager:
    """Manages active WebSocket connections."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New UI client connected.")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info("UI client disconnected.")

    async def broadcast(self, message: dict):
        """Send a message to all connected UIs."""
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# --- Agent Commands ---
@app.get("/")
async def root():
    return {"status": "The Archive Room Backend is Online"}

from pydantic import BaseModel

class QueryRequest(BaseModel):
    query: str
    agentId: Optional[int] = 0

@app.post("/agent/query")
async def process_query(req: QueryRequest):
    """Processes a user query and dispatches an agent action."""
    logger.info(f"Processing query: {req.query}")
    
    # 1. Ask Gemini to decide what to do
    action = await brain.decide_action(req.query, req.agentId)
    
    # 2. Broadcast the action to all connected UIs
    await manager.broadcast(action)
    
    return {
        "status": "dispatched",
        "action": action
    }

class LayoutData(BaseModel):
    layout: dict

@app.post("/save-layout")
async def save_layout_api(data: LayoutData):
    try:
        # Save to public/assets/office-redesign.json (Relative to project root)
        # Assuming we are running from project root or backend folder
        target_path = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "office-redesign.json")
        with open(target_path, "w") as f:
            json.dump(data.layout, f, indent=2)
        logger.info(f"Layout saved to {target_path}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to save layout: {e}")
        return {"status": "error", "message": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            logger.info(f"Received from UI: {message}")
            
            if message.get("type") == "saveLayout":
                # Handle save via websocket too
                target_path = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "office-redesign.json")
                with open(target_path, "w") as f:
                    json.dump(message.get("layout"), f, indent=2)
                logger.info(f"Layout saved via WebSocket to {target_path}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket)

# --- Pro-Tip: Helper to send agent commands ---
async def send_agent_command(agent_id: int, command: str, target_uid: str, metadata: dict = None):
    """
    Industry Standard way to command agents.
    agent_id: The character ID in the room
    command: RAG_SEARCH, THINK, TRIM_CONTEXT, FETCH_MEMORY
    target_uid: The furniture ID (Bookshelf, Whiteboard, etc)
    """
    payload = {
        "type": "AGENT_COMMAND",
        "agentId": agent_id,
        "command": command,
        "targetUid": target_uid,
        "metadata": metadata or {}
    }
    await manager.broadcast(payload)
    logger.info(f"Dispatched command {command} to agent {agent_id} at {target_uid}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)

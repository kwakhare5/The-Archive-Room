import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .reasoning import get_agent_command

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    agent_id: int = 1
    spatial_manifest: dict = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.queues: dict[int, list[dict]] = {} # agentId -> command queue

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Frontend connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Frontend disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

    async def process_next(self, agent_id: int):
        if agent_id in self.queues and self.queues[agent_id]:
            next_cmd = self.queues[agent_id].pop(0)
            print(f"Sending next command for Agent {agent_id}: {next_cmd['command']}")
            await self.broadcast(next_cmd)
        else:
            print(f"Queue empty for Agent {agent_id}")

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"status": "Archive Room Backend Active"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            print(f"Event from frontend: {event.get('event')}")
            
            if event.get("event") == "ANIMATION_COMPLETE":
                agent_id = event.get("agentId")
                if agent_id:
                    await manager.process_next(agent_id)
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket)

@app.post("/agent/query")
async def agent_query(request: QueryRequest):
    print(f"Query received: {request.query}")
    
    result = get_agent_command(request.query, request.spatial_manifest)
    
    # Handle both single command and list of commands
    commands = result if isinstance(result, list) else [result]
    
    if not commands:
        return {"status": "No commands generated"}

    # Initialize queue for the primary agent
    agent_id = commands[0].get("agentId", 1)
    manager.queues[agent_id] = commands
    
    # Kick off the first command
    await manager.process_next(agent_id)
    
    return {"status": "Sequence queued", "count": len(commands)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)

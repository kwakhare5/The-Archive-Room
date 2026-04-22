import asyncio
import json
import websockets
import random

# The WebSocket server will run on this port
PORT = 8765

# Known furniture UIDs from The Archive Room
TARGETS = [
    "whiteboard-1776801346507", # The large whiteboard
    "o_pc_1",                  # Desk 1 PC
    "o_pc_2",                  # Desk 2 PC
    "purge_bin",               # The Purge Station (Bin)
]

# Commands we can send
COMMANDS = [
    "RAG_SEARCH",
    "FETCH_MEMORY",
    "THINK",
    "TRIM_CONTEXT"
]

async def handle_ui_connection(websocket):
    print(f"--- [UI Connected] ---")
    
    try:
        # Give the UI a moment to stabilize
        await asyncio.sleep(2)
        
        while True:
            # Pick a random agent (Agent 1 is usually always there)
            agent_id = 1
            command = random.choice(COMMANDS)
            target = random.choice(TARGETS)
            
            payload = {
                "command": command,
                "agentId": agent_id,
                "target": target
            }
            
            print(f"Sending Command: {command} to {target} for Agent {agent_id}")
            await websocket.send(json.dumps(payload))
            
            # Wait for the agent to finish the walk + interaction
            # (Walk ~3s + Interaction ~4s + Buffer)
            await asyncio.sleep(15)
            
    except websockets.exceptions.ConnectionClosed:
        print("--- [UI Disconnected] ---")

async def main():
    print(f"Backend Brain active on ws://localhost:{PORT}")
    print("Waiting for The Archive Room UI to connect...")
    async with websockets.serve(handle_ui_connection, "localhost", PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBackend stopped.")

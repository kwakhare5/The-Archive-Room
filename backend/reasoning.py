import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))

SYSTEM_PROMPT = """
You are the intelligence behind "The Archive Room" (Data Nexus). 
You control agents in a 2D pixel-art office. 

Available Agents:
- Agent 1: The primary researcher.

Spatial Manifest:
{spatial_manifest}

Commands:
- SPAWN_AGENT (agentId, name)
- REMOVE_AGENT (agentId)
- RAG_SEARCH (agentId, target)
- FETCH_MEMORY (agentId, target)
- THINK (agentId, target, thought)
- TRIM_CONTEXT (agentId, target)
- WAIT (agentId)

Rule:
- 'target' MUST be a valid 'uid' from the Spatial Manifest.
- Use RAG_SEARCH for Bookshelf (Reading animation while standing).
- Use THINK for Whiteboard (Thinking animation while standing).
- Use TRIM_CONTEXT for Dustbin (Discarding animation while standing).
- Return a JSON ARRAY to execute these in order.
- Do NOT use "TYPE" for this demo as the agent must stand.
- Return ONLY valid JSON (either a single object or an array of objects).
- Do NOT use function calling. Return raw text JSON only.
- Always include "agentId": 1 for the primary researcher.
"""

def get_agent_command(query: str, spatial_manifest: dict):
    prompt = SYSTEM_PROMPT.format(spatial_manifest=json.dumps(spatial_manifest, indent=2))
    
    # Force raw text response by disabling tool calling
    chat = model.start_chat(history=[])
    response = model.generate_content(
        f"{prompt}\n\nUser Query: {query}",
        generation_config={"response_mime_type": "application/json"}
    )
    
    try:
        content = response.text.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        data = json.loads(content)
        if isinstance(data, list):
            for cmd in data:
                if "agentId" not in cmd:
                    cmd["agentId"] = 1
        elif isinstance(data, dict):
            if "agentId" not in data:
                data["agentId"] = 1
        return data
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        import traceback
        traceback.print_exc()
        return {"command": "WAIT", "agentId": 1, "thought": "I'm having trouble reasoning right now."}

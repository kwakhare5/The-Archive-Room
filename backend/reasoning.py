import os
import google.generativeai as genai
from typing import Optional, Dict
import json
import logging

logger = logging.getLogger("ArchiveRoom.Reasoning")

class AgentBrain:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            logger.warning("GOOGLE_API_KEY not set. Agents will use fallback random logic.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def decide_action(self, query: str, agent_id: int) -> Dict:
        """
        Uses Gemini to decide what an agent should do.
        """
        if not self.model:
            # Fallback mock logic
            return {
                "type": "AGENT_COMMAND",
                "agentId": agent_id,
                "command": "THINK",
                "targetUid": "WHITEBOARD",
                "thought": "I don't have an API key, so I'll just stand by the whiteboard and look busy."
            }

        prompt = f"""
        You are the 'Brain' of a Memory Palace simulation. 
        A user has sent a query: "{query}"
        
        Available Furniture (Interactive Zones):
        - ARCHIVE_ROOM (General area)
        - BOOKSHELF (Search for knowledge/RAG)
        - WHITEBOARD (Synthesize ideas/Thinking)
        - BIN (Discarding irrelevant context)
        - PC (Technical operations)
        
        Available Commands:
        - RAG_SEARCH: Go to a Bookshelf
        - THINK: Go to the Whiteboard
        - TRIM_CONTEXT: Go to the Bin
        - MOVE_TO: Go to any furniture
        
        Respond ONLY with a JSON object:
        {{
            "command": "ONE_OF_COMMANDS",
            "targetUid": "FURNITURE_ID",
            "thought": "Short sentence about what the agent is doing"
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            # Basic JSON extraction (naive)
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            
            decision = json.loads(text)
            return {
                "type": "AGENT_COMMAND",
                "agentId": agent_id,
                "command": decision.get("command", "THINK"),
                "targetUid": decision.get("targetUid", "WHITEBOARD"),
                "thought": decision.get("thought", "Thinking about the task...")
            }
        except Exception as e:
            logger.error(f"Gemini reasoning failed: {e}")
            return {
                "type": "AGENT_COMMAND",
                "agentId": agent_id,
                "command": "THINK",
                "targetUid": "WHITEBOARD",
                "thought": "I had a brain freeze (API Error)."
            }

brain = AgentBrain()

import { Agent } from '../../domain/models/Agent';
import { AgentState } from '../../domain/models/AgentState';
import { CharacterSprites } from '@/shared/lib/engine/sprites/characterSpriteManifest';
import { SpriteData } from '@/shared/types/types';

/**
 * SpriteSelector
 * 
 * Maps Agent domain state and direction to the correct visual sprite frame.
 */
export function getAgentSprite(agent: Agent, sprites: CharacterSprites): SpriteData {
  const dir = agent.dir;
  
  if (agent.state === AgentState.WALK) {
    const frames = sprites.walk[dir];
    return frames[agent.frame % frames.length];
  }
  
  if (agent.state === AgentState.TYPE || agent.state === AgentState.THINKING) {
    const frames = sprites.typing[dir];
    return frames[agent.frame % frames.length];
  }

  if (agent.state === AgentState.READING) {
    const frames = sprites.reading[dir];
    return frames[agent.frame % frames.length];
  }
  
  // Default: Idle (neutral standing frame, which is usually index 1 of walk animation)
  return sprites.walk[dir][1];
}

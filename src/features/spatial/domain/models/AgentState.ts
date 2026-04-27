export const AgentState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
  READING: 'reading',
  THINKING: 'thinking',
  DISCARDING: 'discarding',
} as const;

export type AgentState = (typeof AgentState)[keyof typeof AgentState];

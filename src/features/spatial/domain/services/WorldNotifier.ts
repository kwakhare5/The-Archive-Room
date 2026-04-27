export interface WorldNotifier {
  notifyArrival(agentId: number, furnitureUid: string, command: string): void;
  notifyInteractionComplete(agentId: number, command: string): void;
  notifyAgentAdded(agentId: number): void;
  notifyAgentRemoved(agentId: number): void;
}

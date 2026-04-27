import { WorldNotifier } from '../../domain/services/WorldNotifier';
import { palaceBridge } from '@/shared/lib/bridge';

export class VscodeWorldNotifier implements WorldNotifier {
  public notifyArrival(agentId: number, furnitureUid: string, command: string): void {
    palaceBridge.notifyArrival(agentId, furnitureUid, command);
  }

  public notifyInteractionComplete(agentId: number, command: string): void {
    palaceBridge.notifyInteractionComplete(agentId, command);
  }

  public notifyAgentAdded(agentId: number): void {
    // Current bridge doesn't have this, but could be added if needed
  }

  public notifyAgentRemoved(agentId: number): void {
    // Current bridge doesn't have this
  }
}

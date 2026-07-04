import { LaneId } from '../models/SignalPacket';

const registry: Record<LaneId, string> = {
  PING: 'Ping Diagnostic Lane',
  SHOP: 'Shop Commerce Lane',
  SOCIAL: 'Social Interaction Lane',
  PUBLIC: 'Public Broadcast Lane',
  PRIVATE: 'Private Identity Lane',
  NEEDS: 'Needs Resolution Lane',
  ICAN: 'ICAN Capability Lane'
};

export function getLaneName(lane: LaneId): string {
  return registry[lane];
}

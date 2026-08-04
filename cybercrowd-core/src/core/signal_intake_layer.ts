import { SignalPacket, LaneId, BlinkState, ProximityProfile } from '../models/SignalPacket';

export function intakeSignal(params: {
  originUserId: string;
  lane: LaneId;
  proximity?: ProximityProfile;
}): SignalPacket {
  const now = Date.now();

  return {
    id: `pkt_${now}_${Math.random().toString(16).slice(2)}`,
    originUserId: params.originUserId,
    lane: params.lane,
    blink: 'READY',
    createdAt: new Date(now).toISOString(),
    dormantAgeMs: 0,
    proximity: params.proximity
  };
}
 

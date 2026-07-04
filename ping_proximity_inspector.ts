import { SignalPacket } from '../models/SignalPacket';
import { PingSnapshot } from './ping_snapshot';

// >>>> CYBERCROWD-CORE: Proximity Layer
// >>>> Reads packet internals to determine its pre-fire aura.
// >>>> NET uses this to show “live motion” before a blink-state transition.

export interface PingProximity {
  packetId: string;      // >>>> Packet identity
  lane: string;          // >>>> Lane identity
  state: string;         // >>>> Current blink-state
  nextState: string;     // >>>> Predicted next blink-state
  snapshot: PingSnapshot;// >>>> Frozen visibility artifact
  inspectedAt: number;   // >>>> Timestamp of proximity inspection
}

export function inspectProximity(packet: SignalPacket): PingProximity {
  const blinkSeq = ['ON','READY','FIRE','TAKEOVER','ARCHIVE'];
  const idx = blinkSeq.indexOf(packet.state);
  const next = blinkSeq[idx + 1] || packet.state;

  return {
    packetId: packet.id,
    lane: packet.lane,
    state: packet.state,
    nextState: next,
    snapshot: {
      packetId: packet.id,
      lane: packet.lane,
      state: packet.state,
      diagnostic: (packet as any).diagnostic,
      capturedAt: Date.now()
    },
    inspectedAt: Date.now()
  };
}

import { SignalPacket } from '../models/SignalPacket';
import { routePingDiagnostic } from './ping_diagnostic_router';
import { getBlinkSequence } from './lane_blink_matrix';

export function triggerPing(packet: SignalPacket) {
  const seq = getBlinkSequence(packet.lane);
  const next = seq[seq.indexOf(packet.state) + 1] || packet.state;
  const updated = { ...packet, state: next };
  return routePingDiagnostic(updated);
}

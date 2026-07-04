import { SignalPacket } from '../models/SignalPacket';
import { inspectProximity } from '../core/ping_proximity_inspector';

// >>>> CYBERCROWD-NET: Proximity Gateway
// >>>> NET never reads packet internals directly.
// >>>> NET only calls CORE visibility functions and returns the artifact upward.
// >>>> This prevents double-trouble: NET transports, CORE interprets.

export function netProximity(packet: SignalPacket) {
  return inspectProximity(packet);
}

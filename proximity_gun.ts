import { SignalPacket, ProximityProfile } from '../models/SignalPacket';
import { advanceToFire } from './blink_state_engine';

export function applyProximity(
  packet: SignalPacket,
  proximity: ProximityProfile
): SignalPacket {
  const updated = { ...packet, proximity };
  return advanceToFire(updated);
}

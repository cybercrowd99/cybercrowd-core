import { SignalPacket, UserAction } from '../models/SignalPacket';
import { advanceToArchive } from './blink_state_engine';

export function applyUserAction(
  packet: SignalPacket,
  action: UserAction
): SignalPacket {
  const updated = { ...packet, lastAction: action };
  return advanceToArchive(updated);
}

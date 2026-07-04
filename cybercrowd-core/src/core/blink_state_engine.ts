import { SignalPacket, BlinkState } from '../models/SignalPacket';

export function setBlink(packet: SignalPacket, state: BlinkState): SignalPacket {
  return { ...packet, blink: state };
}

export function advanceToFire(packet: SignalPacket): SignalPacket {
  return setBlink(packet, 'FIRE');
}

export function advanceToTakeover(packet: SignalPacket): SignalPacket {
  return setBlink(packet, 'TAKEOVER');
}

export function advanceToArchive(packet: SignalPacket): SignalPacket {
  return setBlink(packet, 'ARCHIVE');
}

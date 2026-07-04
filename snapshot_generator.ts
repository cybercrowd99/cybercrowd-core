import { SignalPacket } from '../models/SignalPacket';

export function generateSnapshot(packet: SignalPacket): SignalPacket {
  const snapshotId = `snap_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return { ...packet, snapshotId };
}

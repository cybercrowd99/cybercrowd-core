import { SignalPacket } from '../models/SignalPacket';
import { PingDiagnostic } from './ping_diagnostic_core';

export interface PingSnapshot {
  packetId: string;
  lane: string;
  state: string;
  diagnostic?: PingDiagnostic;
  capturedAt: number;
}

export function snapshotPing(packet: SignalPacket): PingSnapshot {
  return {
    packetId: packet.id,
    lane: packet.lane,
    state: packet.state,
    diagnostic: (packet as any).diagnostic,
    capturedAt: Date.now()
  };
}

import { SignalPacket } from '../models/SignalPacket';
import { getLaneName } from './lane_registry';
import { getBlinkSequence } from './lane_blink_matrix';

export interface PingDiagnostic {
  packetId: string;
  lane: string;
  blinkPath: string[];
  timestamp: number;
}

export function diagnosePing(packet: SignalPacket): PingDiagnostic {
  return {
    packetId: packet.id,
    lane: getLaneName(packet.lane),
    blinkPath: getBlinkSequence(packet.lane),
    timestamp: Date.now()
  };
}

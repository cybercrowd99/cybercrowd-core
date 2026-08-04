/**
 * CyberCrowd CORE — Ping Diagnostic Core
 *
 * Layer:
 * CORE / Diagnostic Processing
 *
 * Owns:
 * - Creating PingDiagnostic output from SignalPacket state
 * - Resolving lane naming through lane_registry
 * - Resolving blink path through lane_blink_matrix
 *
 * Does NOT Own:
 * - NET surface handling
 * - UI rendering
 * - Identity ownership
 * - Authentication
 * - Payments
 * - Analytics
 * - Tracking
 * - External routing
 * - Persistent storage authority
 *
 * Boundary:
 *
 * SignalPacket
 *      ↓
 * CORE diagnostic processing
 *      ↓
 * PingDiagnostic
 *
 * Security:
 * - No hidden synchronization
 * - No behavioral profiling
 * - No external side effects
 */

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

/**
 * CyberCrowd CORE — Ping Snapshot Processor
 *
 * Layer:
 * CORE / Diagnostic State Processing
 *
 * Owns:
 * - Capturing a snapshot view of a SignalPacket
 * - Preserving packet identity references within CORE
 * - Attaching optional diagnostic state reference
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
 * SignalPacket
 *      ↓
 * CORE snapshot capture
 *      ↓
 * PingSnapshot
 *
 * Security:
 * - No hidden synchronization
 * - No behavioral profiling
 * - No external side effects
 */

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

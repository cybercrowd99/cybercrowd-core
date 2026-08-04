/**
 * CyberCrowd CORE — Ping Diagnostic Router
 *
 * Layer:
 * CORE / Diagnostic Routing
 *
 * Owns:
 * - Passing SignalPacket into ping_diagnostic_core
 * - Receiving diagnostic output
 * - Sending updated packet state to dormant_packet_vault
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
 * CORE diagnostic evaluation
 *      ↓
 * Diagnostic result + dormant packet handoff
 *
 * Security:
 * - No hidden synchronization
 * - No behavioral profiling
 * - No external side effects
 */

import { SignalPacket } from '../models/SignalPacket';
import { diagnosePing } from './ping_diagnostic_core';
import { storeDormant } from './dormant_packet_vault';

export function routePingDiagnostic(packet: SignalPacket) {
  const diag = diagnosePing(packet);
  storeDormant({ ...packet, diagnostic: diag });
  return diag;
}

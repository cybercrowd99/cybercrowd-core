/**
 * CyberCrowd CORE — Ping Trigger Processor
 *
 * Layer:
 * CORE / Blink State Transition
 *
 * Owns:
 * - Advancing SignalPacket through lane blink sequence
 * - Determining next blink state from lane_blink_matrix
 * - Passing updated packet state into ping_diagnostic_router
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
 * CORE blink transition
 *      ↓
 * Ping diagnostic routing
 *
 * Security:
 * - No hidden synchronization
 * - No behavioral profiling
 * - No external side effects
 */

import { SignalPacket } from '../models/SignalPacket';
import { routePingDiagnostic } from './ping_diagnostic_router';
import { getBlinkSequence } from './lane_blink_matrix';

export function triggerPing(packet: SignalPacket) {
  const seq = getBlinkSequence(packet.lane);
  const next = seq[seq.indexOf(packet.state) + 1] || packet.state;
  const updated = { ...packet, state: next };
  return routePingDiagnostic(updated);
}

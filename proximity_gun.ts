/**
 * CyberCrowd CORE — Proximity Processor
 *
 * Layer:
 * CORE / Signal State Processing
 *
 * Owns:
 * - Applying ProximityProfile data to a SignalPacket
 * - Updating packet proximity state
 * - Passing state transition to blink_state_engine
 *
 * Does NOT Own:
 * - NET surface handling
 * - UI rendering
 * - Identity ownership
 * - Authentication
 * - Payments
 * - Analytics
 * - Tracking
 * - Storage authority
 * - External routing
 *
 * Boundary:
 * SignalPacket + ProximityProfile
 *        ↓
 * CORE state transition
 *        ↓
 * Updated SignalPacket
 *
 * Security:
 * - No hidden synchronization
 * - No behavioral profiling
 * - No external side effects
 */

import { SignalPacket, ProximityProfile } from '../models/SignalPacket';
import { advanceToFire } from './blink_state_engine';

export function applyProximity(
  packet: SignalPacket,
  proximity: ProximityProfile
): SignalPacket {
  const updated = { ...packet, proximity };
  return advanceToFire(updated);
}

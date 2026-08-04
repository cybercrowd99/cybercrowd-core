/**
 * CyberCrowd CORE — User Action Processor
 *
 * Layer:
 * CORE / Signal State Processing
 *
 * Owns:
 * - Applying a UserAction to a SignalPacket
 * - Updating packet action state
 * - Passing state transition to blink_state_engine
 *
 * Does NOT Own:
 * - NET surface handling
 * - UI behavior
 * - Identity ownership
 * - Authentication
 * - Payments
 * - Analytics
 * - Tracking
 * - Storage authority
 * - External routing
 *
 * Boundary:
 * SignalPacket enters CORE,
 * state transition occurs,
 * updated SignalPacket returns.
 *
 * Security:
 * - No hidden synchronization
 * - No behavioral profiling
 * - No external side effects
 */

import { SignalPacket, UserAction } from '../models/SignalPacket';
import { advanceToArchive } from './blink_state_engine';

export function applyUserAction(
  packet: SignalPacket,
  action: UserAction
): SignalPacket {
  const updated = { ...packet, lastAction: action };
  return advanceToArchive(updated);
}

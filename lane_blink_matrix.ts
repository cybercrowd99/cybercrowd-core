/**
 * CyberCrowd CORE — Lane Blink Matrix Organ
 *
 * Layer:
 * CORE / Blink State Definition Boundary
 *
 * Owns:
 * - lane blink-state sequence mapping
 * - local state progression reference
 * - lane-to-state vocabulary resolution
 *
 * Does NOT Own:
 * - NET surface handling
 * - UI rendering
 * - identity ownership
 * - authentication
 * - payments
 * - analytics
 * - behavioral tracking
 * - external routing authority
 * - persistent storage authority
 *
 * Boundary:
 * Lane identifiers enter CORE.
 * CORE resolves the permitted blink-state sequence.
 * The matrix provides a reference model only.
 *
 * Security:
 * - No hidden synchronization
 * - No identity binding
 * - No behavioral profiling
 * - No external side effects
 *
 * Doctrine:
 * Blink State Reference ≠ User Behavior Model
 * Blink State Reference ≠ External Control Authority
 */

// lane-blink-matrix.ts

import { LaneId, BlinkState } from '../models/SignalPacket';

const matrix: Record<LaneId, BlinkState[]> = {
  PING:   ['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE'],
  SHOP:   ['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE'],
  SOCIAL: ['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE'],
  PUBLIC: ['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE'],
  PRIVATE:['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE'],
  NEEDS:  ['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE'],
  ICAN:   ['ON', 'READY', 'FIRE', 'TAKEOVER', 'ARCHIVE']
};

export function getBlinkSequence(lane: LaneId): BlinkState[] {
  return matrix[lane];
}

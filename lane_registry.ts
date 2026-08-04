/**
 * CyberCrowd CORE — Lane Registry Organ
 *
 * Layer:
 * CORE / Lane Definition Boundary
 *
 * Owns:
 * - lane identifier mapping
 * - lane name resolution
 * - local lane vocabulary reference
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
 * CORE resolves the defined lane vocabulary.
 * The registry provides reference only.
 *
 * Security:
 * - No hidden synchronization
 * - No identity binding
 * - No behavioral profiling
 * - No external side effects
 *
 * Doctrine:
 * Lane Reference ≠ Identity Authority
 * Lane Reference ≠ Routing Authority
 */

// lane-registry.ts

import { LaneId } from '../models/SignalPacket';

const registry: Record<LaneId, string> = {
  PING: 'Ping Diagnostic Lane',
  SHOP: 'Shop Commerce Lane',
  SOCIAL: 'Social Interaction Lane',
  PUBLIC: 'Public Broadcast Lane',
  PRIVATE: 'Private Identity Lane',
  NEEDS: 'Needs Resolution Lane',
  ICAN: 'ICAN Capability Lane'
};

export function getLaneName(lane: LaneId): string {
  return registry[lane];
}

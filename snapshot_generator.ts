/**
 * CyberCrowd — Signal Snapshot Generator
 *
 * File:
 * src/services/generateSnapshot.ts
 *
 * Lane:
 * CORE / Signal Processing
 *
 * Owns:
 * - Creating a snapshot reference for an existing SignalPacket
 * - Preserving the original packet data
 * - Attaching snapshot identity metadata
 *
 * Does NOT Own:
 * - User identity storage
 * - Tracking
 * - Analytics
 * - Routing
 * - Persistence
 * - Network communication
 * - Ownership decisions
 *
 * Input:
 * - Existing SignalPacket
 *
 * Output:
 * - New SignalPacket with snapshotId attached
 *
 * Security:
 * - No external calls
 * - No hidden synchronization
 * - No data enrichment
 * - No mutation of original packet
 */

import { SignalPacket } from '../models/SignalPacket';

export function generateSnapshot(packet: SignalPacket): SignalPacket {
  const snapshotId = `snap_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;

  return {
    ...packet,
    snapshotId,
  };
}

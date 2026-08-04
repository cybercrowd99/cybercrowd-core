/**
 * CyberCrowd — Signal Router
 *
 * File:
 * signal_router.ts
 *
 * Owns:
 * - Routing incoming signal packets
 * - Connecting signal intake to dormant storage
 * - Returning the generated SignalPacket
 *
 * Does NOT Own:
 * - Identity ownership
 * - User authentication
 * - Analytics
 * - Tracking
 * - Payment handling
 * - External communication
 *
 * Flow:
 *
 * Signal Input
 *      ↓
 * signal_intake_layer
 *      ↓
 * SignalPacket
 *      ↓
 * dormant_packet_vault
 *
 * Security:
 * - No behavior analysis
 * - No hidden synchronization
 * - No mutation outside owned flow
 */

import { SignalPacket, LaneId } from '../models/SignalPacket';
import { intakeSignal } from './signal_intake_layer';
import { storeDormant } from './dormant_packet_vault';

export function routeSignal(
  originUserId: string,
  lane: LaneId
): SignalPacket {
  const packet = intakeSignal({ originUserId, lane });
  storeDormant(packet);
  return packet;
}

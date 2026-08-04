/**
 * CyberCrowd CORE — Dormant Packet Vault Organ
 *
 * Layer:
 * CORE / Dormant Signal Retention Boundary
 *
 * Owns:
 * - dormant packet record reference storage
 * - packet lookup by CORE identifier
 * - dormant packet listing by bounded blink state
 *
 * Does NOT Own:
 * - NET surface handling
 * - UI rendering
 * - identity ownership
 * - authentication
 * - payments
 * - analytics systems
 * - behavioral profiling
 * - participant tracking
 * - external routing
 * - persistent storage authority
 *
 * Boundary:
 * SignalPacket enters CORE.
 * CORE retains a local dormant packet reference.
 * Retrieval returns the stored packet artifact.
 *
 * Security:
 * - No hidden synchronization
 * - No identity enrichment
 * - No behavioral analysis
 * - No external side effects
 *
 * Doctrine:
 * Dormant Packet Reference ≠ Identity Intelligence
 * Dormant Packet Storage ≠ External Authority
 */

// dormant_packet_vault.ts

import { SignalPacket } from '../models/SignalPacket';

const vault = new Map<string, SignalPacket>();

export function storeDormant(packet: SignalPacket): void {
  vault.set(packet.id, packet);
}

export function getDormant(id: string): SignalPacket | undefined {
  return vault.get(id);
}

export function listDormant(): SignalPacket[] {
  return [...vault.values()].filter(p => p.blink === 'READY');
}

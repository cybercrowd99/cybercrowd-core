/**
 * CyberCrowd-MDC — Signal Packet V1
 *
 * Purpose:
 * - Define bounded signal packets entering the CyberCrowd Metadata Center (MDC).
 * - Preserve structured lane, blink, proximity, and action references.
 * - Provide immutable-compatible metadata intake structure for MDC processing.
 *
 * Does NOT:
 * - own identity
 * - authorize behavior
 * - mutate CORE state
 * - mutate OSAR state
 * - mutate NET lineage
 * - execute transactions
 * - create behavioral profiles
 */

export type LaneId =
  | 'PING'
  | 'SHOP'
  | 'SOCIAL'
  | 'PUBLIC'
  | 'PRIVATE'
  | 'NEEDS'
  | 'ICAN';

export type BlinkState =
  | 'ON'
  | 'READY'
  | 'FIRE'
  | 'TAKEOVER'
  | 'ARCHIVE';

export interface ProximityProfile {
  surfaceId: string;
  distanceMeters?: number;
  cursorState?: 'IDLE' | 'FOCUSED' | 'RITUAL';
  laneContext: LaneId;
}

export type UserAction =
  | 'OPEN'
  | 'IGNORE'
  | 'ARCHIVE'
  | 'BLOCK'
  | 'CLEAR'
  | 'PURCHASE';

export interface SignalPacket {
  id: string;
  originUserId: string;
  lane: LaneId;
  blink: BlinkState;
  createdAt: string;
  dormantAgeMs: number;
  proximity?: ProximityProfile;
  snapshotId?: string;
  lastAction?: UserAction;
}

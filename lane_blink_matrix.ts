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

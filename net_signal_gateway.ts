import { routeSignal } from '../core/signal_router';
import { triggerPing } from '../core/ping_diagnostic_trigger';
import { LaneId, SignalPacket } from '../models/SignalPacket';

export function netIn(originUserId: string, lane: LaneId): SignalPacket {
  return routeSignal(originUserId, lane);
}

export function netAdvance(packet: SignalPacket): any {
  if (packet.lane === 'PING') {
    return triggerPing(packet);
  }
  return packet;
}

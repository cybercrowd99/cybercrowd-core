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

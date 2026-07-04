import { SignalPacket } from '../models/SignalPacket';
import { diagnosePing } from './ping_diagnostic_core';
import { storeDormant } from './dormant_packet_vault';

export function routePingDiagnostic(packet: SignalPacket) {
  const diag = diagnosePing(packet);
  storeDormant({ ...packet, diagnostic: diag });
  return diag;
}

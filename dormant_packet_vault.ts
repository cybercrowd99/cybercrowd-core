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

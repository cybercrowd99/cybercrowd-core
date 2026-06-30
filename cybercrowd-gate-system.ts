/**
 * cybercrowd-gate-system.ts
 *
 * CyberCrowd Gate System
 *
 * ONE JOB:
 * Control entry into the Colosseum.
 *
 * A gate decides:
 * - who may enter
 * - with what identity
 * - with what authority
 * - with what surfaces
 * - with what active I CAN field
 *
 * This is NOT auth.
 * This is NOT login.
 * This is NOT permissions.
 *
 * A gate is the controlled transition
 * between the outside world and the arena.
 */

import CyberCrowdColosseum from "./cybercrowd-colosseum";

export const CyberCrowdGateSystem = (() => {
  const gates = new Map();

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix: string) {
    return prefix + "." + Date.now() + "." + Math.random().toString(36).slice(2, 10);
  }

  function openGate(identityId: string, surfaces: string[] = []) {
    const id = makeId("GATE");

    const gate = {
      id,
      identity_id: identityId,
      surfaces,
      opened_at: now(),
      active: true
    };

    gates.set(id, gate);

    return gate;
  }

  function closeGate(gateId: string) {
    const gate = gates.get(gateId);
    if (!gate) return null;

    gate.active = false;
    gate.closed_at = now();

    return gate;
  }

  function listGates(identityId: string) {
    return Array.from(gates.values()).filter(
      (g) => g.identity_id === identityId
    );
  }

  function enter(identityId: string, surfaces: string[]) {
    // Open a gate
    const gate = openGate(identityId, surfaces);

    // Set presence inside the Colosseum
    CyberCrowdColosseum.setPresence(identityId, {
      active_surface: surfaces[0] || null,
      surfaces
    });

    return gate;
  }

  return {
    openGate,
    closeGate,
    listGates,
    enter
  };
})();

export default CyberCrowdGateSystem;

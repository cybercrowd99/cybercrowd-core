// cybercrowd-colosseum.ts
//
// The CyberCrowd Colosseum
//
// ONE JOB:
// Tie together identity, I CAN, objects, intents,
// proximity, PING, carrier, and moments
// into one live arena.
//
// This is NOT a framework.
// This is NOT a feed.
// This is NOT a chat app.
// This is the live system.

import CyberCrowdPingSystem from "./cybercrowd-ping-system";
import CyberCrowdCarrierSystem from "./cybercrowd-carrier-system";
import CyberCrowdMomentSystem from "./cybercrowd-moment-system";

type IdentityId = string;
type ObjectId = string;
type IntentId = string;

export const CyberCrowdColosseum = (() => {
  function createIdentity(input: any) {
    return CyberCrowdPingSystem.createIdentity(input);
  }

  function attachICan(identityId: IdentityId, statement: string, evidence?: any) {
    return CyberCrowdPingSystem.attachICan(identityId, statement, evidence);
  }

  function publishObject(input: any) {
    return CyberCrowdPingSystem.publishObject(input);
  }

  function rememberIntent(input: any) {
    return CyberCrowdPingSystem.rememberIntent(input);
  }

  function setPresence(identityId: IdentityId, input: any) {
    return CyberCrowdPingSystem.setPresence(identityId, input);
  }

  function noticeObject(input: any) {
    // Proximity + PING
    const result = CyberCrowdPingSystem.noticeObject(input);

    // Deliver each ping into the carrier + moment system
    result.matches.forEach((match) => {
      const delivery = CyberCrowdCarrierSystem.deliver(match.ping);
      CyberCrowdMomentSystem.createMoment(delivery);
    });

    return result;
  }

  function listMoments(identityId: IdentityId) {
    return CyberCrowdMomentSystem.listMoments(identityId);
  }

  function listPings(identityId: IdentityId) {
    return CyberCrowdPingSystem.listPings(identityId);
  }

  function exportState() {
    return CyberCrowdPingSystem.exportState();
  }

  return {
    createIdentity,
    attachICan,
    publishObject,
    rememberIntent,
    setPresence,
    noticeObject,
    listMoments,
    listPings,
    exportState
  };
})();

export default CyberCrowdColosseum;

/**
 * CyberCrowd — CORE NET uIDL Organ Receiver
 *
 * CyberCrowd-Core — CORE uIDL Organ Boundary Receiver Artifact
 *
 * ONE JOB:
 * Receive routed CoreNetUIDLBridge artifacts at a CORE organ
 * boundary without interpreting identity, intent, permissions,
 * authority, or meaning.
 *
 * It allows:
 * - CORE organs to acknowledge routed uIDL lineage
 * - structural handoff completion
 * - organ boundaries to remain isolated
 *
 * It does not:
 * - execute actions
 * - interpret identity
 * - infer intent
 * - grant permissions
 * - create authority
 * - transform uIDL references
 * - expose private CORE state
 */


import { CoreNetUIDLBridge } from "./core-net-uidl-bridge";


export type CoreNetUIDLOrganReceiverState =
  | "RECEIVED"
  | "REJECTED"
  | "FAILED";


export interface CoreNetUIDLOrganReceiver {

  /**
   * Governing doctrine.
   */
  doctrine:
    "CyberCrowd_CoreNetUIDLOrganReceiver";


  /**
   * Structural discriminator.
   */
  status:
    "CORE_NET_UIDL_ORGAN_RECEIVER";


  /**
   * Receive routed neutral uIDL lineage.
   *
   * Never:
   * - interprets identity
   * - interprets intent
   * - grants permissions
   * - creates authority
   */
  receive(
    bridge: CoreNetUIDLBridge
  ): Promise<CoreNetUIDLOrganReceiverState>;
}


/**
 * Build CORE NET uIDL organ receiver.
 *
 * Creates structural organ handoff only.
 *
 * It does not:
 * - execute capability operations
 * - interpret users
 * - infer meaning
 * - expose private data
 */
export function buildCoreNetUIDLOrganReceiver(
  receiveFn: (
    bridge: CoreNetUIDLBridge
  ) => Promise<CoreNetUIDLOrganReceiverState>
): CoreNetUIDLOrganReceiver {

  const organ: CoreNetUIDLOrganReceiver = {

    doctrine:
      "CyberCrowd_CoreNetUIDLOrganReceiver",

    status:
      "CORE_NET_UIDL_ORGAN_RECEIVER",

    receive:
      receiveFn,
  };


  return Object.freeze(organ);
}

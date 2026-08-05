/**
 * CyberServices Core Link Builder 
 *
 * ONE JOB:
 * Create CORE link records from supplied linkage facts.
 *
 * Owns:
 * - Generating link identities
 * - Building link records
 * - Assigning creation timestamps
 *
 * Does NOT:
 * - Validate links
 * - Adapt requests
 * - Route operations
 * - Register links
 * - Execute deployments
 * - Expose NET interfaces
 * - Change CyberServices authority
 */

import type {
  CyberServicesCoreLinkRecord
} from "./CYBERSERVICES_CORE_LINK_TYPES";


export interface CyberServicesCoreLinkInput {

  cyberServicesComponent: string;

  coreInterface: string;

}


export class CyberServicesCoreLinkBuilder {

  build(
    input: CyberServicesCoreLinkInput
  ): CyberServicesCoreLinkRecord {

    return {

      identity: {
        linkId: crypto.randomUUID(),
        version: "CL-1"
      },

      cyberServicesComponent:
        input.cyberServicesComponent,

      coreInterface:
        input.coreInterface,

      status: "CREATED",

      createdAt:
        new Date().toISOString()
    };
  }
}

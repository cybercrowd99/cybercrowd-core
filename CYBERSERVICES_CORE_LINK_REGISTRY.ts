/**
 * CyberServices Core Link Registry 
 *
 * ONE JOB:
 * Store and retrieve validated CORE link records.
 *
 * Owns:
 * - Registering CORE link records
 * - Retrieving CORE link records by identity
 * - Providing link storage access
 *
 * Does NOT:
 * - Create links
 * - Validate links
 * - Adapt requests
 * - Route operations
 * - Execute deployments
 * - Expose NET interfaces
 * - Change CyberServices authority
 * - Mutate link authority
 */

import type {
  CyberServicesCoreLinkRecord
} from "./CYBERSERVICES_CORE_LINK_TYPES";


export interface CyberServicesCoreLinkStore {

  put(
    key: string,
    value: string
  ): Promise<void>;


  get(
    key: string
  ): Promise<string | null>;
}


export class CyberServicesCoreLinkRegistry {

  constructor(
    private readonly store:
      CyberServicesCoreLinkStore
  ) {}


  async register(
    link: CyberServicesCoreLinkRecord
  ): Promise<CyberServicesCoreLinkRecord> {

    await this.store.put(
      `core-link:${link.identity.linkId}`,
      JSON.stringify(link)
    );

    return link;
  }


  async get(
    linkId: string
  ): Promise<CyberServicesCoreLinkRecord | null> {

    const raw =
      await this.store.get(
        `core-link:${linkId}`
      );


    if (!raw) {
      return null;
    }


    try {

      return JSON.parse(
        raw
      ) as CyberServicesCoreLinkRecord;

    } catch {

      return null;
    }
  }
}

/**
 * CyberServices Core Link Service 
 *
 * ONE JOB:
 * Provide a stable service boundary for CORE link handling.
 *
 * Owns:
 * - Accepting CORE link requests
 * - Delegating link validation
 * - Delegating link persistence
 * - Returning deterministic service results
 *
 * Does NOT:
 * - Create links
 * - Validate links internally
 * - Adapt requests
 * - Route operations
 * - Execute deployments
 * - Expose NET interfaces
 * - Change CyberServices authority
 * - Mutate link authority
 */

import type {
  CyberServicesCoreLinkRecord,
  CyberServicesCoreLinkResult
} from "./CYBERSERVICES_CORE_LINK_TYPES";


export interface CyberServicesCoreLinkValidatorPort {

  validate(
    link: CyberServicesCoreLinkRecord
  ): CyberServicesCoreLinkResult;
}


export interface CyberServicesCoreLinkRegistryPort {

  register(
    link: CyberServicesCoreLinkRecord
  ): Promise<CyberServicesCoreLinkRecord>;


  get(
    linkId: string
  ): Promise<CyberServicesCoreLinkRecord | null>;
}


export interface CyberServicesCoreLinkServiceResult {

  success: boolean;

  validation: CyberServicesCoreLinkResult;

  stored?: CyberServicesCoreLinkRecord | null;
}


export class CyberServicesCoreLinkService {

  constructor(
    private readonly validator:
      CyberServicesCoreLinkValidatorPort,

    private readonly registry:
      CyberServicesCoreLinkRegistryPort
  ) {}


  async handle(
    link: CyberServicesCoreLinkRecord
  ): Promise<CyberServicesCoreLinkServiceResult> {

    const validation =
      this.validator.validate(link);


    if (!validation.success) {

      return {
        success: false,
        validation
      };
    }


    const stored =
      await this.registry.register(link);


    return {
      success: true,
      validation,
      stored
    };
  }
}

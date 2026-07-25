/**
 * CyberServices Core Link Validator
 *
 * ONE JOB:
 * Validate CORE link records for structural correctness.
 *
 * Owns:
 * - Checking required link fields
 * - Checking link version compatibility
 * - Returning validation results
 *
 * Does NOT:
 * - Create links
 * - Adapt requests
 * - Route operations
 * - Register links
 * - Execute deployments
 * - Expose NET interfaces
 * - Change CyberServices authority
 * - Mutate link records
 */

import type {
  CyberServicesCoreLinkRecord,
  CyberServicesCoreLinkResult
} from "./CYBERSERVICES_CORE_LINK_TYPES";


export class CyberServicesCoreLinkValidator {

  validate(
    link: CyberServicesCoreLinkRecord
  ): CyberServicesCoreLinkResult {

    const reasons: string[] = [];


    if (!link.identity.linkId) {
      reasons.push("MISSING_LINK_ID");
    }


    if (!link.identity.version) {
      reasons.push("MISSING_VERSION");
    }


    if (link.identity.version !== "CL-1") {
      reasons.push("UNSUPPORTED_VERSION");
    }


    if (!link.cyberServicesComponent) {
      reasons.push("MISSING_CYBERSERVICES_COMPONENT");
    }


    if (!link.coreInterface) {
      reasons.push("MISSING_CORE_INTERFACE");
    }


    if (!link.createdAt) {
      reasons.push("MISSING_CREATED_AT");
    }


    return {
      success: reasons.length === 0,
      link
    };
  }
}

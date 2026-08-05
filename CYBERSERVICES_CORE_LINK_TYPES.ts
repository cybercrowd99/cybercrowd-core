/**
 * CyberServices Core Link Types 
 *
 * ONE JOB:
 * Define stable linkage data contracts between CyberServices and CORE.
 *
 * Owns:
 * - Core link identities
 * - Link record shapes
 * - Link status vocabulary
 *
 * Does NOT:
 * - Create links
 * - Validate links
 * - Adapt requests
 * - Route operations
 * - Execute deployments
 * - Expose NET interfaces
 * - Change CyberServices authority
 */


export type CyberServicesCoreLinkStatus =
  | "CREATED"
  | "CONNECTED"
  | "ACTIVE"
  | "DISABLED";


export type CyberServicesCoreLinkVersion =
  | "CL-1";


export interface CyberServicesCoreLinkIdentity {

  linkId: string;

  version: CyberServicesCoreLinkVersion;

}


export interface CyberServicesCoreLinkRecord {

  identity: CyberServicesCoreLinkIdentity;

  cyberServicesComponent: string;

  coreInterface: string;

  status: CyberServicesCoreLinkStatus;

  createdAt: string;

}


export interface CyberServicesCoreLinkResult {

  success: boolean;

  link: CyberServicesCoreLinkRecord;

}

/**

CyberCrowd — CyberService Result Envelope

CyberServiceResultEnvelope is the output boundary of the

CyberCrowd-Core execution subsystem.

It receives capability-defined outputs from

CyberCrowdServiceEngine without allowing execution results

to collapse into identity, intent, authority, or meaning.

It does not:

contain identity


contain intent


grant permissions


create authority


infer behavior


predict future actions


interpret meaning


CyberServiceResultEnvelope only:

records capability output


preserves execution lineage


maintains sovereignty boundaries


separates result from interpretation
*/



import { CyberServiceActionExecutionEnvelope } from "./cybercrowd-service-action-execution-envelope";

/**

Structural definition of a CyberService capability result.
/
export interface CyberServiceResultEnvelope {
/*

Governing CyberCrowd doctrine.
*/
doctrine: "CyberCrowd_CyberServiceResultEnvelope";



/**

Structural artifact discriminator.
*/
status: "CYBERCROWD_SERVICE_RESULT_ENVELOPE";


/**

Executed capability lineage.

Never interpreted.

Never enriched.

Never transformed.
*/
execution: CyberServiceActionExecutionEnvelope;


/**

Opaque result reference.

Structural only.

No semantic meaning.
*/
resultId: string;


/**

Capability output reference.

Represents produced output.

Contains no:

identity


intent


authority


permissions
*/
outputRef: string;



/**

Passive result lifecycle state.

Not interpretation.

Not prediction.

Not authority.
*/
resultState: "PRODUCED" | "FAILED";
}


/**

Build a CyberServiceResultEnvelope artifact.

Creates the CyberCrowd-Core output membrane:

CyberCrowdServiceEngine:

capability execution

CyberServiceResultEnvelope:

bounded capability result

It does not:

interpret output


assign meaning


resolve identity


predict behavior
*/
export function buildCyberServiceResultEnvelope(
execution: CyberServiceActionExecutionEnvelope,
resultId: string,
outputRef: string
): CyberServiceResultEnvelope {
const artifact: CyberServiceResultEnvelope = {
doctrine: "CyberCrowd_CyberServiceResultEnvelope",


status: "CYBERCROWD_SERVICE_RESULT_ENVELOPE",

execution,

resultId,

outputRef,

resultState: "PRODUCED",
};


return Object.freeze(artifact);
}

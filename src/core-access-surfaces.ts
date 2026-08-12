/**
 * CORE — CyberCrowd
 *
 * Access Surface Registry
 *
 * ONE JOB:
 * Declare the structural access surfaces exposed by CORE.
 *
 * Ownership boundary:
 *
 *   CORE
 *    │
 *    ├── CORE-IDENTITY
 *    ├── CORE-STRUCTURAL
 *    ├── CORE-CONTINUITY
 *    └── CORE-CAPABILITY
 *
 * This module does not:
 * - execute independent service behavior
 * - infer capability
 * - infer intent
 * - authorize access
 * - transform requests
 * - enrich metadata
 * - create service relationships
 * - transfer ownership
 *
 * It only declares the CORE access-surface structure.
 *
 * CASES → CORE → NET
 */

export default {
  core: {
    identity: "CORE-IDENTITY",
    structural: "CORE-STRUCTURAL",
    continuity: "CORE-CONTINUITY",
    capability: "CORE-CAPABILITY",
  },
};

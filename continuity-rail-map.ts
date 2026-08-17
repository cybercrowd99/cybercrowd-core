/* ============================================================
   CORE — CONTINUITY RAIL MAP
   CyberCrowd Dual-Engine Runtime

   Purpose:
   Define the structural map of permitted and forbidden
   movement between runtime engines.

   Owns:
   - engine transition map
   - continuity requirements
   - wake-zone boundaries
   - collapse zones
   - safe rails
   - forbidden rails

   Does NOT own:
   - scheduling
   - transition execution
   - state mutation
   - ledger persistence
   - presentation
   - UI

   Boundary:
   ENGINE TO ENGINE → STRUCTURAL CONTINUITY MAP
   ============================================================ */

export type RailStatus =
  | "safe"
  | "conservative"
  | "forbidden";

export type ContinuityRequirement =
  | "required"
  | "optional"
  | "none";

export interface ContinuityRail {
  readonly fromEngine: string;
  readonly toEngine: string;

  readonly status: RailStatus;
  readonly continuity: ContinuityRequirement;

  readonly wakeZone: string;
  readonly collapseZone: string;

  readonly reason: string;
}

export interface ContinuityRailMap {
  readonly rails: readonly ContinuityRail[];
}

/* ============================================================
   CANONICAL DUAL-ENGINE RAIL MAP
   ============================================================ */

const RAILS: readonly ContinuityRail[] = Object.freeze([

  {
    fromEngine: "Clawd",
    toEngine: "AdWormEngine",
    status: "safe",
    continuity: "required",
    wakeZone: "CLAWD_TO_ADWORM",
    collapseZone: "CLAWD_ADWORM_COLLAPSE",
    reason: "Bounded engine handoff with continuity."
  },

  {
    fromEngine: "AdWormEngine",
    toEngine: "Clawd",
    status: "safe",
    continuity: "required",
    wakeZone: "ADWORM_TO_CLAWD",
    collapseZone: "ADWORM_CLAWD_COLLAPSE",
    reason: "Return handoff requires preserved runtime state."
  },

  {
    fromEngine: "AdWormEngine",
    toEngine: "EngineB",
    status: "conservative",
    continuity: "required",
    wakeZone: "ADWORM_TO_ENGINE_B",
    collapseZone: "ADWORM_ENGINE_B_COLLAPSE",
    reason: "Cross-engine transfer requires conservative continuity."
  },

  {
    fromEngine: "EngineB",
    toEngine: "AdWormEngine",
    status: "conservative",
    continuity: "required",
    wakeZone: "ENGINE_B_TO_ADWORM",
    collapseZone: "ENGINE_B_ADWORM_COLLAPSE",
    reason: "Return transfer requires verified continuity."
  },

  {
    fromEngine: "Transaction",
    toEngine: "Promotional",
    status: "forbidden",
    continuity: "none",
    wakeZone: "TRANSACTION_TO_PROMOTIONAL",
    collapseZone: "TRANSACTION_PROMOTIONAL_COLLAPSE",
    reason: "Transaction state must not cross directly into promotional execution."
  },

  {
    fromEngine: "Promotional",
    toEngine: "Transaction",
    status: "forbidden",
    continuity: "none",
    wakeZone: "PROMOTIONAL_TO_TRANSACTION",
    collapseZone: "PROMOTIONAL_TRANSACTION_COLLAPSE",
    reason: "Promotional state must not authorize transaction execution."
  },

  {
    fromEngine: "Continuity",
    toEngine: "Switch",
    status: "safe",
    continuity: "required",
    wakeZone: "CONTINUITY_TO_SWITCH",
    collapseZone: "CONTINUITY_SWITCH_COLLAPSE",
    reason: "Mode switching requires preserved continuity."
  },

  {
    fromEngine: "Switch",
    toEngine: "Continuity",
    status: "safe",
    continuity: "required",
    wakeZone: "SWITCH_TO_CONTINUITY",
    collapseZone: "SWITCH_CONTINUITY_COLLAPSE",
    reason: "Switch return requires an intact continuity rail."
  }

]);

/* ============================================================
   MAP FACTORY
   ============================================================ */

export function createContinuityRailMap(): ContinuityRailMap {

  return Object.freeze({
    rails: RAILS
  });
}

/* ============================================================
   RAIL LOOKUP
   ============================================================ */

export function getContinuityRail(
  fromEngine: string,
  toEngine: string
): ContinuityRail | null {

  return RAILS.find(
    rail =>
      rail.fromEngine === fromEngine &&
      rail.toEngine === toEngine
  ) ?? null;
}

/* ============================================================
   TRANSITION CLASSIFICATION
   ============================================================ */

export function classifyContinuityRail(
  fromEngine: string,
  toEngine: string
): RailStatus {

  const rail =
    getContinuityRail(fromEngine, toEngine);

  if (!rail) {
    return "forbidden";
  }

  return rail.status;
}

/* ============================================================
   CONTINUITY REQUIREMENT
   ============================================================ */

export function requiresContinuity(
  fromEngine: string,
  toEngine: string
): boolean {

  const rail =
    getContinuityRail(fromEngine, toEngine);

  return rail?.continuity === "required";
}

/* ============================================================
   WAKE ZONE
   ============================================================ */

export function getWakeZone(
  fromEngine: string,
  toEngine: string
): string | null {

  return getContinuityRail(
    fromEngine,
    toEngine
  )?.wakeZone ?? null;
}

/* ============================================================
   COLLAPSE ZONE
   ============================================================ */

export function getCollapseZone(
  fromEngine: string,
  toEngine: string
): string | null {

  return getContinuityRail(
    fromEngine,
    toEngine
  )?.collapseZone ?? null;
}

/* ============================================================
   DEFAULT MAP
   ============================================================ */

export const continuityRailMap =
  createContinuityRailMap();

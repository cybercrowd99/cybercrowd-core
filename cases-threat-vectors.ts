/**
 * CASES Threat Vectors
 * --------------------
 * This module defines the substrate-level threat vectors for the CASES
 * connection boundary. It does NOT implement security features. It expresses
 * how threats manifest across the three signed-zero lanes:
 *
 *  p1: system_identification
 *  p2: operational_stance
 *  p3: cybercrowd_interpretation
 *
 * Each threat vector is mapped to the CASES-27 posture grid.
 */

export type SignedZero = "-0" | "0" | "+0";

export interface CasesPosture {
  p1: SignedZero; // system_identification
  p2: SignedZero; // operational_stance
  p3: SignedZero; // cybercrowd_interpretation
}

export interface ThreatVector {
  id: string;
  name: string;
  description: string;
  surfaces: Array<"identity" | "operational" | "interpretation" | "boundary" | "runtime" | "substrate">;
  posture: CasesPosture;
  effectivePolarity: {
    identity: -1 | 1 | +1;
    operational: -1 | 1 | +1;
    interpretation: -1 | 1 | +1;
  };
}

/**
 * Polarity clamp: CASES guarantees all posture combinations resolve to [-1, 1, +1].
 */
const clampPolarity = (value: SignedZero): -1 | 1 | +1 => {
  switch (value) {
    case "-0": return -1;
    case "0": return 1;
    case "+0": return +1;
  }
};

/**
 * Generate a threat vector from a posture.
 */
export const buildThreatVector = (
  id: string,
  name: string,
  description: string,
  surfaces: ThreatVector["surfaces"],
  posture: CasesPosture
): ThreatVector => ({
  id,
  name,
  description,
  surfaces,
  posture,
  effectivePolarity: {
    identity: clampPolarity(posture.p1),
    operational: clampPolarity(posture.p2),
    interpretation: clampPolarity(posture.p3)
  }
});

/**
 * CASES Threat Vectors
 * --------------------
 * These are substrate-level threat expressions. They do not represent attacks.
 * They represent how misalignment or drift manifests at the CASES boundary.
 */

export const CasesThreatVectors: ThreatVector[] = [
  buildThreatVector(
    "tv-identity-overassert",
    "Identity Over-Assertion",
    "Service attempts to present more authority than permitted.",
    ["identity", "boundary"],
    { p1: "+0", p2: "0", p3: "0" }
  ),

  buildThreatVector(
    "tv-identity-underassert",
    "Identity Under-Assertion",
    "Service minimizes identity to evade responsibility.",
    ["identity", "boundary"],
    { p1: "-0", p2: "0", p3: "0" }
  ),

  buildThreatVector(
    "tv-operational-aggression",
    "Operational Aggression",
    "Service attempts high-risk or high-engagement behavior.",
    ["operational"],
    { p1: "0", p2: "+0", p3: "0" }
  ),

  buildThreatVector(
    "tv-operational-withdrawal",
    "Operational Withdrawal",
    "Service attempts to avoid obligations or reduce participation.",
    ["operational"],
    { p1: "0", p2: "-0", p3: "0" }
  ),

  buildThreatVector(
    "tv-interpretation-inflation",
    "Interpretation Inflation",
    "CyberCrowd may over-trust the service due to posture drift.",
    ["interpretation"],
    { p1: "0", p2: "0", p3: "+0" }
  ),

  buildThreatVector(
    "tv-interpretation-deflation",
    "Interpretation Deflation",
    "CyberCrowd may under-trust the service due to posture drift.",
    ["interpretation"],
    { p1: "0", p2: "0", p3: "-0" }
  ),

  buildThreatVector(
    "tv-boundary-overreach",
    "Boundary Overreach",
    "Service attempts to push internal logic across the CASES boundary.",
    ["boundary"],
    { p1: "+0", p2: "+0", p3: "+0" }
  ),

  buildThreatVector(
    "tv-boundary-leakage",
    "Boundary Leakage",
    "Service unintentionally exposes internal architecture.",
    ["boundary"],
    { p1: "-0", p2: "-0", p3: "-0" }
  ),

  buildThreatVector(
    "tv-runtime-spoofing",
    "Runtime Spoofing",
    "Service attempts to falsify health, capability, or event signals.",
    ["runtime"],
    { p1: "+0", p2: "-0", p3: "+0" }
  ),

  buildThreatVector(
    "tv-runtime-flooding",
    "Runtime Flooding",
    "Service overloads CyberCrowd with excessive events.",
    ["runtime"],
    { p1: "0", p2: "+0", p3: "+0" }
  ),

  buildThreatVector(
    "tv-substrate-collision",
    "Substrate Identity Collision",
    "Two services attempt to occupy the same identity lane.",
    ["substrate"],
    { p1: "+0", p2: "0", p3: "-0" }
  ),

  buildThreatVector(
    "tv-substrate-saturation",
    "Substrate Saturation",
    "Too many services attempt to connect simultaneously.",
    ["substrate"],
    { p1: "0", p2: "+0", p3: "-0" }
  )
];

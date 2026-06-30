// src/cybercrowd/octopus-core.ts
//
// CyberCrowd Octopus Core
//
// ONE JOB:
// Load and wire the octopus organs without touching cybercrowd-net,
// Worker, auth, or UI.
//
// This is the OCTOPUS root.
// This is NOT organism naming.
// This is NOT cybercrowd-net.
// This is NOT Worker.
// This is NOT auth.
// This is NOT UI.
// This is NOT payment.
// This is NOT ranking.
// This is NOT a feed.
// This is NOT punishment.
// This is NOT hidden control.
//
// LOCKED PATH:
// src/cybercrowd/octopus-core.ts
//
// LOCKED RULE:
// Octopus owns movement logic.
// Net exposes routes.
// Worker handles runtime.
// Auth handles identity entry.
//
// Octopus Core wires organs together.
// It does not become the organs.
//
// LOCKED ORGAN LIST:
// Biff — perspective suction cup
// CyberAssistant — meaning check
// Secretary — placement
// Turnstile — entry
// Pole — elevation
// Window — surface
// Touch — touch lane
// Arena — crowd lane
// Movement — movement lanes
// Memory — ledger

export type OctopusOrganName =
  | "biff"
  | "cyberassistant"
  | "secretary"
  | "turnstile"
  | "pole"
  | "window"
  | "touch"
  | "arena"
  | "movement"
  | "memory";

export type OctopusStatus =
  | "idle"
  | "wired"
  | "active"
  | "held"
  | "sealed"
  | "burned";

export interface OctopusOrganRecord {
  organ_id: string;
  name: OctopusOrganName;
  status: OctopusStatus;
  loaded: boolean;
  wired: boolean;
  created_at_ms: number;
  updated_at_ms: number;
  data: Record<string, unknown>;
}

export interface OctopusCoreState {
  status: OctopusStatus;
  organ_count: number;
  wired_count: number;
  active_count: number;
  held_count: number;
  sealed_count: number;
  burned_count: number;
  last_organ: OctopusOrganName | null;
  last_updated_at_ms: number;
}

export interface OctopusWireInput {
  name: OctopusOrganName;
  data?: Record<string, unknown>;
}

export interface OctopusCoreResult {
  ok: boolean;
  state: OctopusCoreState;
  organ?: OctopusOrganRecord;
  organs: OctopusOrganRecord[];
  error?: string;
}

export interface OctopusCoreSnapshot {
  state: OctopusCoreState;
  organs: OctopusOrganRecord[];
  wired: OctopusOrganRecord[];
  active: OctopusOrganRecord[];
  held: OctopusOrganRecord[];
  stable: boolean;
}

export class OctopusCore {
  private organs = new Map<OctopusOrganName, OctopusOrganRecord>();

  private state: OctopusCoreState = {
    status: "idle",
    organ_count: 0,
    wired_count: 0,
    active_count: 0,
    held_count: 0,
    sealed_count: 0,
    burned_count: 0,
    last_organ: null,
    last_updated_at_ms: Date.now()
  };

  /**
   * Wire one octopus organ.
   */
  wire(input: OctopusWireInput): OctopusCoreResult {
    const name = cleanOrganName(input?.name);

    if (!name) {
      return this.result("OCTOPUS_ORGAN_NAME_REQUIRED");
    }

    const now = Date.now();
    const existing = this.organs.get(name);

    const organ: OctopusOrganRecord = {
      organ_id: existing?.organ_id ?? makeId("octopus-organ"),
      name,
      status: "wired",
      loaded: true,
      wired: true,
      created_at_ms: existing?.created_at_ms ?? now,
      updated_at_ms: now,
      data: publicDataOnly({
        ...(existing?.data ?? {}),
        ...(input?.data ?? {})
      })
    };

    this.organs.set(name, cloneOrgan(organ));
    this.recount("wired", name, now);

    return this.result(undefined, organ);
  }

  /**
   * Wire the standard octopus mesh.
   */
  wireDefaultMesh(): OctopusCoreResult {
    const defaultOrgans: OctopusOrganName[] = [
      "biff",
      "cyberassistant",
      "secretary",
      "turnstile",
      "pole",
      "window",
      "touch",
      "arena",
      "movement",
      "memory"
    ];

    let last: OctopusOrganRecord | undefined;

    for (const name of defaultOrgans) {
      const result = this.wire({ name });

      if (result.organ) {
        last = result.organ;
      }
    }

    return this.result(undefined, last);
  }

  /**
   * Activate one wired organ.
   */
  activate(name: OctopusOrganName): OctopusCoreResult {
    return this.transition(name, "active");
  }

  /**
   * Hold one organ without deleting it.
   */
  hold(name: OctopusOrganName): OctopusCoreResult {
    return this.transition(name, "held");
  }

  /**
   * Seal one organ without deleting it.
   */
  seal(name: OctopusOrganName): OctopusCoreResult {
    return this.transition(name, "sealed");
  }

  /**
   * Burn one organ from live octopus memory.
   */
  burn(name: OctopusOrganName): OctopusCoreResult {
    const cleanName = cleanOrganName(name);

    if (!cleanName) {
      return this.result("OCTOPUS_ORGAN_NAME_REQUIRED");
    }

    const organ = this.organs.get(cleanName);

    if (!organ) {
      return this.result("OCTOPUS_ORGAN_NOT_FOUND");
    }

    this.organs.delete(cleanName);

    const now = Date.now();

    const burned: OctopusOrganRecord = {
      ...cloneOrgan(organ),
      status: "burned",
      loaded: false,
      wired: false,
      updated_at_ms: now
    };

    this.recount("burned", cleanName, now);

    return this.result(undefined, burned);
  }

  /**
   * Read one organ.
   */
  get(name: OctopusOrganName): OctopusOrganRecord | null {
    const cleanName = cleanOrganName(name);

    if (!cleanName) {
      return null;
    }

    const organ = this.organs.get(cleanName);

    return organ ? cloneOrgan(organ) : null;
  }

  /**
   * Read current octopus state.
   */
  getState(): OctopusCoreState {
    return {
      status: this.state.status,
      organ_count: this.state.organ_count,
      wired_count: this.state.wired_count,
      active_count: this.state.active_count,
      held_count: this.state.held_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_organ: this.state.last_organ,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  /**
   * Read all wired organs.
   */
  getOrgans(): OctopusOrganRecord[] {
    return Array.from(this.organs.values())
      .map(cloneOrgan)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Read loaded and wired organs.
   */
  getWired(): OctopusOrganRecord[] {
    return this.getOrgans().filter((organ) => organ.wired);
  }

  /**
   * Read active organs.
   */
  getActive(): OctopusOrganRecord[] {
    return this.getOrgans().filter((organ) => organ.status === "active");
  }

  /**
   * Read held organs.
   */
  getHeld(): OctopusOrganRecord[] {
    return this.getOrgans().filter((organ) => organ.status === "held");
  }

  /**
   * Read operational snapshot.
   */
  snapshot(): OctopusCoreSnapshot {
    return {
      state: this.getState(),
      organs: this.getOrgans(),
      wired: this.getWired(),
      active: this.getActive(),
      held: this.getHeld(),
      stable:
        this.state.status === "idle" ||
        this.state.status === "wired" ||
        this.state.status === "active" ||
        this.state.status === "held"
    };
  }

  /**
   * Reset live octopus memory.
   */
  reset(): void {
    this.organs.clear();

    this.state = {
      status: "idle",
      organ_count: 0,
      wired_count: 0,
      active_count: 0,
      held_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_organ: null,
      last_updated_at_ms: Date.now()
    };
  }

  private transition(
    name: OctopusOrganName,
    status: OctopusStatus
  ): OctopusCoreResult {
    const cleanName = cleanOrganName(name);

    if (!cleanName) {
      return this.result("OCTOPUS_ORGAN_NAME_REQUIRED");
    }

    const organ = this.organs.get(cleanName);

    if (!organ) {
      return this.result("OCTOPUS_ORGAN_NOT_FOUND");
    }

    if (!canMove(organ.status, status)) {
      return this.result("OCTOPUS_ORGAN_STATE_LOCKED", organ);
    }

    const now = Date.now();

    const updated: OctopusOrganRecord = {
      ...cloneOrgan(organ),
      status,
      loaded: status !== "burned",
      wired: status !== "burned",
      updated_at_ms: now
    };

    this.organs.set(cleanName, cloneOrgan(updated));
    this.recount(status, cleanName, now);

    return this.result(undefined, updated);
  }

  private recount(
    status: OctopusStatus,
    lastOrgan: OctopusOrganName | null,
    at_ms: number
  ): void {
    const organs = Array.from(this.organs.values());

    this.state = {
      status,
      organ_count: organs.length,
      wired_count: organs.filter((organ) => organ.wired).length,
      active_count: organs.filter((organ) => organ.status === "active").length,
      held_count: organs.filter((organ) => organ.status === "held").length,
      sealed_count: organs.filter((organ) => organ.status === "sealed").length,
      burned_count:
        this.state.burned_count + (status === "burned" ? 1 : 0),
      last_organ: lastOrgan,
      last_updated_at_ms: at_ms
    };
  }

  private result(
    error?: string,
    organ?: OctopusOrganRecord
  ): OctopusCoreResult {
    return {
      ok: !error,
      state: this.getState(),
      organ: organ ? cloneOrgan(organ) : undefined,
      organs: this.getOrgans(),
      error
    };
  }
}

export const CyberCrowdOctopusCore =
  new OctopusCore();

function canMove(from: OctopusStatus, to: OctopusStatus): boolean {
  if (from === "burned") return false;

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) return true;

  if (
    from === "idle" ||
    from === "wired" ||
    from === "active" ||
    from === "held"
  ) {
    return (
      to === "wired" ||
      to === "active" ||
      to === "held" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function cleanOrganName(value: unknown): OctopusOrganName | null {
  if (
    value === "biff" ||
    value === "cyberassistant" ||
    value === "secretary" ||
    value === "turnstile" ||
    value === "pole" ||
    value === "window" ||
    value === "touch" ||
    value === "arena" ||
    value === "movement" ||
    value === "memory"
  ) {
    return value;
  }

  return null;
}

function makeId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return (
    prefix +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneOrgan(organ: OctopusOrganRecord): OctopusOrganRecord {
  return {
    organ_id: organ.organ_id,
    name: organ.name,
    status: organ.status,
    loaded: organ.loaded,
    wired: organ.wired,
    created_at_ms: organ.created_at_ms,
    updated_at_ms: organ.updated_at_ms,
    data: publicDataOnly(organ.data)
  };
}

function publicDataOnly(
  data: Record<string, unknown>
): Record<string, unknown> {
  const clone = cloneData(data);
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(clone)) {
    const cleanKey = key.toLowerCase();

    if (
      cleanKey.includes("private") ||
      cleanKey.includes("secret") ||
      cleanKey.includes("token") ||
      cleanKey.includes("auth") ||
      cleanKey.includes("password")
    ) {
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function cloneData(
  data: Record<string, unknown>
): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

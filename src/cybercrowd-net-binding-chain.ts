// src/cybercrowd-net-binding-chain.ts
//
// CyberCrowd Net Binding Chain
//
// ONE JOB:
// Bind the CyberCrowd Case surface chain into cybercrowd-net in the correct
// order without swallowing core logic into the net layer.
//
// This is a binding chain.
// This is NOT a new organ.
// This is NOT a feed.
// This is NOT ranking.
// This is NOT hidden control.
// This is NOT punishment.
// This is NOT auth.
// This is NOT Worker runtime.
// This is NOT cybercrowd-net swallowing core logic.
//
// LOCKED RULE:
// Core owns the logic.
// cybercrowd-net exposes it.
// Bridge connects them.
//
// LOCKED CHAIN:
// 1. Project Envelope
// 2. Sync Manager
// 3. CASE
// 4. CASE EXIT
// 5. CASE ANALYSIS
// 6. Lanternfish / Archive
// 7. DECchamber / Black Box
// 8. Flight Control
// 9. CASE HEALTH
//
// MEANING:
// Envelope contains.
// Sync moves.
// CASE surfaces.
// Exit releases.
// Analysis reads.
// Lanternfish remembers.
// DECchamber records security.
// Flight Control observes the helm.
// Health reports condition last.

export type CyberCrowdNetBindingName =
  | "project-envelope"
  | "sync-manager"
  | "case"
  | "case-exit"
  | "case-analysis"
  | "lanternfish-archive"
  | "decchamber-black-box"
  | "flight-control"
  | "case-health";

export type CyberCrowdNetBindingStatus =
  | "waiting"
  | "bound"
  | "skipped"
  | "blocked"
  | "sealed"
  | "burned";

export type CyberCrowdNetBindingReason =
  | "chain-start"
  | "dependency-ready"
  | "dependency-missing"
  | "bound-in-order"
  | "out-of-order"
  | "adapter-missing"
  | "sealed"
  | "burned"
  | "manual"
  | "unknown";

export interface CyberCrowdNetBindingAdapter {
  binding_name: CyberCrowdNetBindingName;
  binding_label: string;

  can_bind: boolean;
  exposes: string[];
  requires: CyberCrowdNetBindingName[];

  bind?: (context: CyberCrowdNetBindingContext) => unknown;
  read?: () => unknown;

  data?: Record<string, unknown>;
}

export interface CyberCrowdNetBindingContext {
  envelope: unknown | null;
  sync_manager: unknown | null;
  case_surface: unknown | null;
  case_exit: unknown | null;
  case_analysis: unknown | null;
  lanternfish_archive: unknown | null;
  decchamber_black_box: unknown | null;
  flight_control: unknown | null;
  case_health: unknown | null;

  data: Record<string, unknown>;
}

export interface CyberCrowdNetBindingRecord {
  binding_id: string;
  name: CyberCrowdNetBindingName;
  label: string;

  order: number;
  status: CyberCrowdNetBindingStatus;
  reason: CyberCrowdNetBindingReason;

  requires: CyberCrowdNetBindingName[];
  exposes: string[];

  bound: boolean;
  blocked: boolean;

  created_at_ms: number;
  updated_at_ms: number;
  bound_at_ms: number | null;
  skipped_at_ms: number | null;
  blocked_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  output: unknown | null;
  data: Record<string, unknown>;
}

export interface CyberCrowdNetBindingState {
  status: CyberCrowdNetBindingStatus | "idle";
  expected_count: number;
  bound_count: number;
  skipped_count: number;
  blocked_count: number;
  sealed_count: number;
  burned_count: number;
  last_binding: CyberCrowdNetBindingName | null;
  last_reason: CyberCrowdNetBindingReason;
  last_updated_at_ms: number;
}

export interface CyberCrowdNetBindingResult {
  ok: boolean;
  state: CyberCrowdNetBindingState;
  binding?: CyberCrowdNetBindingRecord;
  bindings: CyberCrowdNetBindingRecord[];
  bound: CyberCrowdNetBindingRecord[];
  blocked: CyberCrowdNetBindingRecord[];
  waiting: CyberCrowdNetBindingRecord[];
  error?: string;
}

export interface CyberCrowdNetBindingSnapshot {
  state: CyberCrowdNetBindingState;
  bindings: CyberCrowdNetBindingRecord[];
  bound: CyberCrowdNetBindingRecord[];
  blocked: CyberCrowdNetBindingRecord[];
  waiting: CyberCrowdNetBindingRecord[];
  context: CyberCrowdNetBindingContext;
  chain_complete: boolean;
  stable: boolean;
}

export const CYBERCROWD_NET_BINDING_ORDER: CyberCrowdNetBindingName[] = [
  "project-envelope",
  "sync-manager",
  "case",
  "case-exit",
  "case-analysis",
  "lanternfish-archive",
  "decchamber-black-box",
  "flight-control",
  "case-health"
];

export class CyberCrowdNetBindingChain {
  private bindings = new Map<CyberCrowdNetBindingName, CyberCrowdNetBindingRecord>();

  private context: CyberCrowdNetBindingContext = {
    envelope: null,
    sync_manager: null,
    case_surface: null,
    case_exit: null,
    case_analysis: null,
    lanternfish_archive: null,
    decchamber_black_box: null,
    flight_control: null,
    case_health: null,
    data: {}
  };

  private state: CyberCrowdNetBindingState = {
    status: "idle",
    expected_count: CYBERCROWD_NET_BINDING_ORDER.length,
    bound_count: 0,
    skipped_count: 0,
    blocked_count: 0,
    sealed_count: 0,
    burned_count: 0,
    last_binding: null,
    last_reason: "unknown",
    last_updated_at_ms: Date.now()
  };

  /**
   * Bind one adapter only if its place in the chain is ready.
   */
  bind(adapter: CyberCrowdNetBindingAdapter): CyberCrowdNetBindingResult {
    const name = cleanBindingName(adapter?.binding_name);

    if (!name) {
      return this.result("BINDING_NAME_REQUIRED");
    }

    if (!CYBERCROWD_NET_BINDING_ORDER.includes(name)) {
      return this.result("BINDING_NOT_IN_CHAIN");
    }

    if (!this.previousBindingsReady(name)) {
      const blocked = this.makeRecord(adapter, "blocked", "out-of-order", null);
      this.storeBinding(blocked);
      this.recount(blocked);
      return this.result("BINDING_OUT_OF_ORDER", blocked);
    }

    if (!adapter.can_bind) {
      const blocked = this.makeRecord(adapter, "blocked", "adapter-missing", null);
      this.storeBinding(blocked);
      this.recount(blocked);
      return this.result("BINDING_ADAPTER_NOT_READY", blocked);
    }

    if (!this.dependenciesReady(adapter.requires ?? [])) {
      const blocked = this.makeRecord(adapter, "blocked", "dependency-missing", null);
      this.storeBinding(blocked);
      this.recount(blocked);
      return this.result("BINDING_DEPENDENCY_MISSING", blocked);
    }

    const output =
      typeof adapter.bind === "function"
        ? adapter.bind(this.cloneContext())
        : typeof adapter.read === "function"
          ? adapter.read()
          : null;

    this.attachToContext(name, output, adapter.data ?? {});

    const bound = this.makeRecord(adapter, "bound", "bound-in-order", output);
    this.storeBinding(bound);
    this.recount(bound);

    return this.result(undefined, bound);
  }

  /**
   * Bind the whole chain in the exact locked order.
   */
  bindChain(adapters: CyberCrowdNetBindingAdapter[]): CyberCrowdNetBindingResult {
    if (!Array.isArray(adapters)) {
      return this.result("BINDING_ADAPTERS_REQUIRED");
    }

    let last: CyberCrowdNetBindingRecord | undefined;

    for (const name of CYBERCROWD_NET_BINDING_ORDER) {
      const adapter = adapters.find((item) => item.binding_name === name);

      if (!adapter) {
        const missing = this.makeRecord(
          {
            binding_name: name,
            binding_label: labelForBinding(name),
            can_bind: false,
            exposes: [],
            requires: requiredForBinding(name),
            data: {}
          },
          "blocked",
          "adapter-missing",
          null
        );

        this.storeBinding(missing);
        this.recount(missing);

        return this.result("BINDING_ADAPTER_MISSING", missing);
      }

      const result = this.bind(adapter);

      if (!result.ok) {
        return result;
      }

      if (result.binding) {
        last = result.binding;
      }
    }

    return this.result(undefined, last);
  }

  /**
   * Register a binding as skipped without pretending it is connected.
   */
  skip(name: CyberCrowdNetBindingName, reason: CyberCrowdNetBindingReason = "manual"): CyberCrowdNetBindingResult {
    const cleanName = cleanBindingName(name);

    if (!cleanName) {
      return this.result("BINDING_NAME_REQUIRED");
    }

    const record = this.makeRecord(
      {
        binding_name: cleanName,
        binding_label: labelForBinding(cleanName),
        can_bind: false,
        exposes: [],
        requires: requiredForBinding(cleanName),
        data: {}
      },
      "skipped",
      reason,
      null
    );

    this.storeBinding(record);
    this.recount(record);

    return this.result(undefined, record);
  }

  /**
   * Seal a binding without deleting it.
   */
  seal(name: CyberCrowdNetBindingName): CyberCrowdNetBindingResult {
    return this.transition(name, "sealed", "sealed");
  }

  /**
   * Burn a binding from live memory.
   */
  burn(name: CyberCrowdNetBindingName): CyberCrowdNetBindingResult {
    const cleanName = cleanBindingName(name);

    if (!cleanName) {
      return this.result("BINDING_NAME_REQUIRED");
    }

    const existing = this.bindings.get(cleanName);

    if (!existing) {
      return this.result("BINDING_NOT_FOUND");
    }

    this.bindings.delete(cleanName);

    const now = Date.now();

    const burned: CyberCrowdNetBindingRecord = {
      ...cloneBinding(existing),
      status: "burned",
      reason: "burned",
      bound: false,
      blocked: false,
      updated_at_ms: now,
      burned_at_ms: now
    };

    this.clearFromContext(cleanName);
    this.recount(burned);

    return this.result(undefined, burned);
  }

  /**
   * Read one binding.
   */
  get(name: CyberCrowdNetBindingName): CyberCrowdNetBindingRecord | null {
    const cleanName = cleanBindingName(name);

    if (!cleanName) {
      return null;
    }

    const record = this.bindings.get(cleanName);
    return record ? cloneBinding(record) : null;
  }

  /**
   * Read current state.
   */
  getState(): CyberCrowdNetBindingState {
    return {
      status: this.state.status,
      expected_count: this.state.expected_count,
      bound_count: this.state.bound_count,
      skipped_count: this.state.skipped_count,
      blocked_count: this.state.blocked_count,
      sealed_count: this.state.sealed_count,
      burned_count: this.state.burned_count,
      last_binding: this.state.last_binding,
      last_reason: this.state.last_reason,
      last_updated_at_ms: this.state.last_updated_at_ms
    };
  }

  getBindings(): CyberCrowdNetBindingRecord[] {
    return Array.from(this.bindings.values())
      .map(cloneBinding)
      .sort(compareBindings);
  }

  getBound(): CyberCrowdNetBindingRecord[] {
    return this.getBindings().filter((record) => record.status === "bound");
  }

  getBlocked(): CyberCrowdNetBindingRecord[] {
    return this.getBindings().filter((record) => record.status === "blocked");
  }

  getWaiting(): CyberCrowdNetBindingRecord[] {
    const present = new Set(this.getBindings().map((record) => record.name));

    return CYBERCROWD_NET_BINDING_ORDER
      .filter((name) => !present.has(name))
      .map((name) =>
        this.makeRecord(
          {
            binding_name: name,
            binding_label: labelForBinding(name),
            can_bind: false,
            exposes: [],
            requires: requiredForBinding(name),
            data: {}
          },
          "waiting",
          name === "project-envelope" ? "chain-start" : "dependency-ready",
          null
        )
      );
  }

  getContext(): CyberCrowdNetBindingContext {
    return this.cloneContext();
  }

  snapshot(): CyberCrowdNetBindingSnapshot {
    const bound = this.getBound();

    return {
      state: this.getState(),
      bindings: this.getBindings(),
      bound,
      blocked: this.getBlocked(),
      waiting: this.getWaiting(),
      context: this.cloneContext(),
      chain_complete: bound.length === CYBERCROWD_NET_BINDING_ORDER.length,
      stable:
        this.state.status === "idle" ||
        this.state.status === "waiting" ||
        this.state.status === "bound"
    };
  }

  reset(): void {
    this.bindings.clear();

    this.context = {
      envelope: null,
      sync_manager: null,
      case_surface: null,
      case_exit: null,
      case_analysis: null,
      lanternfish_archive: null,
      decchamber_black_box: null,
      flight_control: null,
      case_health: null,
      data: {}
    };

    this.state = {
      status: "idle",
      expected_count: CYBERCROWD_NET_BINDING_ORDER.length,
      bound_count: 0,
      skipped_count: 0,
      blocked_count: 0,
      sealed_count: 0,
      burned_count: 0,
      last_binding: null,
      last_reason: "unknown",
      last_updated_at_ms: Date.now()
    };
  }

  private transition(
    name: CyberCrowdNetBindingName,
    status: CyberCrowdNetBindingStatus,
    reason: CyberCrowdNetBindingReason
  ): CyberCrowdNetBindingResult {
    const cleanName = cleanBindingName(name);

    if (!cleanName) {
      return this.result("BINDING_NAME_REQUIRED");
    }

    const existing = this.bindings.get(cleanName);

    if (!existing) {
      return this.result("BINDING_NOT_FOUND");
    }

    if (existing.status === "burned") {
      return this.result("BINDING_BURNED", existing);
    }

    const now = Date.now();

    const updated: CyberCrowdNetBindingRecord = {
      ...cloneBinding(existing),
      status,
      reason,
      bound: status === "bound",
      blocked: status === "blocked",
      updated_at_ms: now,
      sealed_at_ms: status === "sealed" ? now : existing.sealed_at_ms,
      burned_at_ms: status === "burned" ? now : existing.burned_at_ms
    };

    this.storeBinding(updated);
    this.recount(updated);

    return this.result(undefined, updated);
  }

  private previousBindingsReady(name: CyberCrowdNetBindingName): boolean {
    const index = CYBERCROWD_NET_BINDING_ORDER.indexOf(name);

    if (index <= 0) {
      return true;
    }

    const previous = CYBERCROWD_NET_BINDING_ORDER.slice(0, index);

    return previous.every((bindingName) => {
      const record = this.bindings.get(bindingName);
      return record?.status === "bound";
    });
  }

  private dependenciesReady(requires: CyberCrowdNetBindingName[]): boolean {
    return requires.every((name) => {
      const record = this.bindings.get(name);
      return record?.status === "bound";
    });
  }

  private attachToContext(
    name: CyberCrowdNetBindingName,
    output: unknown,
    data: Record<string, unknown>
  ): void {
    if (name === "project-envelope") this.context.envelope = output;
    if (name === "sync-manager") this.context.sync_manager = output;
    if (name === "case") this.context.case_surface = output;
    if (name === "case-exit") this.context.case_exit = output;
    if (name === "case-analysis") this.context.case_analysis = output;
    if (name === "lanternfish-archive") this.context.lanternfish_archive = output;
    if (name === "decchamber-black-box") this.context.decchamber_black_box = output;
    if (name === "flight-control") this.context.flight_control = output;
    if (name === "case-health") this.context.case_health = output;

    this.context.data = publicDataOnly({
      ...this.context.data,
      [name]: data
    });
  }

  private clearFromContext(name: CyberCrowdNetBindingName): void {
    if (name === "project-envelope") this.context.envelope = null;
    if (name === "sync-manager") this.context.sync_manager = null;
    if (name === "case") this.context.case_surface = null;
    if (name === "case-exit") this.context.case_exit = null;
    if (name === "case-analysis") this.context.case_analysis = null;
    if (name === "lanternfish-archive") this.context.lanternfish_archive = null;
    if (name === "decchamber-black-box") this.context.decchamber_black_box = null;
    if (name === "flight-control") this.context.flight_control = null;
    if (name === "case-health") this.context.case_health = null;
  }

  private makeRecord(
    adapter: CyberCrowdNetBindingAdapter,
    status: CyberCrowdNetBindingStatus,
    reason: CyberCrowdNetBindingReason,
    output: unknown | null
  ): CyberCrowdNetBindingRecord {
    const now = Date.now();
    const name = cleanBindingName(adapter.binding_name) ?? "project-envelope";

    return {
      binding_id: makeId("net-binding"),
      name,
      label: cleanText(adapter.binding_label, 120) || labelForBinding(name),

      order: CYBERCROWD_NET_BINDING_ORDER.indexOf(name) + 1,
      status,
      reason,

      requires: cleanBindingNames(adapter.requires ?? []),
      exposes: cleanStringList(adapter.exposes ?? [], 40, 20),

      bound: status === "bound",
      blocked: status === "blocked",

      created_at_ms: now,
      updated_at_ms: now,
      bound_at_ms: status === "bound" ? now : null,
      skipped_at_ms: status === "skipped" ? now : null,
      blocked_at_ms: status === "blocked" ? now : null,
      sealed_at_ms: status === "sealed" ? now : null,
      burned_at_ms: status === "burned" ? now : null,

      output: cloneUnknown(output),
      data: publicDataOnly(adapter.data ?? {})
    };
  }

  private storeBinding(record: CyberCrowdNetBindingRecord): void {
    this.bindings.set(record.name, cloneBinding(record));
  }

  private recount(last: CyberCrowdNetBindingRecord): void {
    const records = Array.from(this.bindings.values());

    this.state = {
      status: last.status,
      expected_count: CYBERCROWD_NET_BINDING_ORDER.length,
      bound_count: records.filter((record) => record.status === "bound").length,
      skipped_count: records.filter((record) => record.status === "skipped").length,
      blocked_count: records.filter((record) => record.status === "blocked").length,
      sealed_count: records.filter((record) => record.status === "sealed").length,
      burned_count:
        this.state.burned_count + (last.status === "burned" ? 1 : 0),
      last_binding: last.name,
      last_reason: last.reason,
      last_updated_at_ms: last.updated_at_ms
    };
  }

  private cloneContext(): CyberCrowdNetBindingContext {
    return {
      envelope: cloneUnknown(this.context.envelope),
      sync_manager: cloneUnknown(this.context.sync_manager),
      case_surface: cloneUnknown(this.context.case_surface),
      case_exit: cloneUnknown(this.context.case_exit),
      case_analysis: cloneUnknown(this.context.case_analysis),
      lanternfish_archive: cloneUnknown(this.context.lanternfish_archive),
      decchamber_black_box: cloneUnknown(this.context.decchamber_black_box),
      flight_control: cloneUnknown(this.context.flight_control),
      case_health: cloneUnknown(this.context.case_health),
      data: publicDataOnly(this.context.data)
    };
  }

  private result(
    error?: string,
    binding?: CyberCrowdNetBindingRecord
  ): CyberCrowdNetBindingResult {
    return {
      ok: !error,
      state: this.getState(),
      binding: binding ? cloneBinding(binding) : undefined,
      bindings: this.getBindings(),
      bound: this.getBound(),
      blocked: this.getBlocked(),
      waiting: this.getWaiting(),
      error
    };
  }
}

export const CyberCrowdNetBindingChainSurface =
  new CyberCrowdNetBindingChain();

function requiredForBinding(
  name: CyberCrowdNetBindingName
): CyberCrowdNetBindingName[] {
  if (name === "project-envelope") return [];
  if (name === "sync-manager") return ["project-envelope"];
  if (name === "case") return ["project-envelope", "sync-manager"];
  if (name === "case-exit") return ["case", "sync-manager"];
  if (name === "case-analysis") return ["case"];
  if (name === "lanternfish-archive") return ["case", "case-exit", "case-analysis", "sync-manager"];
  if (name === "decchamber-black-box") return ["sync-manager"];
  if (name === "flight-control") {
    return [
      "case",
      "case-exit",
      "case-analysis",
      "sync-manager",
      "lanternfish-archive",
      "decchamber-black-box"
    ];
  }

  if (name === "case-health") return ["case", "sync-manager"];

  return [];
}

function labelForBinding(name: CyberCrowdNetBindingName): string {
  if (name === "project-envelope") return "Project Envelope";
  if (name === "sync-manager") return "Sync Manager";
  if (name === "case") return "CASE";
  if (name === "case-exit") return "CASE EXIT";
  if (name === "case-analysis") return "CASE ANALYSIS";
  if (name === "lanternfish-archive") return "Lanternfish Archive";
  if (name === "decchamber-black-box") return "DECchamber Black Box";
  if (name === "flight-control") return "Flight Control";
  if (name === "case-health") return "CASE HEALTH";

  return "Unknown Binding";
}

function cleanBindingName(value: unknown): CyberCrowdNetBindingName | null {
  if (
    value === "project-envelope" ||
    value === "sync-manager" ||
    value === "case" ||
    value === "case-exit" ||
    value === "case-analysis" ||
    value === "lanternfish-archive" ||
    value === "decchamber-black-box" ||
    value === "flight-control" ||
    value === "case-health"
  ) {
    return value;
  }

  return null;
}

function cleanBindingNames(values: unknown): CyberCrowdNetBindingName[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const clean = values
    .map(cleanBindingName)
    .filter((value): value is CyberCrowdNetBindingName => Boolean(value));

  return Array.from(new Set(clean));
}

function compareBindings(
  a: CyberCrowdNetBindingRecord,
  b: CyberCrowdNetBindingRecord
): number {
  return a.order - b.order;
}

function cloneBinding(
  record: CyberCrowdNetBindingRecord
): CyberCrowdNetBindingRecord {
  return {
    binding_id: record.binding_id,
    name: record.name,
    label: record.label,

    order: record.order,
    status: record.status,
    reason: record.reason,

    requires: [...record.requires],
    exposes: [...record.exposes],

    bound: record.bound,
    blocked: record.blocked,

    created_at_ms: record.created_at_ms,
    updated_at_ms: record.updated_at_ms,
    bound_at_ms: record.bound_at_ms ?? null,
    skipped_at_ms: record.skipped_at_ms ?? null,
    blocked_at_ms: record.blocked_at_ms ?? null,
    sealed_at_ms: record.sealed_at_ms ?? null,
    burned_at_ms: record.burned_at_ms ?? null,

    output: cloneUnknown(record.output),
    data: publicDataOnly(record.data)
  };
}

function cleanStringList(
  values: unknown,
  maxLength: number,
  maxItems: number
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const clean = values
    .map((value) => cleanText(value, maxLength))
    .filter(Boolean);

  return Array.from(new Set(clean)).slice(0, maxItems);
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

function cloneUnknown(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

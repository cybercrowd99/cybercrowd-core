// src/cybercrowd-work-order.ts
//
// CyberCrowd Work Order Organ
//
// ONE JOB:
// Turn a routed match and accepted response into an active work agreement.
//
// This is CORE.
// This is NOT cybercrowd-net.
// This is NOT auth.
// This is NOT payment.
// This is NOT marketplace UI.
// This is NOT permission.
// This is NOT punishment.
//
// A match is a route suggestion.
// A ping is a human question.
// A work order is the active work lane.
//
// Work Order records:
// who
// what
// where
// when
// status
// proof needed
// completion terms

export type WorkOrderStatus =
  | "draft"
  | "offered"
  | "accepted"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "disputed"
  | "sealed"
  | "burned";

export type WorkOrderPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type WorkOrderProofRequirement =
  | "none"
  | "footprint"
  | "moment"
  | "photo"
  | "before-after"
  | "proximity"
  | "signature"
  | "reference"
  | "custom";

export interface WorkOrderProofRule {
  rule_id: string;
  requirement: WorkOrderProofRequirement;
  required: boolean;
  label: string;
  ref_id: string | null;
}

export interface WorkOrderRecord {
  work_order_id: string;

  tenant_id: string;

  requester_private_id: string | null;
  requester_public_id: string | null;

  worker_private_id: string;
  worker_public_id: string | null;

  job_id: string | null;
  need_id: string | null;
  match_id: string | null;
  ping_id: string | null;
  moment_id: string | null;
  surface_id: string | null;

  title: string;
  description: string | null;
  location_text: string | null;

  status: WorkOrderStatus;
  priority: WorkOrderPriority;

  proof_rules: WorkOrderProofRule[];

  completion_terms: string | null;
  cancellation_reason: string | null;
  dispute_reason: string | null;

  created_at_ms: number;
  updated_at_ms: number;

  offered_at_ms: number | null;
  accepted_at_ms: number | null;
  started_at_ms: number | null;
  paused_at_ms: number | null;
  completed_at_ms: number | null;
  cancelled_at_ms: number | null;
  disputed_at_ms: number | null;
  sealed_at_ms: number | null;
  burned_at_ms: number | null;

  data: Record<string, unknown>;
}

export interface CreateWorkOrderRequest {
  tenant_id: string;

  requester_private_id?: string | null;
  requester_public_id?: string | null;

  worker_private_id: string;
  worker_public_id?: string | null;

  job_id?: string | null;
  need_id?: string | null;
  match_id?: string | null;
  ping_id?: string | null;
  moment_id?: string | null;
  surface_id?: string | null;

  title: string;
  description?: string | null;
  location_text?: string | null;

  priority?: WorkOrderPriority;

  proof_rules?: WorkOrderProofRuleInput[];

  completion_terms?: string | null;

  data?: Record<string, unknown>;
}

export interface WorkOrderProofRuleInput {
  requirement: WorkOrderProofRequirement;
  required?: boolean;
  label?: string | null;
  ref_id?: string | null;
}

export interface WorkOrderResult {
  ok: boolean;
  work_order?: WorkOrderRecord;
  error?: string;
}

export interface WorkOrderListResult {
  ok: boolean;
  work_orders: WorkOrderRecord[];
  error?: string;
}

export interface WorkOrderOrgan {
  create(request: CreateWorkOrderRequest): Promise<WorkOrderResult>;

  offer(work_order_id: string): Promise<WorkOrderResult>;

  accept(work_order_id: string): Promise<WorkOrderResult>;

  start(work_order_id: string): Promise<WorkOrderResult>;

  pause(work_order_id: string): Promise<WorkOrderResult>;

  complete(work_order_id: string): Promise<WorkOrderResult>;

  cancel(
    work_order_id: string,
    reason?: string | null
  ): Promise<WorkOrderResult>;

  dispute(
    work_order_id: string,
    reason?: string | null
  ): Promise<WorkOrderResult>;

  seal(work_order_id: string): Promise<WorkOrderResult>;

  burn(work_order_id: string): Promise<WorkOrderResult>;

  addProofRule(
    work_order_id: string,
    rule: WorkOrderProofRuleInput
  ): Promise<WorkOrderResult>;

  get(work_order_id: string): Promise<WorkOrderRecord | null>;

  listForWorker(worker_private_id: string): Promise<WorkOrderListResult>;

  listForRequester(requester_private_id: string): Promise<WorkOrderListResult>;

  listForJob(job_id: string): Promise<WorkOrderListResult>;

  listForMatch(match_id: string): Promise<WorkOrderListResult>;
}

export class InMemoryWorkOrderOrgan implements WorkOrderOrgan {
  private readonly workOrders = new Map<string, WorkOrderRecord>();
  private readonly workerIndex = new Map<string, Set<string>>();
  private readonly requesterIndex = new Map<string, Set<string>>();
  private readonly jobIndex = new Map<string, Set<string>>();
  private readonly matchIndex = new Map<string, Set<string>>();

  async create(
    request: CreateWorkOrderRequest
  ): Promise<WorkOrderResult> {
    const tenant_id = cleanId(request?.tenant_id);

    const requester_private_id = cleanNullableId(
      request?.requester_private_id ?? null
    );

    const requester_public_id = cleanNullableId(
      request?.requester_public_id ?? null
    );

    const worker_private_id = cleanId(request?.worker_private_id);

    const worker_public_id = cleanNullableId(
      request?.worker_public_id ?? null
    );

    const job_id = cleanNullableId(request?.job_id ?? null);
    const need_id = cleanNullableId(request?.need_id ?? null);
    const match_id = cleanNullableId(request?.match_id ?? null);
    const ping_id = cleanNullableId(request?.ping_id ?? null);
    const moment_id = cleanNullableId(request?.moment_id ?? null);
    const surface_id = cleanNullableId(request?.surface_id ?? null);

    const title = cleanText(request?.title ?? "", 240);
    const description = cleanNullableText(request?.description ?? null, 4000);
    const location_text = cleanNullableText(request?.location_text ?? null, 1000);
    const completion_terms = cleanNullableText(
      request?.completion_terms ?? null,
      4000
    );

    const priority = cleanPriority(request?.priority ?? "normal");

    if (!tenant_id) {
      return {
        ok: false,
        error: "TENANT_ID_REQUIRED"
      };
    }

    if (!worker_private_id) {
      return {
        ok: false,
        error: "WORKER_PRIVATE_ID_REQUIRED"
      };
    }

    if (!title) {
      return {
        ok: false,
        error: "WORK_ORDER_TITLE_REQUIRED"
      };
    }

    const now = Date.now();

    const workOrder: WorkOrderRecord = {
      work_order_id: makeWorkOrderId(),

      tenant_id,

      requester_private_id,
      requester_public_id,

      worker_private_id,
      worker_public_id,

      job_id,
      need_id,
      match_id,
      ping_id,
      moment_id,
      surface_id,

      title,
      description,
      location_text,

      status: "draft",
      priority,

      proof_rules: normalizeProofRules(request?.proof_rules ?? []),

      completion_terms,
      cancellation_reason: null,
      dispute_reason: null,

      created_at_ms: now,
      updated_at_ms: now,

      offered_at_ms: null,
      accepted_at_ms: null,
      started_at_ms: null,
      paused_at_ms: null,
      completed_at_ms: null,
      cancelled_at_ms: null,
      disputed_at_ms: null,
      sealed_at_ms: null,
      burned_at_ms: null,

      data: cloneData(request?.data ?? {})
    };

    this.workOrders.set(
      workOrder.work_order_id,
      cloneWorkOrder(workOrder)
    );

    this.addIndex(this.workerIndex, worker_private_id, workOrder.work_order_id);

    if (requester_private_id) {
      this.addIndex(
        this.requesterIndex,
        requester_private_id,
        workOrder.work_order_id
      );
    }

    if (job_id) {
      this.addIndex(this.jobIndex, job_id, workOrder.work_order_id);
    }

    if (match_id) {
      this.addIndex(this.matchIndex, match_id, workOrder.work_order_id);
    }

    return {
      ok: true,
      work_order: cloneWorkOrder(workOrder)
    };
  }

  async offer(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "offered");
  }

  async accept(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "accepted");
  }

  async start(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "active");
  }

  async pause(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "paused");
  }

  async complete(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "completed");
  }

  async cancel(
    work_order_id: string,
    reason: string | null = null
  ): Promise<WorkOrderResult> {
    const result = await this.transition(work_order_id, "cancelled");

    if (result.ok && result.work_order) {
      const stored = this.workOrders.get(result.work_order.work_order_id);

      if (stored) {
        stored.cancellation_reason = cleanNullableText(reason, 4000);
        stored.updated_at_ms = Date.now();

        return {
          ok: true,
          work_order: cloneWorkOrder(stored)
        };
      }
    }

    return result;
  }

  async dispute(
    work_order_id: string,
    reason: string | null = null
  ): Promise<WorkOrderResult> {
    const result = await this.transition(work_order_id, "disputed");

    if (result.ok && result.work_order) {
      const stored = this.workOrders.get(result.work_order.work_order_id);

      if (stored) {
        stored.dispute_reason = cleanNullableText(reason, 4000);
        stored.updated_at_ms = Date.now();

        return {
          ok: true,
          work_order: cloneWorkOrder(stored)
        };
      }
    }

    return result;
  }

  async seal(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "sealed");
  }

  async burn(work_order_id: string): Promise<WorkOrderResult> {
    return this.transition(work_order_id, "burned");
  }

  async addProofRule(
    work_order_id: string,
    rule: WorkOrderProofRuleInput
  ): Promise<WorkOrderResult> {
    const workOrder = this.workOrders.get(cleanId(work_order_id));

    if (!workOrder) {
      return {
        ok: false,
        error: "WORK_ORDER_NOT_FOUND"
      };
    }

    if (workOrder.status === "sealed" || workOrder.status === "burned") {
      return {
        ok: false,
        error: "WORK_ORDER_LOCKED"
      };
    }

    const cleanRule = normalizeProofRule(rule);

    if (!cleanRule) {
      return {
        ok: false,
        error: "PROOF_RULE_INVALID"
      };
    }

    workOrder.proof_rules.push(cleanRule);
    workOrder.updated_at_ms = Date.now();

    return {
      ok: true,
      work_order: cloneWorkOrder(workOrder)
    };
  }

  async get(
    work_order_id: string
  ): Promise<WorkOrderRecord | null> {
    const workOrder = this.workOrders.get(cleanId(work_order_id));
    return workOrder ? cloneWorkOrder(workOrder) : null;
  }

  async listForWorker(
    worker_private_id: string
  ): Promise<WorkOrderListResult> {
    const cleanWorker = cleanId(worker_private_id);

    if (!cleanWorker) {
      return {
        ok: false,
        work_orders: [],
        error: "WORKER_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.workerIndex.get(cleanWorker) ?? new Set<string>();

    return {
      ok: true,
      work_orders: this.recordsFromIds(ids)
    };
  }

  async listForRequester(
    requester_private_id: string
  ): Promise<WorkOrderListResult> {
    const cleanRequester = cleanId(requester_private_id);

    if (!cleanRequester) {
      return {
        ok: false,
        work_orders: [],
        error: "REQUESTER_PRIVATE_ID_REQUIRED"
      };
    }

    const ids = this.requesterIndex.get(cleanRequester) ?? new Set<string>();

    return {
      ok: true,
      work_orders: this.recordsFromIds(ids)
    };
  }

  async listForJob(
    job_id: string
  ): Promise<WorkOrderListResult> {
    const cleanJob = cleanId(job_id);

    if (!cleanJob) {
      return {
        ok: false,
        work_orders: [],
        error: "JOB_ID_REQUIRED"
      };
    }

    const ids = this.jobIndex.get(cleanJob) ?? new Set<string>();

    return {
      ok: true,
      work_orders: this.recordsFromIds(ids)
    };
  }

  async listForMatch(
    match_id: string
  ): Promise<WorkOrderListResult> {
    const cleanMatch = cleanId(match_id);

    if (!cleanMatch) {
      return {
        ok: false,
        work_orders: [],
        error: "MATCH_ID_REQUIRED"
      };
    }

    const ids = this.matchIndex.get(cleanMatch) ?? new Set<string>();

    return {
      ok: true,
      work_orders: this.recordsFromIds(ids)
    };
  }

  reset(): void {
    this.workOrders.clear();
    this.workerIndex.clear();
    this.requesterIndex.clear();
    this.jobIndex.clear();
    this.matchIndex.clear();
  }

  private async transition(
    work_order_id: string,
    status: WorkOrderStatus
  ): Promise<WorkOrderResult> {
    const workOrder = this.workOrders.get(cleanId(work_order_id));

    if (!workOrder) {
      return {
        ok: false,
        error: "WORK_ORDER_NOT_FOUND"
      };
    }

    if (!canMove(workOrder.status, status)) {
      return {
        ok: false,
        error: "WORK_ORDER_STATE_LOCKED"
      };
    }

    const now = Date.now();

    workOrder.status = status;
    workOrder.updated_at_ms = now;

    if (status === "offered") workOrder.offered_at_ms = now;
    if (status === "accepted") workOrder.accepted_at_ms = now;
    if (status === "active") workOrder.started_at_ms = now;
    if (status === "paused") workOrder.paused_at_ms = now;
    if (status === "completed") workOrder.completed_at_ms = now;
    if (status === "cancelled") workOrder.cancelled_at_ms = now;
    if (status === "disputed") workOrder.disputed_at_ms = now;
    if (status === "sealed") workOrder.sealed_at_ms = now;
    if (status === "burned") workOrder.burned_at_ms = now;

    return {
      ok: true,
      work_order: cloneWorkOrder(workOrder)
    };
  }

  private recordsFromIds(ids: Set<string>): WorkOrderRecord[] {
    return Array.from(ids)
      .map((id) => this.workOrders.get(id))
      .filter((item): item is WorkOrderRecord => Boolean(item))
      .map(cloneWorkOrder)
      .sort((a, b) => b.created_at_ms - a.created_at_ms);
  }

  private addIndex(
    index: Map<string, Set<string>>,
    key: string,
    work_order_id: string
  ): void {
    const existing = index.get(key) ?? new Set<string>();
    existing.add(work_order_id);
    index.set(key, existing);
  }
}

export const CyberCrowdWorkOrders =
  new InMemoryWorkOrderOrgan();

export function isWorkOrderStatus(
  value: unknown
): value is WorkOrderStatus {
  return (
    value === "draft" ||
    value === "offered" ||
    value === "accepted" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "disputed" ||
    value === "sealed" ||
    value === "burned"
  );
}

function canMove(
  from: WorkOrderStatus,
  to: WorkOrderStatus
): boolean {
  if (from === "burned") {
    return false;
  }

  if (from === "sealed") {
    return to === "burned";
  }

  if (from === to) {
    return true;
  }

  if (from === "draft") {
    return (
      to === "offered" ||
      to === "accepted" ||
      to === "cancelled" ||
      to === "burned"
    );
  }

  if (from === "offered") {
    return (
      to === "accepted" ||
      to === "cancelled" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "accepted") {
    return (
      to === "active" ||
      to === "cancelled" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "active") {
    return (
      to === "paused" ||
      to === "completed" ||
      to === "cancelled" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "paused") {
    return (
      to === "active" ||
      to === "cancelled" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "completed") {
    return (
      to === "sealed" ||
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "cancelled") {
    return (
      to === "disputed" ||
      to === "burned"
    );
  }

  if (from === "disputed") {
    return (
      to === "active" ||
      to === "completed" ||
      to === "cancelled" ||
      to === "sealed" ||
      to === "burned"
    );
  }

  return false;
}

function normalizeProofRules(
  rules: WorkOrderProofRuleInput[]
): WorkOrderProofRule[] {
  if (!Array.isArray(rules)) {
    return [];
  }

  return rules
    .map(normalizeProofRule)
    .filter((rule): rule is WorkOrderProofRule => Boolean(rule))
    .slice(0, 50);
}

function normalizeProofRule(
  rule: WorkOrderProofRuleInput
): WorkOrderProofRule | null {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const requirement = cleanProofRequirement(rule.requirement);

  if (!requirement) {
    return null;
  }

  return {
    rule_id: makeProofRuleId(),
    requirement,
    required: rule.required !== false,
    label:
      cleanText(rule.label ?? requirement, 240) ||
      requirement,
    ref_id: cleanNullableId(rule.ref_id ?? null)
  };
}

function cleanProofRequirement(
  value: unknown
): WorkOrderProofRequirement | null {
  if (
    value === "none" ||
    value === "footprint" ||
    value === "moment" ||
    value === "photo" ||
    value === "before-after" ||
    value === "proximity" ||
    value === "signature" ||
    value === "reference" ||
    value === "custom"
  ) {
    return value;
  }

  return null;
}

function cleanPriority(value: unknown): WorkOrderPriority {
  if (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "urgent"
  ) {
    return value;
  }

  return "normal";
}

function makeWorkOrderId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-order-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function makeProofRuleId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    "work-order-proof-rule-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

function cloneWorkOrder(
  workOrder: WorkOrderRecord
): WorkOrderRecord {
  return {
    work_order_id: workOrder.work_order_id,

    tenant_id: workOrder.tenant_id,

    requester_private_id: workOrder.requester_private_id ?? null,
    requester_public_id: workOrder.requester_public_id ?? null,

    worker_private_id: workOrder.worker_private_id,
    worker_public_id: workOrder.worker_public_id ?? null,

    job_id: workOrder.job_id ?? null,
    need_id: workOrder.need_id ?? null,
    match_id: workOrder.match_id ?? null,
    ping_id: workOrder.ping_id ?? null,
    moment_id: workOrder.moment_id ?? null,
    surface_id: workOrder.surface_id ?? null,

    title: workOrder.title,
    description: workOrder.description ?? null,
    location_text: workOrder.location_text ?? null,

    status: workOrder.status,
    priority: workOrder.priority,

    proof_rules: workOrder.proof_rules.map(cloneProofRule),

    completion_terms: workOrder.completion_terms ?? null,
    cancellation_reason: workOrder.cancellation_reason ?? null,
    dispute_reason: workOrder.dispute_reason ?? null,

    created_at_ms: workOrder.created_at_ms,
    updated_at_ms: workOrder.updated_at_ms,

    offered_at_ms: workOrder.offered_at_ms ?? null,
    accepted_at_ms: workOrder.accepted_at_ms ?? null,
    started_at_ms: workOrder.started_at_ms ?? null,
    paused_at_ms: workOrder.paused_at_ms ?? null,
    completed_at_ms: workOrder.completed_at_ms ?? null,
    cancelled_at_ms: workOrder.cancelled_at_ms ?? null,
    disputed_at_ms: workOrder.disputed_at_ms ?? null,
    sealed_at_ms: workOrder.sealed_at_ms ?? null,
    burned_at_ms: workOrder.burned_at_ms ?? null,

    data: cloneData(workOrder.data)
  };
}

function cloneProofRule(
  rule: WorkOrderProofRule
): WorkOrderProofRule {
  return {
    rule_id: rule.rule_id,
    requirement: rule.requirement,
    required: rule.required,
    label: rule.label,
    ref_id: rule.ref_id ?? null
  };
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

function cleanNullableText(
  value: unknown,
  maxLength: number
): string | null {
  const text = cleanText(value, maxLength);
  return text || null;
}

function cleanText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanNullableId(value: unknown): string | null {
  const clean = cleanId(value);
  return clean || null;
}

function cleanId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const clean = String(value).trim();

  if (!clean || clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)) {
    return "";
  }

  return clean;
}

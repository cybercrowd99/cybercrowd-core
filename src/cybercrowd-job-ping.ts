// src/cybercrowd-job-ping.ts
//
// CyberCrowd Job Ping Organ
//
// ONE JOB:
// Coordinate human responses to live work opportunities.
//
// This organ is responsible for moving a job invitation through
// a deterministic response lifecycle.
//
// It is NOT:
// - cybercrowd-net
// - auth
// - payment
// - marketplace UI
// - notification transport
//
// It only records and coordinates the human response.
//
// A ping is evidence.
// A ping is not authority.

export type JobPingState =
  | "pending"
  | "accepted"
  | "declined"
  | "later"
  | "expired"
  | "cancelled";

export type JobPingPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface JobPingRecord {
  ping_id: string;

  job_id: string;

  worker_private_id: string;

  created_at_ms: number;

  expires_at_ms: number;

  responded_at_ms: number | null;

  priority: JobPingPriority;

  state: JobPingState;

  payload: Record<string, unknown>;
}

export interface CreateJobPingRequest {
  job_id: string;

  worker_private_id: string;

  priority?: JobPingPriority;

  ttl_ms?: number;

  payload?: Record<string, unknown>;
}

export interface JobPingResponse {
  ok: boolean;

  ping?: JobPingRecord;

  error?: string;
}

export interface JobPingListResponse {
  ok: boolean;

  pings: JobPingRecord[];
}

export interface JobPingOrgan {
  create(
    request: CreateJobPingRequest
  ): Promise<JobPingResponse>;

  accept(
    ping_id: string
  ): Promise<JobPingResponse>;

  decline(
    ping_id: string
  ): Promise<JobPingResponse>;

  later(
    ping_id: string
  ): Promise<JobPingResponse>;

  cancel(
    ping_id: string
  ): Promise<JobPingResponse>;

  expire(): Promise<number>;

  get(
    ping_id: string
  ): Promise<JobPingRecord | null>;

  listForWorker(
    worker_private_id: string
  ): Promise<JobPingListResponse>;

  listForJob(
    job_id: string
  ): Promise<JobPingListResponse>;
}

export class InMemoryJobPingOrgan implements JobPingOrgan {

  private readonly pings = new Map<string, JobPingRecord>();

  async create(
    request: CreateJobPingRequest
  ): Promise<JobPingResponse> {

    const job_id = cleanId(request.job_id);
    const worker_private_id = cleanId(request.worker_private_id);

    if (!job_id)
      return {
        ok: false,
        error: "JOB_ID_REQUIRED"
      };

    if (!worker_private_id)
      return {
        ok: false,
        error: "WORKER_PRIVATE_ID_REQUIRED"
      };

    const now = Date.now();

    const ttl =
      typeof request.ttl_ms === "number" &&
      request.ttl_ms > 0
        ? request.ttl_ms
        : 300000;

    const ping: JobPingRecord = {

      ping_id: makePingId(),

      job_id,

      worker_private_id,

      created_at_ms: now,

      expires_at_ms: now + ttl,

      responded_at_ms: null,

      priority: cleanPriority(
        request.priority ?? "normal"
      ),

      state: "pending",

      payload: clone(
        request.payload ?? {}
      )
    };

    this.pings.set(
      ping.ping_id,
      ping
    );

    return {
      ok: true,
      ping: clone(ping)
    };
  }

  async accept(
    ping_id: string
  ): Promise<JobPingResponse> {
    return this.transition(
      ping_id,
      "accepted"
    );
  }

  async decline(
    ping_id: string
  ): Promise<JobPingResponse> {
    return this.transition(
      ping_id,
      "declined"
    );
  }

  async later(
    ping_id: string
  ): Promise<JobPingResponse> {
    return this.transition(
      ping_id,
      "later"
    );
  }

  async cancel(
    ping_id: string
  ): Promise<JobPingResponse> {
    return this.transition(
      ping_id,
      "cancelled"
    );
  }

  async expire(): Promise<number> {

    let expired = 0;

    const now = Date.now();

    for (const ping of this.pings.values()) {

      if (
        ping.state !== "pending"
      ) continue;

      if (
        ping.expires_at_ms > now
      ) continue;

      ping.state = "expired";

      ping.responded_at_ms = now;

      expired++;
    }

    return expired;
  }

  async get(
    ping_id: string
  ): Promise<JobPingRecord | null> {

    const ping =
      this.pings.get(
        cleanId(ping_id)
      );

    return ping
      ? clone(ping)
      : null;
  }

  async listForWorker(
    worker_private_id: string
  ): Promise<JobPingListResponse> {

    const id =
      cleanId(worker_private_id);

    return {
      ok: true,
      pings: [...this.pings.values()]
        .filter(
          p =>
            p.worker_private_id === id
        )
        .map(clone)
    };
  }

  async listForJob(
    job_id: string
  ): Promise<JobPingListResponse> {

    const id =
      cleanId(job_id);

    return {
      ok: true,
      pings: [...this.pings.values()]
        .filter(
          p =>
            p.job_id === id
        )
        .map(clone)
    };
  }

  private async transition(
    ping_id: string,
    state: JobPingState
  ): Promise<JobPingResponse> {

    const ping =
      this.pings.get(
        cleanId(ping_id)
      );

    if (!ping)
      return {
        ok: false,
        error: "PING_NOT_FOUND"
      };

    if (
      ping.state !== "pending"
    )
      return {
        ok: false,
        error: "PING_ALREADY_RESOLVED"
      };

    ping.state = state;

    ping.responded_at_ms =
      Date.now();

    return {
      ok: true,
      ping: clone(ping)
    };
  }
}

function makePingId(): string {

  if (
    globalThis.crypto?.randomUUID
  )
    return globalThis.crypto.randomUUID();

  return (
    "ping-" +
    Math.random()
      .toString(36)
      .slice(2) +
    "-" +
    Date.now()
      .toString(36)
  );
}

function cleanPriority(
  value: JobPingPriority
): JobPingPriority {

  switch (value) {

    case "low":
    case "normal":
    case "high":
    case "critical":
      return value;

    default:
      return "normal";
  }
}

function cleanId(
  value: unknown
): string {

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  )
    return "";

  const id =
    String(value).trim();

  if (!id)
    return "";

  if (id.length > 180)
    return "";

  return id;
}

function clone<T>(
  value: T
): T {

  return JSON.parse(
    JSON.stringify(value)
  );
}

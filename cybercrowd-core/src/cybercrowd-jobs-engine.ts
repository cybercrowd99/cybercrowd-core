/**
 * cybercrowd-jobs-engine.ts
 *
 * CyberCrowd Jobs Engine
 *
 * ONE JOB:
 * Coordinate work inside CyberCrowd CORE.
 *
 * This is NOT NET.
 * This is NOT marketplace.
 * This is NOT audience-facing.
 *
 * This is CORE work coordination:
 * - job creation
 * - job assignment
 * - job acceptance
 * - job completion
 * - job cancellation
 * - job scheduling
 * - job decals
 * - job pings
 */

export const CyberCrowdJobsEngine = (() => {
  const jobs = new Map();

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix: string) {
    return prefix + "." + Date.now() + "." + Math.random().toString(36).slice(2, 10);
  }

  function createJob(ownerId: string, payload: any) {
    const id = makeId("JOB");

    const job = {
      id,
      owner_id: ownerId,
      payload,
      created_at: now(),
      assigned_to: null,
      accepted_at: null,
      completed_at: null,
      cancelled_at: null,
      status: "open"
    };

    jobs.set(id, job);
    return job;
  }

  function assignJob(jobId: string, identityId: string) {
    const job = jobs.get(jobId);
    if (!job || job.status !== "open") return null;

    job.assigned_to = identityId;
    job.status = "assigned";
    job.assigned_at = now();

    return job;
  }

  function acceptJob(jobId: string, identityId: string) {
    const job = jobs.get(jobId);
    if (!job || job.assigned_to !== identityId) return null;

    job.accepted_at = now();
    job.status = "in_progress";

    return job;
  }

  function completeJob(jobId: string, identityId: string) {
    const job = jobs.get(jobId);
    if (!job || job.assigned_to !== identityId) return null;

    job.completed_at = now();
    job.status = "completed";

    return job;
  }

  function cancelJob(jobId: string, ownerId: string) {
    const job = jobs.get(jobId);
    if (!job || job.owner_id !== ownerId) return null;

    job.cancelled_at = now();
    job.status = "cancelled";

    return job;
  }

  function listJobs(identityId: string) {
    return Array.from(jobs.values()).filter(
      (j) => j.owner_id === identityId || j.assigned_to === identityId
    );
  }

  return {
    createJob,
    assignJob,
    acceptJob,
    completeJob,
    cancelJob,
    listJobs
  };
})();

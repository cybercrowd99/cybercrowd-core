// src/core/repeated-step-friction-detector.js
// CyberCrowd Core — Repeated Step Friction Detector
// Owns: detecting when a human is forced to repeat the same step and may leave.
// Rule: Repeating the human is a warning. Friction is not failure.
// Friction is repair evidence. State the problem stays allowed.
// Does not: blame the human, punish the human, block the account,
// expose identity evidence, include private proof, include address/phone/first name/raw uIDL,
// send email, run payments, reopen accounts, or deal directly with customer.

const RepeatedStepFrictionDetector = (() => {
  const detections = [];

  const DEFAULT_REPEAT_WINDOW_MS = 15 * 60 * 1000;
  const DEFAULT_MIN_REPEAT_COUNT = 2;

  const STEP_EVENT_TYPES = [
    "button_click",
    "form_submit",
    "form_restart",
    "verification_attempt",
    "verification_failure",
    "email_resend",
    "retry_click",
    "back_button",
    "timeout",
    "page_reopen",
    "support_message",
    "exit_survey_feedback",
    "unknown",
  ];

  const REPEAT_LANGUAGE_PATTERNS = [
    /\bagain\b/i,
    /\balready did\b/i,
    /\bi already did\b/i,
    /\bwhy again\b/i,
    /\brepeat\b/i,
    /\brepeating\b/i,
    /\bsame thing\b/i,
    /\bsame step\b/i,
    /\bstart over\b/i,
    /\bfrom the beginning\b/i,
    /\bresend\b/i,
    /\bretry\b/i,
    /\bit made me do it again\b/i,
    /\bi kept having to\b/i,
  ];

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  }

  function requireObject(value, errorCode) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(errorCode);
    }

    return value;
  }

  function normalizeText(value) {
    if (!value || typeof value !== "string") {
      return "";
    }

    return value.trim();
  }

  function normalizeBoolean(value) {
    return value === true;
  }

  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
  }

  function normalizeTimestamp(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return now();
    }

    const date = new Date(clean);

    if (Number.isNaN(date.getTime())) {
      return now();
    }

    return date.toISOString();
  }

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  function normalizeEventType(value) {
    const clean = normalizeText(value);

    if (STEP_EVENT_TYPES.includes(clean)) {
      return clean;
    }

    return "unknown";
  }

  function normalizeSafeReference(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "";
    }

    return clean
      .replace(/\s+/g, " ")
      .replace(/[<>]/g, "")
      .trim();
  }

  function maskUidl(uidl) {
    const clean = normalizeText(uidl);

    if (!clean) {
      return "";
    }

    if (clean.length <= 8) {
      return `${clean.slice(0, 2)}***`;
    }

    return `${clean.slice(0, 4)}***${clean.slice(-4)}`;
  }

  function sanitizeSafeText(value) {
    const clean = normalizeText(value);

    if (!clean) {
      return "";
    }

    return clean
      .replace(/\bpassword\b/gi, "credential")
      .replace(/\btoken\b/gi, "credential")
      .replace(/\bsecret\b/gi, "protected detail")
      .replace(/\bprivate proof\b/gi, "private verification")
      .replace(/\bidentity evidence\b/gi, "verification detail")
      .replace(/\bfirst name\b/gi, "name detail")
      .replace(/\bhome address\b/gi, "address detail")
      .replace(/\bphone number\b/gi, "phone detail")
      .replace(/\braw uIDL\b/gi, "protected uIDL")
      .replace(/\bfull uIDL\b/gi, "protected uIDL")
      .replace(/\barchive contents\b/gi, "archive detail");
  }

  function normalizeStepEvent(event = {}) {
    const cleanEvent = event && typeof event === "object" && !Array.isArray(event)
      ? event
      : {};

    return {
      event_id: normalizeSafeReference(cleanEvent.event_id) || makeId("stepEvent"),
      occurred_at: normalizeTimestamp(cleanEvent.occurred_at),
      event_type: normalizeEventType(cleanEvent.event_type),
      step_id: normalizeSafeReference(cleanEvent.step_id),
      step_name: sanitizeSafeText(cleanEvent.step_name),
      lane: normalizeSafeReference(cleanEvent.lane),
      surface: normalizeSafeReference(cleanEvent.surface),
      attempt_number: normalizeNumber(cleanEvent.attempt_number, 1),
      success: normalizeBoolean(cleanEvent.success),
      failed: normalizeBoolean(cleanEvent.failed),
      restarted: normalizeBoolean(cleanEvent.restarted),
      timed_out: normalizeBoolean(cleanEvent.timed_out),
      backtracked: normalizeBoolean(cleanEvent.backtracked),
      message: sanitizeSafeText(cleanEvent.message),
      safe_tags: normalizeList(cleanEvent.safe_tags).map(sanitizeSafeText),
    };
  }

  function normalizeDetectorInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    const events = Array.isArray(cleanInput.events)
      ? cleanInput.events.map(normalizeStepEvent)
      : [];

    return {
      uidl: normalizeText(cleanInput.uidl),
      uidl_hint: normalizeText(cleanInput.uidl_hint) || maskUidl(cleanInput.uidl),
      account_number: normalizeSafeReference(cleanInput.account_number),
      account_tag: normalizeSafeReference(cleanInput.account_tag),
      report_id: normalizeSafeReference(cleanInput.report_id),
      survey_id: normalizeSafeReference(cleanInput.survey_id),
      session_id_hint: normalizeSafeReference(cleanInput.session_id_hint),
      lane: normalizeSafeReference(cleanInput.lane),
      surface: normalizeSafeReference(cleanInput.surface),
      repeat_window_ms: normalizeNumber(cleanInput.repeat_window_ms, DEFAULT_REPEAT_WINDOW_MS),
      min_repeat_count: normalizeNumber(cleanInput.min_repeat_count, DEFAULT_MIN_REPEAT_COUNT),
      events,
      exit_survey_text: sanitizeSafeText(cleanInput.exit_survey_text),
      support_text: sanitizeSafeText(cleanInput.support_text),
      notes: normalizeList(cleanInput.notes).map(sanitizeSafeText),
    };
  }

  function detectRepeatedStepFriction(input = {}) {
    const normalized = normalizeDetectorInput(input);
    const grouped = groupEventsByStep(normalized.events);
    const repeatedSteps = findRepeatedSteps(grouped, normalized);
    const languageSignals = findLanguageSignals(normalized);
    const frictionScore = calculateFrictionScore(repeatedSteps, languageSignals, normalized);
    const state = deriveFrictionState(frictionScore, repeatedSteps, languageSignals);

    const detection = {
      detection_id: makeId("repeatedStepFriction"),
      created_at: now(),
      uidl: normalized.uidl,
      uidl_hint: normalized.uidl_hint,
      account_number: normalized.account_number,
      account_tag: normalized.account_tag,
      report_id: normalized.report_id,
      survey_id: normalized.survey_id,
      session_id_hint: normalized.session_id_hint,
      lane: normalized.lane,
      surface: normalized.surface,
      status: state,
      friction_score: frictionScore,
      repeated_steps: repeatedSteps,
      language_signals: languageSignals,
      repair_signal: buildRepairSignal(normalized, state, frictionScore, repeatedSteps, languageSignals),
      safe_summary: buildSafeSummary(state, frictionScore, repeatedSteps, languageSignals),
      paper_ladder_row: buildPaperLadderRow(normalized, state, frictionScore, repeatedSteps, languageSignals),
    };

    detections.push(clone(detection));

    return clone(detection);
  }

  function groupEventsByStep(events) {
    const grouped = {};

    events.forEach((event) => {
      const key = buildStepKey(event);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(event);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
      });
    });

    return grouped;
  }

  function buildStepKey(event) {
    const lane = event.lane || "unknown_lane";
    const surface = event.surface || "unknown_surface";
    const step = event.step_id || event.step_name || event.event_type || "unknown_step";

    return `${lane}::${surface}::${step}`;
  }

  function findRepeatedSteps(grouped, input) {
    return Object.keys(grouped)
      .map((key) => summarizeStepGroup(key, grouped[key], input))
      .filter((summary) => summary.repeat_detected);
  }

  function summarizeStepGroup(key, events, input) {
    const first = events[0];
    const last = events[events.length - 1];

    const firstTime = new Date(first.occurred_at).getTime();
    const lastTime = new Date(last.occurred_at).getTime();
    const windowMs = Math.max(0, lastTime - firstTime);

    const failureCount = events.filter((event) => event.failed).length;
    const restartCount = events.filter((event) => event.restarted).length;
    const timeoutCount = events.filter((event) => event.timed_out).length;
    const backtrackCount = events.filter((event) => event.backtracked || event.event_type === "back_button").length;
    const resendCount = events.filter((event) => event.event_type === "email_resend").length;
    const retryCount = events.filter((event) => event.event_type === "retry_click").length;
    const verificationRepeatCount = events.filter((event) => {
      return event.event_type === "verification_attempt" || event.event_type === "verification_failure";
    }).length;

    const repeatDetected =
      events.length >= input.min_repeat_count &&
      windowMs <= input.repeat_window_ms;

    return {
      step_key: key,
      step_id: first.step_id,
      step_name: first.step_name,
      lane: first.lane,
      surface: first.surface,
      first_seen_at: first.occurred_at,
      last_seen_at: last.occurred_at,
      window_ms: windowMs,
      event_count: events.length,
      failure_count: failureCount,
      restart_count: restartCount,
      timeout_count: timeoutCount,
      backtrack_count: backtrackCount,
      resend_count: resendCount,
      retry_count: retryCount,
      verification_repeat_count: verificationRepeatCount,
      repeat_detected: repeatDetected,
      likely_frustration: repeatDetected && (
        failureCount > 0 ||
        restartCount > 0 ||
        timeoutCount > 0 ||
        backtrackCount > 0 ||
        resendCount > 0 ||
        retryCount > 0 ||
        verificationRepeatCount > 1
      ),
      safe_tags: buildStepTags({
        failureCount,
        restartCount,
        timeoutCount,
        backtrackCount,
        resendCount,
        retryCount,
        verificationRepeatCount,
      }),
    };
  }

  function buildStepTags(counts) {
    const tags = [];

    if (counts.failureCount > 0) {
      tags.push("failure_repeat");
    }

    if (counts.restartCount > 0) {
      tags.push("restart_repeat");
    }

    if (counts.timeoutCount > 0) {
      tags.push("timeout_repeat");
    }

    if (counts.backtrackCount > 0) {
      tags.push("back_button_loop");
    }

    if (counts.resendCount > 0) {
      tags.push("resend_repeat");
    }

    if (counts.retryCount > 0) {
      tags.push("retry_repeat");
    }

    if (counts.verificationRepeatCount > 1) {
      tags.push("verification_repeat");
    }

    return tags;
  }

  function findLanguageSignals(input) {
    const combined = [
      input.exit_survey_text,
      input.support_text,
      ...input.notes,
      ...input.events.map((event) => event.message),
    ].filter(Boolean).join("\n");

    if (!combined) {
      return [];
    }

    return REPEAT_LANGUAGE_PATTERNS
      .filter((pattern) => pattern.test(combined))
      .map((pattern) => {
        return {
          signal_id: makeId("repeatLanguageSignal"),
          type: "repeat_step_language",
          matched: String(pattern),
          safe_label: "human_said_step_repeated",
        };
      });
  }

  function calculateFrictionScore(repeatedSteps, languageSignals, input) {
    let score = 0;

    repeatedSteps.forEach((step) => {
      score += step.event_count;
      score += step.failure_count * 2;
      score += step.restart_count * 3;
      score += step.timeout_count * 2;
      score += step.backtrack_count * 2;
      score += step.resend_count * 2;
      score += step.retry_count * 2;
      score += step.verification_repeat_count;
    });

    score += languageSignals.length * 5;

    if (input.exit_survey_text) {
      score += 3;
    }

    if (input.support_text) {
      score += 2;
    }

    return score;
  }

  function deriveFrictionState(score, repeatedSteps, languageSignals) {
    if (!repeatedSteps.length && !languageSignals.length) {
      return "no_repeat_friction_detected";
    }

    if (score >= 18) {
      return "critical_repeat_friction";
    }

    if (score >= 10) {
      return "repeat_friction_detected";
    }

    return "repeat_friction_possible";
  }

  function buildRepairSignal(input, state, score, repeatedSteps, languageSignals) {
    const repairNeeded = state !== "no_repeat_friction_detected";

    return {
      repair_signal_id: makeId("repeatStepRepairSignal"),
      repair_needed: repairNeeded,
      signal_type: "repeated_step_friction",
      state,
      score,
      source: "core.repeated-step-friction-detector",
      safe_references: buildSafeReferences(input),
      repeated_step_count: repeatedSteps.length,
      language_signal_count: languageSignals.length,
      suggested_next_lane: repairNeeded
        ? "account-continuity-repair-discovery-router"
        : "",
      suggested_prompt: repairNeeded
        ? "State the problem."
        : "",
      doctrine: repairNeeded
        ? "Repeating the human is a warning. Friction is repair evidence."
        : "No repeated-step friction detected.",
    };
  }

  function buildSafeReferences(input) {
    const references = [];

    if (input.account_number) {
      references.push({
        type: "account_number",
        value: input.account_number,
      });
    }

    if (input.account_tag) {
      references.push({
        type: "account_tag",
        value: input.account_tag,
      });
    }

    if (input.uidl_hint) {
      references.push({
        type: "masked_uidl_hint",
        value: input.uidl_hint,
      });
    }

    if (input.report_id) {
      references.push({
        type: "report_id",
        value: input.report_id,
      });
    }

    if (input.survey_id) {
      references.push({
        type: "survey_id",
        value: input.survey_id,
      });
    }

    if (input.session_id_hint) {
      references.push({
        type: "session_hint",
        value: input.session_id_hint,
      });
    }

    return references;
  }

  function buildSafeSummary(state, score, repeatedSteps, languageSignals) {
    if (state === "no_repeat_friction_detected") {
      return {
        headline: "No repeated-step friction detected",
        body: "No repeated-step repair signal was detected in this input.",
        safe_tags: ["no_repeat_friction"],
      };
    }

    if (state === "critical_repeat_friction") {
      return {
        headline: "Critical repeated-step friction detected",
        body: "The human appears to have been forced through repeated steps enough to create a likely exit cause.",
        safe_tags: ["critical_repeat_friction", "repair_evidence", "state_the_problem"],
      };
    }

    if (state === "repeat_friction_detected") {
      return {
        headline: "Repeated-step friction detected",
        body: "The human appears to have repeated the same step enough to create repair evidence.",
        safe_tags: ["repeat_friction_detected", "repair_evidence", "state_the_problem"],
      };
    }

    return {
      headline: "Repeated-step friction possible",
      body: "There is a possible repeated-step frustration signal.",
      safe_tags: ["repeat_friction_possible", "review_needed"],
    };
  }

  function buildPaperLadderRow(input, state, score, repeatedSteps, languageSignals) {
    return {
      row_id: makeId("repeatedStepFrictionPaperRow"),
      created_at: now(),
      state,
      score,
      lane: input.lane,
      surface: input.surface,
      has_account_number: Boolean(input.account_number),
      has_account_tag: Boolean(input.account_tag),
      has_masked_uidl_hint: Boolean(input.uidl_hint),
      has_report_id: Boolean(input.report_id),
      has_survey_id: Boolean(input.survey_id),
      repeated_step_count: repeatedSteps.length,
      language_signal_count: languageSignals.length,
      repair_needed: state !== "no_repeat_friction_detected",
      boundary: "REPEATED_STEP_FRICTION_IS_REPAIR_EVIDENCE_NOT_HUMAN_BLAME",
    };
  }

  function listDetections(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const status = normalizeText(cleanFilter.status);
    const reportId = normalizeText(cleanFilter.report_id);
    const surveyId = normalizeText(cleanFilter.survey_id);
    const lane = normalizeText(cleanFilter.lane);

    return detections
      .filter((detection) => {
        if (uidl && detection.uidl !== uidl) {
          return false;
        }

        if (status && detection.status !== status) {
          return false;
        }

        if (reportId && detection.report_id !== reportId) {
          return false;
        }

        if (surveyId && detection.survey_id !== surveyId) {
          return false;
        }

        if (lane && detection.lane !== lane) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestDetection() {
    if (!detections.length) {
      return null;
    }

    return clone(detections[detections.length - 1]);
  }

  function listPaperLadderRows(filter = {}) {
    return listDetections(filter).map((detection) => clone(detection.paper_ladder_row));
  }

  function clearDetections() {
    detections.length = 0;
    return true;
  }

  return {
    detectRepeatedStepFriction,
    listDetections,
    latestDetection,
    listPaperLadderRows,
    clearDetections,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = RepeatedStepFrictionDetector;
}

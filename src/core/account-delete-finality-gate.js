// src/core/account-delete-finality-gate.js
// CyberCrowd Core — Account Delete Finality Gate
// Owns: deliberate account deletion finality, no-accident confirmation, and optional one-time delete reference.
// Rule #1: No accidents.
// Rule #2: Refer back to Rule #1.
// Does not: delete by accident, recover without saved reference, bypass human verification,
// replace login recovery, store passwords, store raw Turnstile tokens, charge money,
// run payments, delete external provider accounts, or silently erase identity history.

const AccountDeleteFinalityGate = (() => {
  const deleteRequests = [];

  const DELETE_CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";
  const DEFAULT_REFERENCE_LENGTH = 4;

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

  function requireText(value, errorCode) {
    if (!value || typeof value !== "string" || !value.trim()) {
      throw new Error(errorCode);
    }

    return value.trim();
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

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  function normalizeNumber(value, fallback = null) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
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

  function normalizeDeleteInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      uidl: requireText(cleanInput.uidl, "UIDL_REQUIRED"),
      requested_by: normalizeText(cleanInput.requested_by),
      delete_scope: normalizeText(cleanInput.delete_scope) || "account",
      reason: normalizeText(cleanInput.reason),
      confirmation_phrase: normalizeText(cleanInput.confirmation_phrase),
      turnstile_passed: normalizeBoolean(cleanInput.turnstile_passed),
      human_verified: normalizeBoolean(cleanInput.human_verified),
      final_warning_acknowledged: normalizeBoolean(cleanInput.final_warning_acknowledged),
      understands_finality: normalizeBoolean(cleanInput.understands_finality),
      wants_delete_reference: normalizeBoolean(cleanInput.wants_delete_reference),
      reference_style: normalizeText(cleanInput.reference_style) || "mixed",
      reference_length: normalizeNumber(cleanInput.reference_length, DEFAULT_REFERENCE_LENGTH),
      recovery_reference_fee_acknowledged: normalizeBoolean(cleanInput.recovery_reference_fee_acknowledged),
      allowed_delete_scopes: normalizeList(cleanInput.allowed_delete_scopes),
      metadata: normalizeMetadata(cleanInput.metadata),
    };
  }

  function normalizeMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return {
      client_hint: normalizeText(metadata.client_hint),
      device_hint: normalizeText(metadata.device_hint),
      session_hint: normalizeText(metadata.session_hint),
      route_hint: normalizeText(metadata.route_hint),
    };
  }

  function deleteScopeAllowed(input) {
    if (!input.allowed_delete_scopes.length) {
      return input.delete_scope === "account";
    }

    return input.allowed_delete_scopes.includes(input.delete_scope);
  }

  function phraseMatches(input) {
    return input.confirmation_phrase === DELETE_CONFIRMATION_PHRASE;
  }

  function getGateFailures(input) {
    const failures = [];

    if (!deleteScopeAllowed(input)) {
      failures.push("DELETE_SCOPE_NOT_ALLOWED");
    }

    if (!phraseMatches(input)) {
      failures.push("CONFIRMATION_PHRASE_REQUIRED");
    }

    if (!input.turnstile_passed) {
      failures.push("TURNSTILE_REQUIRED");
    }

    if (!input.human_verified) {
      failures.push("HUMAN_VERIFICATION_REQUIRED");
    }

    if (!input.final_warning_acknowledged) {
      failures.push("FINAL_WARNING_ACK_REQUIRED");
    }

    if (!input.understands_finality) {
      failures.push("FINALITY_UNDERSTANDING_REQUIRED");
    }

    if (input.wants_delete_reference && !input.recovery_reference_fee_acknowledged) {
      failures.push("REFERENCE_FEE_ACK_REQUIRED");
    }

    return failures;
  }

  function generateReferenceCharacters(style, length) {
    const safeLength = Math.max(4, Math.min(12, normalizeNumber(length, DEFAULT_REFERENCE_LENGTH)));

    const numberSet = "0123456789";
    const upperSet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowerSet = "abcdefghijkmnopqrstuvwxyz";
    const mixedSet = `${numberSet}${upperSet}${lowerSet}`;

    let alphabet = mixedSet;

    if (style === "numbers") {
      alphabet = numberSet;
    }

    if (style === "letters") {
      alphabet = `${upperSet}${lowerSet}`;
    }

    if (style === "upper") {
      alphabet = upperSet;
    }

    const characters = [];

    for (let index = 0; index < safeLength; index += 1) {
      const position = Math.floor(Math.random() * alphabet.length);
      characters.push(alphabet[position]);
    }

    return characters;
  }

  function makeDeleteReference(input) {
    if (!input.wants_delete_reference) {
      return null;
    }

    const characters = generateReferenceCharacters(input.reference_style, input.reference_length);

    return {
      reference_id: makeId("deleteReference"),
      created_at: now(),
      uidl_hint: maskUidl(input.uidl),
      character_boxes: characters.map((character, index) => ({
        box: index + 1,
        character,
      })),
      one_time_only: true,
      status: "reference_created_before_finality",
      fee_note: "Recovery reference fee acknowledged by user. Payment is handled outside this Core gate.",
    };
  }

  function createDeleteRequest(input = {}) {
    const normalized = normalizeDeleteInput(input);
    const failures = getGateFailures(normalized);

    const request = {
      delete_request_id: makeId("deleteRequest"),
      created_at: now(),
      uidl: normalized.uidl,
      uidl_hint: maskUidl(normalized.uidl),
      requested_by: normalized.requested_by,
      delete_scope: normalized.delete_scope,
      reason: normalized.reason,
      status: failures.length ? "blocked" : "ready_for_final_delete",
      failures,
      rule_1: "NO_ACCIDENTS",
      rule_2: "REFER_BACK_TO_RULE_1",
      finality_message: "When deletion is finalized, it is final.",
      gate_snapshot: {
        confirmation_phrase_required: DELETE_CONFIRMATION_PHRASE,
        confirmation_phrase_passed: phraseMatches(normalized),
        turnstile_passed: normalized.turnstile_passed,
        human_verified: normalized.human_verified,
        final_warning_acknowledged: normalized.final_warning_acknowledged,
        understands_finality: normalized.understands_finality,
        wants_delete_reference: normalized.wants_delete_reference,
        recovery_reference_fee_acknowledged: normalized.recovery_reference_fee_acknowledged,
      },
      delete_reference: failures.length ? null : makeDeleteReference(normalized),
      metadata: clone(normalized.metadata),
    };

    deleteRequests.push(clone(request));

    return clone(request);
  }

  function finalizeDelete(deleteRequestId, input = {}) {
    const request = deleteRequests.find((item) => item.delete_request_id === deleteRequestId);

    if (!request) {
      throw new Error("DELETE_REQUEST_NOT_FOUND");
    }

    if (request.status !== "ready_for_final_delete") {
      throw new Error("DELETE_REQUEST_NOT_READY");
    }

    const cleanInput = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const finalHumanAck = normalizeBoolean(cleanInput.final_human_acknowledged);
    const finalPhrase = normalizeText(cleanInput.final_confirmation_phrase);

    if (!finalHumanAck) {
      throw new Error("FINAL_HUMAN_ACK_REQUIRED");
    }

    if (finalPhrase !== DELETE_CONFIRMATION_PHRASE) {
      throw new Error("FINAL_CONFIRMATION_PHRASE_REQUIRED");
    }

    request.status = "finalized";
    request.finalized_at = now();
    request.final_delete_token = makeId("finalDelete");
    request.finality_message = "Delete finalized. No accidental recovery path is created by this gate.";

    return clone({
      delete_request_id: request.delete_request_id,
      uidl_hint: request.uidl_hint,
      delete_scope: request.delete_scope,
      status: request.status,
      finalized_at: request.finalized_at,
      final_delete_token: request.final_delete_token,
      delete_reference_created: Boolean(request.delete_reference),
      message: request.finality_message,
    });
  }

  function cancelDeleteRequest(deleteRequestId, reason = "USER_CANCELLED") {
    const request = deleteRequests.find((item) => item.delete_request_id === deleteRequestId);

    if (!request) {
      throw new Error("DELETE_REQUEST_NOT_FOUND");
    }

    if (request.status === "finalized") {
      throw new Error("DELETE_ALREADY_FINALIZED");
    }

    request.status = "cancelled";
    request.cancelled_at = now();
    request.cancel_reason = normalizeText(reason) || "USER_CANCELLED";

    return clone(request);
  }

  function buildDisplayState(deleteRequestId) {
    const request = deleteRequests.find((item) => item.delete_request_id === deleteRequestId);

    if (!request) {
      throw new Error("DELETE_REQUEST_NOT_FOUND");
    }

    if (request.status === "blocked") {
      return {
        display_state: "blocked",
        headline: "Delete blocked",
        body: "Account delete cannot continue until every no-accident gate is passed.",
        failures: clone(request.failures),
        rule_1: request.rule_1,
        rule_2: request.rule_2,
      };
    }

    if (request.status === "ready_for_final_delete") {
      return {
        display_state: "ready_for_final_delete",
        headline: "Final delete ready",
        body: "Deletion is final after the last human confirmation.",
        delete_reference_created: Boolean(request.delete_reference),
        rule_1: request.rule_1,
        rule_2: request.rule_2,
      };
    }

    if (request.status === "finalized") {
      return {
        display_state: "finalized",
        headline: "Account delete finalized",
        body: "Deletion was deliberately finalized.",
        finalized_at: request.finalized_at,
        delete_reference_created: Boolean(request.delete_reference),
      };
    }

    if (request.status === "cancelled") {
      return {
        display_state: "cancelled",
        headline: "Delete cancelled",
        body: request.cancel_reason || "Delete request was cancelled.",
        cancelled_at: request.cancelled_at,
      };
    }

    return {
      display_state: "unknown",
      headline: "Delete state unknown",
      body: "Delete request exists but does not match a known display state.",
    };
  }

  function listDeleteRequests(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const status = normalizeText(cleanFilter.status);

    return deleteRequests
      .filter((request) => {
        if (uidl && request.uidl !== uidl) {
          return false;
        }

        if (status && request.status !== status) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestDeleteRequest() {
    if (!deleteRequests.length) {
      return null;
    }

    return clone(deleteRequests[deleteRequests.length - 1]);
  }

  function clearDeleteRequests() {
    deleteRequests.length = 0;
    return true;
  }

  return {
    createDeleteRequest,
    finalizeDelete,
    cancelDeleteRequest,
    buildDisplayState,
    listDeleteRequests,
    latestDeleteRequest,
    clearDeleteRequests,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountDeleteFinalityGate;
}

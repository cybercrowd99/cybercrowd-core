// src/core/account-continuity-email-handoff-gate.js
// CyberCrowd Core — Account Continuity Email Handoff Gate
// Owns: checking account continuity email content before provider handoff.
// Rule: Email can identify the report. Email cannot expose the person.
// Gate checks before handoff. No silent endings.
// Good email identifiers: account number, report number, archive reference,
// delete reference, recovery review reference, safe tag, masked uIDL hint.
// Bad email identifiers: home address, phone number, first name, full identity,
// private proof, raw uIDL, passwords, tokens, archive contents, and unnecessary identity detail.
// Does not: send email, run payments, delete accounts, recover accounts,
// expose private identity, include proof material, expose archive contents,
// store email credentials, or deal directly with customer.

const AccountContinuityEmailHandoffGate = (() => {
  const handoffs = [];

  const BLOCKED_PATTERNS = [
    {
      code: "PHONE_NUMBER_PRESENT",
      pattern: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
    },
    {
      code: "EMAIL_PASSWORD_WORD_PRESENT",
      pattern: /\b(password|passcode|secret|token|raw token|api key|private key)\b/i,
    },
    {
      code: "IDENTITY_EVIDENCE_WORD_PRESENT",
      pattern: /\b(identity evidence|private proof|proof document|driver license|social security|ssn|passport)\b/i,
    },
    {
      code: "ADDRESS_WORD_PRESENT",
      pattern: /\b(home address|street address|mailing address|billing address|shipping address)\b/i,
    },
    {
      code: "ARCHIVE_CONTENT_WORD_PRESENT",
      pattern: /\b(archive contents|private archive contents|raw archive|recovered files attached)\b/i,
    },
    {
      code: "FIRST_NAME_WORD_PRESENT",
      pattern: /\b(first name|legal name|full name)\b/i,
    },
    {
      code: "RAW_UIDL_WORD_PRESENT",
      pattern: /\b(raw uIDL|full uIDL|unmasked uIDL)\b/i,
    },
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

  function normalizeSafeIdentifierRule(rule = {}) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      return {
        allowed: [
          "account_number",
          "report_number",
          "archive_reference",
          "delete_reference",
          "recovery_review_reference",
          "safe_tag",
          "masked_uidl_hint",
        ],
        blocked: [
          "home_address",
          "phone_number",
          "first_name",
          "full_identity",
          "private_proof",
          "raw_uidl",
          "passwords",
          "tokens",
          "archive_contents",
        ],
      };
    }

    return {
      allowed: normalizeList(rule.allowed),
      blocked: normalizeList(rule.blocked),
    };
  }

  function normalizeEmailPacket(packet = {}) {
    const cleanPacket = requireObject(packet, "EMAIL_PACKET_REQUIRED");

    return {
      report_id: requireText(cleanPacket.report_id, "REPORT_ID_REQUIRED"),
      report_type: normalizeText(cleanPacket.report_type) || "monthly",
      account_number: normalizeSafeReference(cleanPacket.account_number),
      account_tag: normalizeSafeReference(cleanPacket.account_tag),
      uidl_hint: normalizeSafeReference(cleanPacket.uidl_hint),
      archive_reference_id: normalizeSafeReference(cleanPacket.archive_reference_id),
      delete_reference_id: normalizeSafeReference(cleanPacket.delete_reference_id),
      recovery_review_id: normalizeSafeReference(cleanPacket.recovery_review_id),
      to_email: requireText(cleanPacket.to_email, "TO_EMAIL_REQUIRED"),
      subject: requireText(cleanPacket.subject, "SUBJECT_REQUIRED"),
      body: requireText(cleanPacket.body, "BODY_REQUIRED"),
      email_only: cleanPacket.email_only !== false,
      identity_boundary:
        normalizeText(cleanPacket.identity_boundary) || "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
      safe_identifier_rule: normalizeSafeIdentifierRule(cleanPacket.safe_identifier_rule),
      provider_hint: normalizeText(cleanPacket.provider_hint),
      request_id: normalizeSafeReference(cleanPacket.request_id),
      metadata: normalizeMetadata(cleanPacket.metadata),
    };
  }

  function normalizeMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    const allowed = {};

    Object.keys(metadata).forEach((key) => {
      const cleanKey = normalizeText(key);

      if (!cleanKey || isBlockedMetadataKey(cleanKey)) {
        return;
      }

      const value = metadata[key];

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        allowed[cleanKey] = value;
      }
    });

    return allowed;
  }

  function isBlockedMetadataKey(key) {
    const lower = key.toLowerCase();

    return [
      "first_name",
      "firstname",
      "legal_name",
      "full_name",
      "address",
      "home_address",
      "phone",
      "phone_number",
      "raw_uidl",
      "full_uidl",
      "password",
      "token",
      "secret",
      "archive_contents",
      "private_proof",
      "identity_evidence",
    ].includes(lower);
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

  function inspectEmailContent(packet) {
    const findings = [];
    const subjectAndBody = `${packet.subject}\n${packet.body}`;

    BLOCKED_PATTERNS.forEach((item) => {
      if (item.pattern.test(subjectAndBody)) {
        findings.push({
          code: item.code,
          severity: "blocked",
        });
      }
    });

    if (!packet.email_only) {
      findings.push({
        code: "EMAIL_ONLY_FALSE",
        severity: "blocked",
      });
    }

    if (packet.identity_boundary !== "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON") {
      findings.push({
        code: "IDENTITY_BOUNDARY_NOT_LOCKED",
        severity: "blocked",
      });
    }

    if (!hasSafeReportIdentifier(packet)) {
      findings.push({
        code: "NO_SAFE_REPORT_IDENTIFIER",
        severity: "warning",
      });
    }

    if (!packet.subject.includes("CyberCrowd")) {
      findings.push({
        code: "SUBJECT_MISSING_CYBERCROWD",
        severity: "warning",
      });
    }

    return findings;
  }

  function hasSafeReportIdentifier(packet) {
    return Boolean(
      packet.report_id ||
      packet.account_number ||
      packet.account_tag ||
      packet.uidl_hint ||
      packet.archive_reference_id ||
      packet.delete_reference_id ||
      packet.recovery_review_id
    );
  }

  function hasBlockedFindings(findings) {
    return findings.some((finding) => finding.severity === "blocked");
  }

  function prepareEmailHandoff(packet = {}) {
    const normalizedPacket = normalizeEmailPacket(packet);
    const findings = inspectEmailContent(normalizedPacket);
    const blocked = hasBlockedFindings(findings);

    const handoff = {
      handoff_id: makeId("accountContinuityEmailHandoff"),
      prepared_at: now(),
      report_id: normalizedPacket.report_id,
      report_type: normalizedPacket.report_type,
      status: blocked ? "blocked" : "ready_for_provider",
      provider_hint: normalizedPacket.provider_hint,
      request_id: normalizedPacket.request_id,
      to_email_hint: maskEmail(normalizedPacket.to_email),
      subject: normalizedPacket.subject,
      email_only: normalizedPacket.email_only,
      identity_boundary: normalizedPacket.identity_boundary,
      safe_identifier_rule: clone(normalizedPacket.safe_identifier_rule),
      safe_references: buildSafeReferences(normalizedPacket),
      findings,
      provider_packet: blocked ? null : buildProviderPacket(normalizedPacket),
      safe_summary: buildSafeSummary(normalizedPacket, findings, blocked),
      paper_ladder_row: buildPaperLadderRow(normalizedPacket, findings, blocked),
    };

    handoffs.push(clone(handoff));

    return clone(handoff);
  }

  function buildSafeReferences(packet) {
    const references = [];

    if (packet.report_id) {
      references.push({
        type: "report_id",
        value: packet.report_id,
      });
    }

    if (packet.account_number) {
      references.push({
        type: "account_number",
        value: packet.account_number,
      });
    }

    if (packet.account_tag) {
      references.push({
        type: "account_tag",
        value: packet.account_tag,
      });
    }

    if (packet.uidl_hint) {
      references.push({
        type: "masked_uidl_hint",
        value: packet.uidl_hint,
      });
    }

    if (packet.archive_reference_id) {
      references.push({
        type: "archive_reference",
        value: packet.archive_reference_id,
      });
    }

    if (packet.delete_reference_id) {
      references.push({
        type: "delete_reference",
        value: packet.delete_reference_id,
      });
    }

    if (packet.recovery_review_id) {
      references.push({
        type: "recovery_review_reference",
        value: packet.recovery_review_id,
      });
    }

    return references;
  }

  function buildProviderPacket(packet) {
    return {
      to: packet.to_email,
      subject: packet.subject,
      body: packet.body,
      metadata: {
        report_id: packet.report_id,
        report_type: packet.report_type,
        account_number: packet.account_number,
        account_tag: packet.account_tag,
        uidl_hint: packet.uidl_hint,
        archive_reference_id: packet.archive_reference_id,
        delete_reference_id: packet.delete_reference_id,
        recovery_review_id: packet.recovery_review_id,
        request_id: packet.request_id,
        ...packet.metadata,
      },
    };
  }

  function buildSafeSummary(packet, findings, blocked) {
    if (blocked) {
      return {
        headline: "Email handoff blocked",
        body: "Unsafe identity detail was detected before provider handoff.",
        safe_tags: ["blocked", "email_handoff_gate", "identity_boundary"],
        finding_codes: findings.map((finding) => finding.code),
      };
    }

    return {
      headline: "Email handoff ready",
      body: "Email packet passed safe-content check and is ready for provider handoff.",
      safe_tags: ["ready_for_provider", "email_can_identify_report_not_person"],
      finding_codes: findings.map((finding) => finding.code),
      subject: packet.subject,
    };
  }

  function buildPaperLadderRow(packet, findings, blocked) {
    return {
      row_id: makeId("accountContinuityEmailHandoffPaperRow"),
      handoff_checked_at: now(),
      report_id: packet.report_id,
      report_type: packet.report_type,
      status: blocked ? "blocked" : "ready_for_provider",
      provider_hint: packet.provider_hint,
      has_account_number: Boolean(packet.account_number),
      has_account_tag: Boolean(packet.account_tag),
      has_masked_uidl_hint: Boolean(packet.uidl_hint),
      has_archive_reference: Boolean(packet.archive_reference_id),
      has_delete_reference: Boolean(packet.delete_reference_id),
      has_recovery_review_reference: Boolean(packet.recovery_review_id),
      finding_count: findings.length,
      blocked_finding_count: findings.filter((finding) => finding.severity === "blocked").length,
      boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON_GATE_CHECKED_BEFORE_HANDOFF",
    };
  }

  function maskEmail(email) {
    const clean = normalizeText(email);

    if (!clean || !clean.includes("@")) {
      return "";
    }

    const [local, domain] = clean.split("@");

    if (!local || !domain) {
      return "";
    }

    const localHint = local.length <= 2
      ? `${local.slice(0, 1)}***`
      : `${local.slice(0, 2)}***`;

    return `${localHint}@${domain}`;
  }

  function markProviderSent(handoffId, providerResult = {}) {
    const handoff = handoffs.find((item) => item.handoff_id === handoffId);

    if (!handoff) {
      throw new Error("HANDOFF_NOT_FOUND");
    }

    if (handoff.status !== "ready_for_provider") {
      throw new Error("HANDOFF_NOT_READY_FOR_PROVIDER");
    }

    const cleanResult =
      providerResult && typeof providerResult === "object" && !Array.isArray(providerResult)
        ? providerResult
        : {};

    handoff.status = "provider_sent_recorded";
    handoff.provider_result = {
      recorded_at: now(),
      provider_hint: normalizeText(cleanResult.provider_hint) || handoff.provider_hint,
      message_id_hint: normalizeText(cleanResult.message_id_hint),
      status: normalizeText(cleanResult.status) || "sent",
    };

    return clone(handoff);
  }

  function listHandoffs(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const reportId = normalizeText(cleanFilter.report_id);
    const reportType = normalizeText(cleanFilter.report_type);
    const status = normalizeText(cleanFilter.status);
    const providerHint = normalizeText(cleanFilter.provider_hint);

    return handoffs
      .filter((handoff) => {
        if (reportId && handoff.report_id !== reportId) {
          return false;
        }

        if (reportType && handoff.report_type !== reportType) {
          return false;
        }

        if (status && handoff.status !== status) {
          return false;
        }

        if (providerHint && handoff.provider_hint !== providerHint) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  function latestHandoff() {
    if (!handoffs.length) {
      return null;
    }

    return clone(handoffs[handoffs.length - 1]);
  }

  function listPaperLadderRows(filter = {}) {
    return listHandoffs(filter).map((handoff) => clone(handoff.paper_ladder_row));
  }

  function clearHandoffs() {
    handoffs.length = 0;
    return true;
  }

  return {
    prepareEmailHandoff,
    markProviderSent,
    listHandoffs,
    latestHandoff,
    listPaperLadderRows,
    clearHandoffs,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityEmailHandoffGate;
}

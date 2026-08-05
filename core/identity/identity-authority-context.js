// core/identity/identity-authority-context.js
//
// Lane: core/identity/
// Owns: authority context, ownership boundary, parent-ready value attachment.
// Does Not Own: UI, NET, login, payment processing, upload, analytics, URLs, routes, tokens, tracking, storage.
// Receives: local authority summary, parent-ready flag, payment-ready flag, Moment memory seed.
// Sends To: Secretary for lane order, Moment for value attachment, Octopus for approved movement, CLEAR for trail wipe.
// Security: no child tracking, no hidden sync, no analytics, no upload, no token exposure, no URL leakage.

(function () {
  "use strict";

  const IdentityAuthorityContext = (() => {
    function cleanText(value) {
      return String(value || "")
        .replace(/data:image\/[a-z]+;base64,[a-z0-9+/=]+/gi, "[media-redacted]")
        .replace(/data:audio\/[a-z]+;base64,[a-z0-9+/=]+/gi, "[media-redacted]")
        .replace(/https?:\/\/\S+/gi, "[url-redacted]")
        .replace(/[?&][a-z0-9_-]+=[^&\s]+/gi, "[query-redacted]")
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[contact-redacted]")
        .replace(/\b(token|secret|key|password|passcode|pin|session|cookie)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
        .replace(/[a-z0-9_-]{24,}/gi, "[long-id-redacted]")
        .replace(/\s+/g, " ")
        .trim();
    }

    function makeId(prefix) {
      return [
        prefix,
        Date.now(),
        Math.random().toString(36).slice(2, 10)
      ].join(".");
    }

    function bool(value) {
      return value === true;
    }

    function createContext(input = {}) {
      const parentAuthorityReady = bool(input.parent_authority_ready);
      const paymentReady = bool(input.payment_ready);
      const memoryReady = bool(input.memory_ready) || cleanText(input.status) === "ready_for_personal_value";

      const authorityLabel = cleanText(input.authority_label || "parent authority");
      const valueStatement = cleanText(input.value_statement || input.value || "value waiting for authority");

      const ready = parentAuthorityReady && paymentReady && memoryReady;

      return {
        organ: "IDENTITY",
        lane: "core/identity",
        kind: "authority_context",
        authority_id: makeId("identity.authority"),
        authority_label: authorityLabel,
        parent_authority_ready: parentAuthorityReady,
        payment_ready: paymentReady,
        memory_ready: memoryReady,
        ready_for_value_attachment: ready,
        value_statement: valueStatement,
        ownership_boundary: ready
          ? "value may attach to parent authority"
          : "value remains unattached until authority is ready",
        child_tracking: false,
        account_binding_performed_here: false,
        payment_processed_here: false,
        temporary_trail: true,
        clearable: true,
        sends_to: ready
          ? ["core/secretary", "core/moment", "core/octopus"]
          : ["core/secretary", "core/clear"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          token_exposure: false,
          url_leakage: false
        },
        created_at: new Date().toISOString()
      };
    }

    function attachValue(input = {}) {
      const context = input.ready_for_value_attachment ? input : createContext(input);

      if (!context.ready_for_value_attachment) {
        return {
          organ: "IDENTITY",
          lane: "core/identity",
          kind: "value_attachment_refused",
          authority_id: cleanText(context.authority_id),
          value_statement: cleanText(context.value_statement),
          attached: false,
          reason: "parent authority, payment, or memory is not ready",
          sends_to: ["core/secretary", "core/clear"],
          security: context.security,
          created_at: new Date().toISOString()
        };
      }

      return {
        organ: "IDENTITY",
        lane: "core/identity",
        kind: "value_attachment",
        authority_id: cleanText(context.authority_id),
        authority_label: cleanText(context.authority_label),
        value_statement: cleanText(context.value_statement),
        attached: true,
        attached_to: "parent_authority_context",
        note: "Identity attaches value context only. It does not process login, payment, tokens, storage, or NET transport.",
        temporary_trail: true,
        clearable: true,
        value_survives_clear: true,
        sends_to: ["core/moment", "core/secretary", "core/octopus"],
        security: {
          child_tracking: false,
          hidden_sync: false,
          analytics: false,
          upload: false,
          token_exposure: false,
          url_leakage: false
        },
        created_at: new Date().toISOString()
      };
    }

    function explain(result) {
      const safeResult = result || createContext();

      if (safeResult.kind === "value_attachment") {
        return [
          "Identity attached value to parent authority context.",
          "Value: " + cleanText(safeResult.value_statement),
          "No child tracking, token handling, payment processing, or NET transport happened here."
        ].join(" ");
      }

      if (safeResult.kind === "value_attachment_refused") {
        return [
          "Identity refused value attachment.",
          "Reason: " + cleanText(safeResult.reason),
          "Next: Secretary or CLEAR handles the temporary trail."
        ].join(" ");
      }

      return [
        "Identity checked authority context.",
        "Ready: " + String(Boolean(safeResult.ready_for_value_attachment)),
        "Boundary: " + cleanText(safeResult.ownership_boundary)
      ].join(" ");
    }

    return {
      createContext,
      attachValue,
      explain
    };
  })();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = IdentityAuthorityContext;
  }

  if (typeof window !== "undefined") {
    window.IdentityAuthorityContext = IdentityAuthorityContext;
  }
})();

// src/core/account-continuity-repair-discovery-controller.js
// CyberCrowd Core — Account Continuity Repair Discovery Controller
// Owns: coordinating repair-discovery routing, ledger recording, NET-safe status handoff,
// optional human response recording, and thank-you acknowledgement.
// Rule: Router finds repair value. Ledger records state. NET receives safe status.
// Human response is recorded. Ask once with respect. No pressure. No punishment.
// No silent reopen. Always say thank you.
// Does not: send email, reopen accounts, give free service automatically,
// force return, punish leaving, expose identity evidence, include private proof,
// include address/phone/first name/raw uIDL, run payments, or deal directly with customer.

const AccountContinuityRepairDiscoveryController = (() => {
  const cycles = [];

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

  function requireFunction(value, errorCode) {
    if (typeof value !== "function") {
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

  function normalizeControllerInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      discovery_input: requireObject(cleanInput.discovery_input, "DISCOVERY_INPUT_REQUIRED"),
      forward_to_net: cleanInput.forward_to_net !== false,
      record_response: normalizeBoolean(cleanInput.record_response),
      response: normalizeResponseInput(cleanInput.response),
      notes: normalizeText(cleanInput.notes),
    };
  }

  function normalizeResponseInput(response = {}) {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return {
        response_state: "",
        requested_no_contact: false,
        safe_note: "",
      };
    }

    return {
      response_state: normalizeText(response.response_state),
      requested_no_contact: normalizeBoolean(response.requested_no_contact),
      safe_note: sanitizeSafeText(response.safe_note),
    };
  }

  function normalizeDependencies(dependencies = {}) {
    const cleanDependencies = requireObject(dependencies, "DEPENDENCIES_REQUIRED");

    return {
      discovery_router: requireObject(
        cleanDependencies.discovery_router,
        "DISCOVERY_ROUTER_REQUIRED"
      ),
      status_ledger: requireObject(
        cleanDependencies.status_ledger,
        "STATUS_LEDGER_REQUIRED"
      ),
      net_receiver: cleanDependencies.net_receiver || null,
    };
  }

  function assertDiscoveryRouter(router) {
    requireFunction(router.routeRepairDiscovery, "DISCOVERY_ROUTER_ROUTE_REQUIRED");
    requireFunction(router.markOutreachResponse, "DISCOVERY_ROUTER_RESPONSE_REQUIRED");
  }

  function assertStatusLedger(ledger) {
    requireFunction(ledger.recordRepairDiscoveryStatus, "STATUS_LEDGER_RECORD_REQUIRED");
    requireFunction(ledger.latestNetSummary, "STATUS_LEDGER_NET_SUMMARY_REQUIRED");
  }

  function assertNetReceiver(receiver) {
    if (!receiver) {
      return;
    }

    requireFunction(receiver.receiveStatus, "NET_RECEIVER_RECEIVE_REQUIRED");
  }

  function runRepairDiscoveryCycle(input = {}, dependencies = {}) {
    const normalizedInput = normalizeControllerInput(input);
    const normalizedDependencies = normalizeDependencies(dependencies);

    assertDiscoveryRouter(normalizedDependencies.discovery_router);
    assertStatusLedger(normalizedDependencies.status_ledger);
    assertNetReceiver(normalizedDependencies.net_receiver);

    const cycle = {
      cycle_id: makeId("accountContinuityRepairDiscoveryCycle"),
      started_at: now(),
      status: "started",
      steps: [],
      notes: normalizedInput.notes,
    };

    try {
      const discovery = runStep(cycle, "ROUTE_REPAIR_DISCOVERY", () => {
        return normalizedDependencies.discovery_router.routeRepairDiscovery(
          normalizedInput.discovery_input
        );
      });

      const firstLedgerEntry = runStep(cycle, "RECORD_DISCOVERY_STATUS", () => {
        return normalizedDependencies.status_ledger.recordRepairDiscoveryStatus(discovery);
      });

      const firstNetSummary = runStep(cycle, "PREPARE_NET_SUMMARY", () => {
        return normalizedDependencies.status_ledger.latestNetSummary();
      });

      if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && firstNetSummary) {
        runStep(cycle, "FORWARD_NET_SUMMARY", () => {
          return normalizedDependencies.net_receiver.receiveStatus(firstNetSummary);
        });
      }

      let responseDiscovery = null;
      let responseLedgerEntry = null;
      let responseNetSummary = null;
      let thankYou = null;

      if (normalizedInput.record_response) {
        responseDiscovery = runStep(cycle, "RECORD_HUMAN_RESPONSE", () => {
          return normalizedDependencies.discovery_router.markOutreachResponse(
            discovery.discovery_id,
            normalizedInput.response
          );
        });

        thankYou = runStep(cycle, "PREPARE_THANK_YOU", () => {
          return buildThankYouAcknowledgement(responseDiscovery, normalizedInput.response);
        });

        responseLedgerEntry = runStep(cycle, "RECORD_RESPONSE_STATUS", () => {
          return normalizedDependencies.status_ledger.recordRepairDiscoveryStatus(
            attachThankYou(responseDiscovery, thankYou)
          );
        });

        responseNetSummary = runStep(cycle, "PREPARE_RESPONSE_NET_SUMMARY", () => {
          return normalizedDependencies.status_ledger.latestNetSummary();
        });

        if (normalizedInput.forward_to_net && normalizedDependencies.net_receiver && responseNetSummary) {
          runStep(cycle, "FORWARD_RESPONSE_NET_SUMMARY", () => {
            return normalizedDependencies.net_receiver.receiveStatus(responseNetSummary);
          });
        }
      }

      cycle.status = "completed";
      cycle.completed_at = now();
      cycle.discovery = clone(discovery);
      cycle.first_ledger_entry = clone(firstLedgerEntry);
      cycle.first_net_summary = clone(firstNetSummary);
      cycle.response_discovery = clone(responseDiscovery);
      cycle.thank_you = clone(thankYou);
      cycle.response_ledger_entry = clone(responseLedgerEntry);
      cycle.response_net_summary = clone(responseNetSummary);

      cycles.push(clone(cycle));

      return clone(cycle);
    } catch (error) {
      cycle.status = "failed";
      cycle.failed_at = now();
      cycle.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };

      cycles.push(clone(cycle));

      return clone(cycle);
    }
  }

  function runStep(cycle, stepName, callback) {
    const step = {
      step_id: makeId("accountContinuityRepairDiscoveryStep"),
      step: stepName,
      started_at: now(),
      status: "started",
    };

    cycle.steps.push(step);

    try {
      const result = callback();

      step.status = "completed";
      step.completed_at = now();
      step.result_summary = summarizeStepResult(result);

      return result;
    } catch (error) {
      step.status = "failed";
      step.failed_at = now();
      step.error = {
        name: error && error.name ? error.name : "Error",
        message: error && error.message ? error.message : "UNKNOWN_ERROR",
      };

      throw error;
    }
  }

  function summarizeStepResult(result) {
    if (!result || typeof result !== "object") {
      return {
        type: typeof result,
      };
    }

    return {
      discovery_id: normalizeText(result.discovery_id),
      entry_id: normalizeText(result.entry_id),
      status: normalizeText(result.status),
      ledger_state: normalizeText(result.ledger_state),
      net_state: normalizeText(result.net_state),
      offer_type: normalizeText(result.offer_type),
      headline: result.display_summary && result.display_summary.headline
        ? normalizeText(result.display_summary.headline)
        : result.safe_summary && result.safe_summary.headline
          ? normalizeText(result.safe_summary.headline)
          : normalizeText(result.headline),
      thank_you_id: normalizeText(result.thank_you_id),
    };
  }

  function buildThankYouAcknowledgement(discovery, response) {
    const responseState = normalizeText(response.response_state);
    const requestedNoContact = normalizeBoolean(response.requested_no_contact);

    return {
      thank_you_id: makeId("accountContinuityRepairDiscoveryThankYou"),
      created_at: now(),
      discovery_id: discovery.discovery_id,
      response_state: responseState || "unknown",
      requested_no_contact: requestedNoContact,
      status: "ready",
      message: buildThankYouMessage(responseState, requestedNoContact),
      optional: true,
      pressure_allowed: false,
      punishment_allowed: false,
      silent_reopen_allowed: false,
      identity_boundary: "EMAIL_CAN_IDENTIFY_REPORT_NOT_PERSON",
    };
  }

  function buildThankYouMessage(responseState, requestedNoContact) {
    if (requestedNoContact) {
      return "Thank you. Your boundary is recorded, and no further repair-discovery outreach should be sent for this lane.";
    }

    if (responseState === "accepted") {
      return "Thank you. Your response is recorded, and the next lane may continue only by normal approval and service rules.";
    }

    if (responseState === "declined") {
      return "Thank you. Your response is recorded, and no return is forced.";
    }

    return "Thank you. Your response is recorded.";
  }

  function attachThankYou(discovery, thankYou) {
    const cleanDiscovery = clone(discovery);

    cleanDiscovery.thank_you = clone(thankYou);
    cleanDiscovery.safe_summary = mergeThankYouIntoSafeSummary(
      cleanDiscovery.safe_summary,
      thankYou
    );

    return cleanDiscovery;
  }

  function mergeThankYouIntoSafeSummary(summary = {}, thankYou) {
    const cleanSummary =
      summary && typeof summary === "object" && !Array.isArray(summary)
        ? clone(summary)
        : {};

    cleanSummary.thank_you = {
      thank_you_id: thankYou.thank_you_id,
      message: thankYou.message,
      pressure_allowed: false,
      punishment_allowed: false,
      silent_reopen_allowed: false,
    };

    return cleanSummary;
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
      .replace(/\braw uIDL\b/gi, "protected uIDL");
  }

  function listCycles(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const status = normalizeText(cleanFilter.status);
    const discoveryId = normalizeText(cleanFilter.discovery_id);
    const offerType = normalizeText(cleanFilter.offer_type);

    return cycles
      .filter((cycle) => {
        if (status && cycle.status !== status) {
          return false;
        }

        if (discoveryId) {
          const cycleDiscoveryId =
            cycle.discovery && cycle.discovery.discovery_id
              ? cycle.discovery.discovery_id
              : "";

          if (cycleDiscoveryId !== discoveryId) {
            return false;
          }
        }

        if (offerType) {
          const cycleOfferType =
            cycle.discovery && cycle.discovery.offer_type
              ? cycle.discovery.offer_type
              : "";

          if (cycleOfferType !== offerType) {
            return false;
          }
        }

        return true;
      })
      .map(clone);
  }

  function latestCycle() {
    if (!cycles.length) {
      return null;
    }

    return clone(cycles[cycles.length - 1]);
  }

  function clearCycles() {
    cycles.length = 0;
    return true;
  }

  return {
    runRepairDiscoveryCycle,
    listCycles,
    latestCycle,
    clearCycles,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AccountContinuityRepairDiscoveryController;
        }

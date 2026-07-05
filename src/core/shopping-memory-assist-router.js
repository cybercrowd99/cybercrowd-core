// src/core/shopping-memory-assist-router.js
// CyberCrowd Core — Shopping Memory Assist Router
// Owns: routing user-owned shopping history into reminders, needs, discounts, and route-aware assist.
// Rule: Shopping history is not ad bait. Shopping history is user memory.
// Does not: advertise at the human, sell attention, buy without approval, schedule without approval,
// expose private carts, scrape without permission, decide identity, run POS, run payments,
// publish shopping habits, or turn reminders into commercials.

const ShoppingMemoryAssistRouter = (() => {
  const assists = [];

  const DEFAULT_LIMIT = 8;

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

  function normalizeNumber(value, fallback = null) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
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

  function normalizeSource(source = {}) {
    const cleanSource = requireObject(source, "SOURCE_REQUIRED");

    return {
      source_id: normalizeText(cleanSource.source_id) || makeId("shoppingSource"),
      provider: normalizeText(cleanSource.provider),
      source_type: normalizeText(cleanSource.source_type) || "unknown",
      permission_status: normalizeText(cleanSource.permission_status) || "not_allowed",
      pulled_at: normalizeText(cleanSource.pulled_at),
      notes: normalizeText(cleanSource.notes),
    };
  }

  function normalizeShoppingItem(item = {}) {
    const cleanItem = requireObject(item, "SHOPPING_ITEM_REQUIRED");

    return {
      memory_item_id: normalizeText(cleanItem.memory_item_id) || makeId("shoppingMemoryItem"),
      title: requireText(cleanItem.title, "ITEM_TITLE_REQUIRED"),
      source_id: normalizeText(cleanItem.source_id),
      source_provider: normalizeText(cleanItem.source_provider),
      source_type: normalizeText(cleanItem.source_type),
      category: normalizeText(cleanItem.category),
      life_lane: normalizeText(cleanItem.life_lane) || "unsorted",
      intent_type: normalizeText(cleanItem.intent_type) || "wanted",
      status: normalizeText(cleanItem.status) || "remembered",
      quantity: normalizeNumber(cleanItem.quantity, 1),
      price_seen: normalizeNumber(cleanItem.price_seen, null),
      currency: normalizeText(cleanItem.currency) || "USD",
      tags: normalizeList(cleanItem.tags),
      needed_by: normalizeText(cleanItem.needed_by),
      reminder_id: normalizeText(cleanItem.reminder_id),
      last_seen_at: normalizeText(cleanItem.last_seen_at),
      user_note: normalizeText(cleanItem.user_note),
      private: cleanItem.private !== false,
    };
  }

  function normalizeDiscount(discount = {}) {
    const cleanDiscount = requireObject(discount, "DISCOUNT_REQUIRED");

    return {
      discount_id: normalizeText(cleanDiscount.discount_id) || makeId("discount"),
      title: normalizeText(cleanDiscount.title),
      item_title: normalizeText(cleanDiscount.item_title),
      category: normalizeText(cleanDiscount.category),
      tags: normalizeList(cleanDiscount.tags),
      location_id: normalizeText(cleanDiscount.location_id),
      location_name: normalizeText(cleanDiscount.location_name),
      distance_miles: normalizeNumber(cleanDiscount.distance_miles, null),
      sale_price: normalizeNumber(cleanDiscount.sale_price, null),
      original_price: normalizeNumber(cleanDiscount.original_price, null),
      currency: normalizeText(cleanDiscount.currency) || "USD",
      starts_at: normalizeText(cleanDiscount.starts_at),
      ends_at: normalizeText(cleanDiscount.ends_at),
      source: normalizeText(cleanDiscount.source),
    };
  }

  function normalizeAppointment(appointment = {}) {
    const cleanAppointment = requireObject(appointment, "APPOINTMENT_REQUIRED");

    return {
      appointment_id: normalizeText(cleanAppointment.appointment_id) || makeId("appointment"),
      title: normalizeText(cleanAppointment.title),
      starts_at: normalizeText(cleanAppointment.starts_at),
      ends_at: normalizeText(cleanAppointment.ends_at),
      route_hint: normalizeText(cleanAppointment.route_hint),
      location_hint: normalizeText(cleanAppointment.location_hint),
      nearby_location_ids: normalizeList(cleanAppointment.nearby_location_ids),
      max_detour_miles: normalizeNumber(cleanAppointment.max_detour_miles, 3),
    };
  }

  function normalizeReminder(reminder = {}) {
    const cleanReminder = requireObject(reminder, "REMINDER_REQUIRED");

    return {
      reminder_id: normalizeText(cleanReminder.reminder_id) || makeId("shoppingReminder"),
      title: normalizeText(cleanReminder.title),
      item_title: normalizeText(cleanReminder.item_title),
      category: normalizeText(cleanReminder.category),
      life_lane: normalizeText(cleanReminder.life_lane),
      due_at: normalizeText(cleanReminder.due_at),
      route_sensitive: normalizeBoolean(cleanReminder.route_sensitive),
      status: normalizeText(cleanReminder.status) || "open",
    };
  }

  function normalizeAssistInput(input = {}) {
    const cleanInput = requireObject(input, "INPUT_REQUIRED");

    return {
      uidl: requireText(cleanInput.uidl, "UIDL_REQUIRED"),
      assist_enabled: normalizeBoolean(cleanInput.assist_enabled),
      sources: Array.isArray(cleanInput.sources) ? cleanInput.sources.map(normalizeSource) : [],
      shopping_history: Array.isArray(cleanInput.shopping_history)
        ? cleanInput.shopping_history.map(normalizeShoppingItem)
        : [],
      reminders: Array.isArray(cleanInput.reminders)
        ? cleanInput.reminders.map(normalizeReminder)
        : [],
      discounts: Array.isArray(cleanInput.discounts)
        ? cleanInput.discounts.map(normalizeDiscount)
        : [],
      appointments: Array.isArray(cleanInput.appointments)
        ? cleanInput.appointments.map(normalizeAppointment)
        : [],
      current_context: normalizeCurrentContext(cleanInput.current_context),
      limit: normalizeNumber(cleanInput.limit, DEFAULT_LIMIT),
    };
  }

  function normalizeCurrentContext(context = {}) {
    if (!context || typeof context !== "object" || Array.isArray(context)) {
      return {
        mode: "unknown",
        location_hint: "",
        nearby_location_ids: [],
        active_life_lane: "",
      };
    }

    return {
      mode: normalizeText(context.mode) || "unknown",
      location_hint: normalizeText(context.location_hint),
      nearby_location_ids: normalizeList(context.nearby_location_ids),
      active_life_lane: normalizeText(context.active_life_lane),
      appointment_id: normalizeText(context.appointment_id),
    };
  }

  function sourceIsAllowed(source) {
    return source.permission_status === "allowed";
  }

  function collectAllowedSourceIds(sources) {
    return sources.filter(sourceIsAllowed).map((source) => source.source_id);
  }

  function itemIsFromAllowedSource(item, allowedSourceIds) {
    if (!item.source_id) {
      return true;
    }

    return allowedSourceIds.includes(item.source_id);
  }

  function textMatches(a, b) {
    const cleanA = normalizeText(a).toLowerCase();
    const cleanB = normalizeText(b).toLowerCase();

    if (!cleanA || !cleanB) {
      return false;
    }

    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
  }

  function tagsOverlap(a, b) {
    const cleanA = normalizeList(a).map((item) => item.toLowerCase());
    const cleanB = normalizeList(b).map((item) => item.toLowerCase());

    return cleanA.some((tag) => cleanB.includes(tag));
  }

  function itemMatchesDiscount(item, discount) {
    if (textMatches(item.title, discount.item_title)) {
      return true;
    }

    if (item.category && discount.category && textMatches(item.category, discount.category)) {
      return true;
    }

    if (tagsOverlap(item.tags, discount.tags)) {
      return true;
    }

    return false;
  }

  function discountNearContext(discount, context, appointments) {
    if (context.nearby_location_ids.includes(discount.location_id)) {
      return true;
    }

    return appointments.some((appointment) => {
      if (appointment.nearby_location_ids.includes(discount.location_id)) {
        return true;
      }

      if (discount.distance_miles !== null && discount.distance_miles <= appointment.max_detour_miles) {
        return true;
      }

      return false;
    });
  }

  function reminderMatchesItem(reminder, item) {
    if (reminder.item_title && textMatches(reminder.item_title, item.title)) {
      return true;
    }

    if (reminder.category && item.category && textMatches(reminder.category, item.category)) {
      return true;
    }

    if (reminder.life_lane && item.life_lane && reminder.life_lane === item.life_lane) {
      return true;
    }

    return false;
  }

  function scoreAssist(item, discount, reminder, context, appointments) {
    const score = {
      total: 0,
      reasons: [],
      warnings: [],
    };

    score.total += 5;
    score.reasons.push("remembered_by_user");

    if (item.life_lane && item.life_lane !== "unsorted") {
      score.total += 5;
      score.reasons.push("sorted_by_life_lane");
    }

    if (reminder) {
      score.total += 20;
      score.reasons.push("matches_user_reminder");
    }

    if (discount) {
      score.total += 20;
      score.reasons.push("discount_available");

      if (discountNearContext(discount, context, appointments)) {
        score.total += 20;
        score.reasons.push("near_current_route_or_appointment");
      }

      if (discount.sale_price !== null && item.price_seen !== null && discount.sale_price < item.price_seen) {
        score.total += 10;
        score.reasons.push("lower_than_seen_price");
      }
    }

    if (context.active_life_lane && item.life_lane === context.active_life_lane) {
      score.total += 10;
      score.reasons.push("matches_active_life_lane");
    }

    if (item.status === "purchased" || item.status === "cleared") {
      score.warnings.push("ITEM_ALREADY_CLOSED");
      score.total -= 20;
    }

    return score;
  }

  function buildAssistCandidate(item, discount, reminder, context, appointments) {
    const score = scoreAssist(item, discount, reminder, context, appointments);

    return {
      candidate_id: makeId("shoppingAssistCandidate"),
      created_at: now(),
      memory_item_id: item.memory_item_id,
      title: item.title,
      life_lane: item.life_lane,
      category: item.category,
      intent_type: item.intent_type,
      item_status: item.status,
      score,
      reminder: reminder ? {
        reminder_id: reminder.reminder_id,
        title: reminder.title,
        due_at: reminder.due_at,
        route_sensitive: reminder.route_sensitive,
      } : null,
      discount: discount ? {
        discount_id: discount.discount_id,
        location_id: discount.location_id,
        location_name: discount.location_name,
        distance_miles: discount.distance_miles,
        sale_price: discount.sale_price,
        original_price: discount.original_price,
        currency: discount.currency,
        ends_at: discount.ends_at,
      } : null,
      suggested_actions: buildSuggestedActions(item, discount, reminder),
      status: score.total > 0 ? "candidate" : "ignored",
    };
  }

  function buildSuggestedActions(item, discount, reminder) {
    const actions = [];

    actions.push({
      action_type: "NOPE_CLEAR",
      label: "Nope, clear",
      memory_item_id: item.memory_item_id,
      requires_user_approval: true,
    });

    if (discount) {
      actions.push({
        action_type: "YES_SCHEDULE",
        label: "Yes, schedule",
        memory_item_id: item.memory_item_id,
        discount_id: discount.discount_id,
        location_id: discount.location_id,
        requires_user_approval: true,
      });
    }

    if (reminder) {
      actions.push({
        action_type: "KEEP_REMINDER",
        label: "Keep reminder",
        memory_item_id: item.memory_item_id,
        reminder_id: reminder.reminder_id,
        requires_user_approval: true,
      });
    }

    actions.push({
      action_type: "REMIND_LATER",
      label: "Remind later",
      memory_item_id: item.memory_item_id,
      requires_user_approval: true,
    });

    return actions;
  }

  function routeShoppingMemoryAssist(input = {}) {
    const normalized = normalizeAssistInput(input);

    if (!normalized.assist_enabled) {
      return recordAssist({
        assist_id: makeId("shoppingAssist"),
        created_at: now(),
        uidl: normalized.uidl,
        status: "blocked",
        reason: "ASSIST_NOT_ENABLED",
        message: "Shopping Memory Assist is off.",
        candidates: [],
      });
    }

    const allowedSourceIds = collectAllowedSourceIds(normalized.sources);
    const usableItems = normalized.shopping_history.filter((item) => {
      return itemIsFromAllowedSource(item, allowedSourceIds);
    });

    const candidates = [];

    usableItems.forEach((item) => {
      const matchingReminder = normalized.reminders.find((reminder) => {
        return reminder.status === "open" && reminderMatchesItem(reminder, item);
      });

      const matchingDiscounts = normalized.discounts.filter((discount) => {
        return itemMatchesDiscount(item, discount);
      });

      if (matchingDiscounts.length) {
        matchingDiscounts.forEach((discount) => {
          candidates.push(
            buildAssistCandidate(
              item,
              discount,
              matchingReminder,
              normalized.current_context,
              normalized.appointments
            )
          );
        });
        return;
      }

      if (matchingReminder) {
        candidates.push(
          buildAssistCandidate(
            item,
            null,
            matchingReminder,
            normalized.current_context,
            normalized.appointments
          )
        );
      }
    });

    const readyCandidates = candidates
      .filter((candidate) => candidate.status === "candidate")
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, normalized.limit);

    return recordAssist({
      assist_id: makeId("shoppingAssist"),
      created_at: now(),
      uidl: normalized.uidl,
      status: readyCandidates.length ? "ready_for_choice" : "no_match",
      message: readyCandidates.length
        ? "Shopping Memory Assist found user-owned reminders worth showing."
        : "No shopping memory reminder matched the current context.",
      source_count: normalized.sources.length,
      allowed_source_count: allowedSourceIds.length,
      shopping_item_count: usableItems.length,
      reminder_count: normalized.reminders.length,
      discount_count: normalized.discounts.length,
      appointment_count: normalized.appointments.length,
      current_context: clone(normalized.current_context),
      candidates: readyCandidates,
    });
  }

  function approveAssistAction(assistId, candidateId, actionType) {
    const assist = assists.find((item) => item.assist_id === assistId);

    if (!assist) {
      throw new Error("ASSIST_NOT_FOUND");
    }

    const candidate = Array.isArray(assist.candidates)
      ? assist.candidates.find((item) => item.candidate_id === candidateId)
      : null;

    if (!candidate) {
      throw new Error("CANDIDATE_NOT_FOUND");
    }

    const action = Array.isArray(candidate.suggested_actions)
      ? candidate.suggested_actions.find((item) => item.action_type === actionType)
      : null;

    if (!action) {
      throw new Error("ACTION_NOT_FOUND");
    }

    const approval = {
      approval_id: makeId("shoppingAssistApproval"),
      approved_at: now(),
      assist_id: assistId,
      candidate_id: candidateId,
      action_type: actionType,
      uidl: assist.uidl,
      memory_item_id: candidate.memory_item_id,
      title: candidate.title,
      status: "approved_for_handoff",
      action: clone(action),
    };

    assist.approvals = Array.isArray(assist.approvals) ? assist.approvals : [];
    assist.approvals.push(clone(approval));
    assist.updated_at = now();

    return clone(approval);
  }

  function rejectAssist(assistId, reason = "USER_REJECTED") {
    const assist = assists.find((item) => item.assist_id === assistId);

    if (!assist) {
      throw new Error("ASSIST_NOT_FOUND");
    }

    assist.status = "rejected";
    assist.rejected_at = now();
    assist.rejection_reason = normalizeText(reason) || "USER_REJECTED";

    return clone(assist);
  }

  function recordAssist(assist) {
    assists.push(clone(assist));
    return clone(assist);
  }

  function listAssists(filter = {}) {
    const cleanFilter = filter && typeof filter === "object" ? filter : {};
    const uidl = normalizeText(cleanFilter.uidl);
    const status = normalizeText(cleanFilter.status);
    const lifeLane = normalizeText(cleanFilter.life_lane);

    return assists
      .filter((assist) => {
        if (uidl && assist.uidl !== uidl) {
          return false;
        }

        if (status && assist.status !== status) {
          return false;
        }

        if (lifeLane) {
          const hasLifeLane = Array.isArray(assist.candidates)
            && assist.candidates.some((candidate) => candidate.life_lane === lifeLane);

          if (!hasLifeLane) {
            return false;
          }
        }

        return true;
      })
      .map(clone);
  }

  function latestAssist() {
    if (!assists.length) {
      return null;
    }

    return clone(assists[assists.length - 1]);
  }

  function clearAssists() {
    assists.length = 0;
    return true;
  }

  return {
    routeShoppingMemoryAssist,
    approveAssistAction,
    rejectAssist,
    listAssists,
    latestAssist,
    clearAssists,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = ShoppingMemoryAssistRouter;
}

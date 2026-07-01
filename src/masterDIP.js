/**
 * MASTER-DIP
 * Master Dewey Inventory Ping
 *
 * Inventory = gathered-ready.
 * Inventory is not Identity.
 * Agreement is the doorway into Identity.
 */

import { socialSignalIntake } from "./core/social-signal-intake.js";
import { socialSignalNormalizer } from "./core/social-signal-normalizer.js";
import { buildIdlBackgroundSignal } from "./core/idl-background-signal.js";
import { bindSocialIdl } from "./core/social-idl-binder.js";
import { routePingSignal } from "./core/ping-signal-router.js";

import { facebookSignalAdapter } from "./net/facebook-signal-adapter.js";
import { xSignalAdapter } from "./net/x-signal-adapter.js";
import { youtubeSignalAdapter } from "./net/youtube-signal-adapter.js";
import { tiktokSignalAdapter } from "./net/tiktok-signal-adapter.js";
import { handleSocialOAuthCallback } from "./net/social-oauth-callback.js";

export function dipClone(value) {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

const SOURCE_REGISTRY = {
  facebook: { adapter: facebookSignalAdapter, kind: "social" },
  x: { adapter: xSignalAdapter, kind: "social" },
  youtube: { adapter: youtubeSignalAdapter, kind: "social" },
  tiktok: { adapter: tiktokSignalAdapter, kind: "social" },
};

const PIPELINE = {
  intake: socialSignalIntake,
  normalize: socialSignalNormalizer,
  idlBackground: buildIdlBackgroundSignal,
  bindIdl: bindSocialIdl,
  routePing: routePingSignal,
};

function nowISO() {
  return new Date().toISOString();
}

function requireUserAndProvider(user, provider) {
  if (!user || !provider) {
    return { ok: false, reason: "USER_AND_PROVIDER_REQUIRED" };
  }
  return { ok: true };
}

function getSource(provider) {
  const source = SOURCE_REGISTRY[provider];
  if (!source || typeof source.adapter !== "function") {
    return {
      ok: false,
      reason: "SOURCE_ADAPTER_NOT_REGISTERED",
      provider,
    };
  }
  return { ok: true, source };
}

export async function masterDIPInventoryPing({
  user,
  provider,
  options = {},
} = {}) {
  const {
    pingInventoryAllowed = false,
    identityAgreementAccepted = false,
  } = options;

  const required = requireUserAndProvider(user, provider);
  if (!required.ok) {
    return {
      ...required,
      checkedAt: nowISO(),
      authorityNote: "NO_INVENTORY_CREATED",
    };
  }

  const sourceResult = getSource(provider);
  if (!sourceResult.ok) {
    return {
      ...sourceResult,
      checkedAt: nowISO(),
      authorityNote: "NO_INVENTORY_CREATED",
    };
  }

  // 🔒 PERMISSION GATE — BEFORE ANY FETCH
  if (!pingInventoryAllowed) {
    return {
      ok: false,
      provider,
      reason: "PING_INVENTORY_PERMISSION_REQUIRED",
      status: "inventory-blocked",
      checkedAt: nowISO(),
      authorityNote: "CONNECTED_ACCOUNT_NOT_INVENTORY_PERMISSION",
    };
  }

  const source = sourceResult.source;

  // 1) Gather raw signals
  const rawSignals = await source.adapter({ user, options });

  // 2) Intake
  const intakeEnvelope = await PIPELINE.intake({
    user,
    provider,
    rawSignals,
  });

  // 3) Normalize
  const normalized = await PIPELINE.normalize(intakeEnvelope);

  // 4) Build IDL background inventory
  const idlBackground = await PIPELINE.idlBackground({
    user,
    provider,
    normalized,
    status: "gathered-ready",
    pendingIdentity: true,
    identityId: null,
  });

  // 🚪 IDENTITY AGREEMENT GATE
  if (!identityAgreementAccepted) {
    return {
      ok: true,
      provider,
      status: "inventory-gathered-ready",
      gatheredAt: nowISO(),

      rawSignals: dipClone(rawSignals),
      normalized: dipClone(normalized),
      idlBackground: dipClone(idlBackground),

      identity: null,
      pingResult: null,

      pendingIdentity: true,
      identityAgreementRequired: true,

      authorityNote:
        "INVENTORY_READY_NOT_IDENTITY_AGREEMENT_REQUIRED",
    };
  }

  // 5) Bind to IDL Identity
  const boundIdentity = await PIPELINE.bindIdl({
    user,
    provider,
    idlBackground,
    agreementAccepted: true,
  });

  // 6) Route into ping system
  const pingResult = await PIPELINE.routePing({
    user,
    identity: boundIdentity,
    source: provider,
    signals: normalized,
  });

  return {
    ok: true,
    provider,
    status: "inventory-bound-to-identity",
    gatheredAt: nowISO(),

    rawSignals: dipClone(rawSignals),
    normalized: dipClone(normalized),
    idlBackground: dipClone(idlBackground),

    identity: dipClone(boundIdentity),
    pingResult: dipClone(pingResult),

    pendingIdentity: false,
    identityAgreementRequired: false,

    authorityNote:
      "IDENTITY_BACKGROUND_CONTEXT_ONLY_SERVER_AUTHORITY_REQUIRED",
  };
}

export async function masterDIPFromOAuthCallback({
  req,
  res,
  options = {},
} = {}) {
  const { user, provider } = await handleSocialOAuthCallback({
    req,
    res,
  });

  return masterDIPInventoryPing({
    user,
    provider,
    options,
  });
}

export function getMasterDIPRegistry() {
  return {
    ok: true,
    sources: Object.keys(SOURCE_REGISTRY),
    pipeline: Object.keys(PIPELINE),
    readAt: nowISO(),
    authorityNote:
      "MASTER_DIP_REGISTRY_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const MasterDIP = {
  masterDIPInventoryPing,
  masterDIPFromOAuthCallback,
  getMasterDIPRegistry,
};

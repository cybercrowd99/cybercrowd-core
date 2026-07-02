/**
 * src/masterDIP.js
 * MASTER-DIP
 * Master Dewey Inventory Ping
 *
 * Inventory = gathered-ready.
 * Inventory is not Identity.
 * Agreement is the doorway into Identity.
 *
 * NET Adapter
 * → Intake
 * → Normalizer
 * → Inventory Layer
 * → IDL Background Signal
 * → Social IDL Binder
 * → Ping Signal Router
 */

import { socialSignalIntake } from "./core/social-signal-intake.js";
import { socialSignalNormalizer } from "./core/social-signal-normalizer.js";
import { inventoryLayer } from "./core/inventory-layer.js";
import { buildIdlBackgroundSignal } from "./core/idl-background-signal.js";
import { bindSocialIdl } from "./core/social-idl-binder.js";
import { routePingSignal } from "./core/ping-signal-router.js";

import {
  facebookSignalAdapter,
  xSignalAdapter,
  youtubeSignalAdapter,
  tiktokSignalAdapter,
} from "./net/social-signal-adapters.js";

import { handleSocialOAuthCallback } from "./net/social-oauth-callback.js";

export function dipClone(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function nowISO() {
  return new Date().toISOString();
}

const SOURCE_REGISTRY = {
  facebook: {
    adapter: facebookSignalAdapter,
    kind: "social",
  },
  x: {
    adapter: xSignalAdapter,
    kind: "social",
  },
  twitter: {
    adapter: xSignalAdapter,
    kind: "social",
    aliasOf: "x",
  },
  youtube: {
    adapter: youtubeSignalAdapter,
    kind: "social",
  },
  tiktok: {
    adapter: tiktokSignalAdapter,
    kind: "social",
  },
};

const PIPELINE = {
  intake: socialSignalIntake,
  normalize: socialSignalNormalizer,
  inventory: inventoryLayer,
  idlBackground: buildIdlBackgroundSignal,
  bindIdl: bindSocialIdl,
  routePing: routePingSignal,
};

function normalizeProvider(provider) {
  return String(provider || "").toLowerCase().trim();
}

function requireUserAndProvider(user, provider) {
  if (!user || !provider) {
    return {
      ok: false,
      reason: "USER_AND_PROVIDER_REQUIRED",
    };
  }

  return {
    ok: true,
  };
}

function getSource(provider) {
  const key = normalizeProvider(provider);
  const source = SOURCE_REGISTRY[key];

  if (!source || typeof source.adapter !== "function") {
    return {
      ok: false,
      reason: "SOURCE_ADAPTER_NOT_REGISTERED",
      provider: key || provider || null,
    };
  }

  return {
    ok: true,
    provider: key,
    source,
  };
}

function readIdentityId(user = null, options = {}) {
  return (
    options.identityId ||
    user?.identityId ||
    user?.id ||
    user?.userId ||
    null
  );
}

function readRawSignals(adapterResult) {
  if (!adapterResult) return [];

  if (Array.isArray(adapterResult)) {
    return adapterResult;
  }

  if (Array.isArray(adapterResult.rawSignals)) {
    return adapterResult.rawSignals;
  }

  return [adapterResult];
}

export async function masterDIPInventoryPing({
  user,
  provider,
  options = {},
} = {}) {
  const cleanProvider = normalizeProvider(provider);

  const {
    pingInventoryAllowed = false,
    identityAgreementAccepted = false,
    licensingAgreementAccepted = false,
    accessLevel = "free",
  } = options;

  const required = requireUserAndProvider(user, cleanProvider);

  if (!required.ok) {
    return {
      ...required,
      checkedAt: nowISO(),
      authorityNote: "NO_INVENTORY_CREATED",
    };
  }

  const sourceResult = getSource(cleanProvider);

  if (!sourceResult.ok) {
    return {
      ...sourceResult,
      checkedAt: nowISO(),
      authorityNote: "NO_INVENTORY_CREATED",
    };
  }

  // Permission gate before NET adapter fetch.
  // Connected account does not equal inventory permission.
  if (!pingInventoryAllowed) {
    return {
      ok: false,
      provider: cleanProvider,
      reason: "PING_INVENTORY_PERMISSION_REQUIRED",
      status: "inventory-blocked",
      checkedAt: nowISO(),
      pendingIdentity: true,
      identityId: null,
      authorityNote: "CONNECTED_ACCOUNT_NOT_INVENTORY_PERMISSION",
    };
  }

  const source = sourceResult.source;

  // 1) NET adapter gathers provider-side raw signal envelope.
  const adapterResult = await source.adapter({
    user,
    provider: cleanProvider,
    source: cleanProvider,
    options,
  });

  const rawSignals = readRawSignals(adapterResult);

  // 2) CORE intake wraps raw gathered-ready signals.
  const intakeEnvelope = await PIPELINE.intake({
    user,
    provider: cleanProvider,
    source: cleanProvider,
    rawSignals,
    options,
  });

  // 3) CORE normalizer shapes raw signals into Dewey content records.
  const normalized = await PIPELINE.normalize({
    intakeEnvelope,
    accessLevel,
  });

  // 4) CORE inventory layer splits free/licensed/rejected buckets.
  const inventory = await PIPELINE.inventory({
    normalizedEnvelope: normalized,
    accessLevel,
  });

  // 5) CORE IDL background signal prepares gathered-ready inventory context.
  const idlBackground = await PIPELINE.idlBackground(inventory);

  // Identity agreement gate.
  // Inventory can be gathered-ready before Identity binding.
  if (!identityAgreementAccepted) {
    return {
      ok: true,
      provider: cleanProvider,
      status: "inventory-gathered-ready",
      gatheredAt: nowISO(),

      adapterResult: dipClone(adapterResult),
      intakeEnvelope: dipClone(intakeEnvelope),
      normalized: dipClone(normalized),
      inventory: dipClone(inventory),
      idlBackground: dipClone(idlBackground),

      identity: null,
      pingResult: null,

      pendingIdentity: true,
      identityId: null,
      identityAgreementRequired: true,

      authorityNote:
        "INVENTORY_READY_NOT_IDENTITY_IDENTITY_AGREEMENT_REQUIRED",
    };
  }

  const identityId = readIdentityId(user, options);

  // 6) CORE binder marks IDL background signal bound-ready only after agreements.
  const boundIdentity = await PIPELINE.bindIdl({
    idlBackgroundSignal: idlBackground,
    identityId,
    identityAgreementAccepted,
    licensingAgreementAccepted,
  });

  // If binder does not pass, do not route ping.
  if (!boundIdentity.ok) {
    return {
      ok: true,
      provider: cleanProvider,
      status: "inventory-waiting-for-binding",
      gatheredAt: nowISO(),

      adapterResult: dipClone(adapterResult),
      intakeEnvelope: dipClone(intakeEnvelope),
      normalized: dipClone(normalized),
      inventory: dipClone(inventory),
      idlBackground: dipClone(idlBackground),

      identity: dipClone(boundIdentity),
      pingResult: null,

      pendingIdentity: true,
      identityId: null,

      authorityNote:
        "INVENTORY_READY_BINDER_WAITING_NO_PING_ROUTED",
    };
  }

  // 7) CORE ping router routes only bound-ready IDL signals.
  const pingResult = await PIPELINE.routePing(boundIdentity);

  return {
    ok: true,
    provider: cleanProvider,
    status: "inventory-bound-to-identity",
    gatheredAt: nowISO(),

    adapterResult: dipClone(adapterResult),
    intakeEnvelope: dipClone(intakeEnvelope),
    normalized: dipClone(normalized),
    inventory: dipClone(inventory),
    idlBackground: dipClone(idlBackground),

    identity: dipClone(boundIdentity),
    pingResult: dipClone(pingResult),

    pendingIdentity: false,
    identityId,

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
  const callbackResult = await handleSocialOAuthCallback({
    req,
    res,
    provider: options.provider,
    source: options.source,
    token: options.token,
    payload: options.payload,
    user: options.user,
    context: options.context || {},
  });

  if (!callbackResult || !callbackResult.ok) {
    return {
      ok: false,
      reason: "OAUTH_CALLBACK_FAILED",
      callbackResult: dipClone(callbackResult),
      checkedAt: nowISO(),
      authorityNote: "NO_MASTER_DIP_INVENTORY_STARTED",
    };
  }

  return masterDIPInventoryPing({
    user: callbackResult.user || options.user || null,
    provider: callbackResult.provider,
    options,
  });
}

export function getMasterDIPRegistry() {
  return {
    ok: true,
    sources: Object.keys(SOURCE_REGISTRY),
    pipeline: Object.keys(PIPELINE),
    readAt: nowISO(),
    inventoryRule: "Inventory = gathered-ready.",
    identityRule: "Inventory is not Identity.",
    agreementRule: "Agreement is the doorway into Identity.",
    authorityNote:
      "MASTER_DIP_REGISTRY_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const MasterDIP = {
  masterDIPInventoryPing,
  masterDIPFromOAuthCallback,
  getMasterDIPRegistry,
};

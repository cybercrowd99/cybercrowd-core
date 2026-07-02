// src/net/social-signal-adapters.js
// CyberCrowd NET
// Shared Social Signal Adapters
//
// Purpose:
// Provide one NET adapter shelf for supported social providers.
// These adapters return gathered-ready raw signals for the CORE pipeline.
//
// NET → MASTER-DIP → Intake → Normalizer → Inventory → IDL → Binder → Ping
//
// Owns:
// - provider adapter shape
// - provider name/source labels
// - gathered-ready raw signal return envelope
// - safe stub behavior until real OAuth/API wiring exists
//
// Does NOT own:
// - Dewey classification
// - inventory sorting
// - Identity binding
// - ping routing
// - agreement approval
// - server sessions
// - cookies/KV/EAT
// - scraping
// - pretending OAuth exists

function nowISO() {
  return new Date().toISOString();
}

function safeClone(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function normalizeProviderInput(input = {}) {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input;
}

function buildAdapterResult({
  provider,
  source = null,
  user = null,
  rawSignals = [],
  adapterStatus = "stub-ready",
  reason = null,
  context = {},
} = {}) {
  return {
    ok: true,
    provider,
    source: source || provider,

    adapterStatus,
    fetchedAt: nowISO(),

    status: "gathered-ready",
    inventoryState: "net-adapter-output",

    pendingIdentity: true,
    identityId: null,

    user: safeClone(user),

    rawSignals: Array.isArray(rawSignals)
      ? safeClone(rawSignals)
      : [safeClone(rawSignals)],

    counts: {
      rawSignals: Array.isArray(rawSignals) ? rawSignals.length : 1,
    },

    reason,

    context: safeClone(context),

    authorityNote:
      "NET_ADAPTER_OUTPUT_ONLY_NOT_IDENTITY_NOT_OAUTH_AUTHORITY",
  };
}

function buildStubSignal({
  provider,
  source = null,
  type = "backgroundPing",
  payload = {},
} = {}) {
  return {
    type,
    provider,
    source: source || provider,
    payload: {
      provider,
      source: source || provider,
      gatheredAt: nowISO(),
      ...payload,
    },
  };
}

export async function facebookSignalAdapter(input = {}) {
  const cleanInput = normalizeProviderInput(input);

  return buildAdapterResult({
    provider: "facebook",
    source: cleanInput.source || "facebook",
    user: cleanInput.user || null,
    rawSignals:
      cleanInput.rawSignals ||
      [
        buildStubSignal({
          provider: "facebook",
          source: cleanInput.source || "facebook",
          payload: {
            note:
              "Facebook adapter stub only. Real API/OAuth wiring belongs here later.",
          },
        }),
      ],
    adapterStatus: "stub-ready",
    reason: "FACEBOOK_ADAPTER_STUB_NO_REMOTE_FETCH",
    context: cleanInput.context || {},
  });
}

export async function xSignalAdapter(input = {}) {
  const cleanInput = normalizeProviderInput(input);

  return buildAdapterResult({
    provider: "x",
    source: cleanInput.source || "x",
    user: cleanInput.user || null,
    rawSignals:
      cleanInput.rawSignals ||
      [
        buildStubSignal({
          provider: "x",
          source: cleanInput.source || "x",
          payload: {
            note:
              "X adapter stub only. Real API/OAuth wiring belongs here later.",
          },
        }),
      ],
    adapterStatus: "stub-ready",
    reason: "X_ADAPTER_STUB_NO_REMOTE_FETCH",
    context: cleanInput.context || {},
  });
}

export async function youtubeSignalAdapter(input = {}) {
  const cleanInput = normalizeProviderInput(input);

  return buildAdapterResult({
    provider: "youtube",
    source: cleanInput.source || "youtube",
    user: cleanInput.user || null,
    rawSignals:
      cleanInput.rawSignals ||
      [
        buildStubSignal({
          provider: "youtube",
          source: cleanInput.source || "youtube",
          payload: {
            note:
              "YouTube adapter stub only. Real API/OAuth wiring belongs here later.",
          },
        }),
      ],
    adapterStatus: "stub-ready",
    reason: "YOUTUBE_ADAPTER_STUB_NO_REMOTE_FETCH",
    context: cleanInput.context || {},
  });
}

export async function tiktokSignalAdapter(input = {}) {
  const cleanInput = normalizeProviderInput(input);

  return buildAdapterResult({
    provider: "tiktok",
    source: cleanInput.source || "tiktok",
    user: cleanInput.user || null,
    rawSignals:
      cleanInput.rawSignals ||
      [
        buildStubSignal({
          provider: "tiktok",
          source: cleanInput.source || "tiktok",
          payload: {
            note:
              "TikTok adapter stub only. Real API/OAuth wiring belongs here later.",
          },
        }),
      ],
    adapterStatus: "stub-ready",
    reason: "TIKTOK_ADAPTER_STUB_NO_REMOTE_FETCH",
    context: cleanInput.context || {},
  });
}

export function getSocialSignalAdapter(provider) {
  const key = String(provider || "").toLowerCase();

  const adapters = {
    facebook: facebookSignalAdapter,
    x: xSignalAdapter,
    twitter: xSignalAdapter,
    youtube: youtubeSignalAdapter,
    tiktok: tiktokSignalAdapter,
  };

  return adapters[key] || null;
}

export function listSocialSignalAdapters() {
  return [
    {
      provider: "facebook",
      source: "facebook",
      status: "stub-ready",
    },
    {
      provider: "x",
      source: "x",
      status: "stub-ready",
    },
    {
      provider: "youtube",
      source: "youtube",
      status: "stub-ready",
    },
    {
      provider: "tiktok",
      source: "tiktok",
      status: "stub-ready",
    },
  ];
}

export function readSocialSignalAdaptersShape() {
  return {
    ok: true,
    name: "social-signal-adapters",
    stage: "net-adapter",
    providers: ["facebook", "x", "youtube", "tiktok"],
    accepts: [
      "user",
      "source",
      "rawSignals",
      "context",
    ],
    returns: [
      "provider",
      "source",
      "adapterStatus",
      "rawSignals",
      "counts",
      "status",
      "inventoryState",
      "pendingIdentity",
      "identityId",
      "authorityNote",
    ],
    inventoryRule:
      "NET adapters only return gathered-ready raw signals for CORE.",
    identityRule:
      "NET adapters do not create or prove Identity.",
    agreementRule:
      "Agreement is handled later by CORE binder lanes.",
    authorityNote:
      "SOCIAL_SIGNAL_ADAPTERS_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const SocialSignalAdapters = {
  facebookSignalAdapter,
  xSignalAdapter,
  youtubeSignalAdapter,
  tiktokSignalAdapter,
  getSocialSignalAdapter,
  listSocialSignalAdapters,
  readSocialSignalAdaptersShape,
};

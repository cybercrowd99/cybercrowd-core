// src/net/social-oauth-callback.js
// CyberCrowd NET
// Social OAuth Callback Stub
//
// Purpose:
// Provide a safe NET callback envelope for social OAuth providers.
// This file does NOT perform real OAuth. It only shapes a callback
// envelope for MASTER-DIP and CORE intake.
//
// NET → OAuth Callback → MASTER-DIP → Intake → Normalizer → Inventory
//
// Owns:
// - callback envelope shape
// - provider/source labels
// - stub token/payload shaping
// - gathered-ready callback status
//
// Does NOT own:
// - real OAuth
// - token validation
// - remote API calls
// - identity binding
// - agreement approval
// - sessions
// - cookies/KV/EAT
// - server authority

function nowISO() {
  return new Date().toISOString();
}

function makeCallbackId(prefix = "oauthCallback") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

function safeClone(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function normalizeInput(input = {}) {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input;
}

function buildCallbackEnvelope({
  provider,
  source = null,
  user = null,
  stubToken = null,
  stubPayload = {},
  reason = "OAUTH_CALLBACK_STUB_NO_REMOTE_VALIDATION",
  context = {},
} = {}) {
  return {
    ok: true,

    callbackId: makeCallbackId(),
    callbackAt: nowISO(),

    provider,
    source: source || provider,

    status: "gathered-ready",
    inventoryState: "net-oauth-callback",

    pendingIdentity: true,
    identityId: null,

    user: safeClone(user),

    token: safeClone(stubToken),
    payload: {
      provider,
      source: source || provider,
      receivedAt: nowISO(),
      ...(safeClone(stubPayload) || {}),
    },

    reason,
    context: safeClone(context),

    authorityNote:
      "NET_OAUTH_CALLBACK_STUB_ONLY_NOT_IDENTITY_NOT_OAUTH_AUTHORITY",
  };
}

export async function socialOAuthCallback(input = {}) {
  const clean = normalizeInput(input);

  const provider = clean.provider || "unknown";
  const source = clean.source || provider;

  const stubToken =
    clean.token ||
    `stubToken.${provider}.${Math.random().toString(36).slice(2, 10)}`;

  const stubPayload =
    clean.payload ||
    {
      note:
        "OAuth callback stub only. Real OAuth validation belongs here later.",
    };

  return buildCallbackEnvelope({
    provider,
    source,
    user: clean.user || null,
    stubToken,
    stubPayload,
    reason: "OAUTH_CALLBACK_STUB_NO_REMOTE_VALIDATION",
    context: clean.context || {},
  });
}

// MASTER-DIP compatible wrapper.
// MASTER-DIP imports handleSocialOAuthCallback directly.
export async function handleSocialOAuthCallback(input = {}) {
  return socialOAuthCallback(input);
}

export function readSocialOAuthCallbackShape() {
  return {
    ok: true,
    name: "social-oauth-callback",
    stage: "net-oauth-callback",
    accepts: ["provider", "source", "token", "payload", "user", "context"],
    returns: [
      "callbackId",
      "provider",
      "source",
      "token",
      "payload",
      "status",
      "inventoryState",
      "pendingIdentity",
      "identityId",
      "reason",
      "context",
      "authorityNote",
    ],
    inventoryRule:
      "OAuth callback stub returns gathered-ready callback envelopes.",
    identityRule:
      "OAuth callback does not create or prove Identity.",
    agreementRule:
      "Agreement is handled later by CORE binder lanes.",
    authorityNote:
      "SOCIAL_OAUTH_CALLBACK_SHAPE_READ_ONLY_NO_AUTHORITY_GRANTED",
  };
}

export const SocialOAuthCallback = {
  socialOAuthCallback,
  handleSocialOAuthCallback,
  readSocialOAuthCallbackShape,
};

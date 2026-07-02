// src/dewey/entitlement-rules.js
// CyberCrowd Core
// Dewey Entitlement Rules
//
// Purpose:
// Define which gathered-ready content types are free/public
// and which require licensed/agreed access.
//
// Inventory = gathered-ready.
// Inventory is not Identity.
// Agreement is the doorway into Identity.

export const ENTITLEMENT_RULES = [
  {
    accessLevel: "free",
    allows: [
      "publicPosts",
      "publicLikes",
      "publicFollows",
      "publicPlaylists",
      "publicTracks",
      "publicStorefront",
      "publicProducts",
      "publicCreatorPage",
      "publicRepos",
      "publicProfiles",
      "likes",
      "views",
      "clicks",
      "freeInventory",
      "backgroundPing",
      "publicUI",
    ],
  },

  {
    accessLevel: "licensed",
    allows: [
      "privateMessages",
      "privateAnalytics",
      "listeningHistory",
      "privatePlaylists",
      "orders",
      "customers",
      "fulfillment",
      "subscribers",
      "patrons",
      "privateRepos",
      "accountAnalytics",
      "conversion",
      "retention",
      "licensingAgreement",
      "identityAgreement",
      "licensedInventory",
      "identityPing",
      "privateDashboards",
    ],
  },
];

export function getEntitlementRule(accessLevel) {
  return (
    ENTITLEMENT_RULES.find((rule) => rule.accessLevel === accessLevel) ||
    null
  );
}

export function getAllowedContentTypes(accessLevel) {
  const rule = getEntitlementRule(accessLevel);
  return rule ? [...rule.allows] : [];
}

export function isContentTypeAllowed(accessLevel, contentTypeKey) {
  const allowed = getAllowedContentTypes(accessLevel);
  return allowed.includes(contentTypeKey);
}

export function getAccessLevelForContentType(contentTypeKey) {
  const matched = ENTITLEMENT_RULES.find((rule) =>
    rule.allows.includes(contentTypeKey)
  );

  return matched ? matched.accessLevel : null;
}

export const DeweyEntitlementRules = {
  ENTITLEMENT_RULES,
  getEntitlementRule,
  getAllowedContentTypes,
  isContentTypeAllowed,
  getAccessLevelForContentType,
};

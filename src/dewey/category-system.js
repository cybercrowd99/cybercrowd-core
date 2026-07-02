// src/dewey/category-system.js
// CyberCrowd Core
// Dewey Category System
//
// Purpose:
// Define the 000–900 Dewey-style categories that MASTER-DIP uses
// to organize content types into broad groups.
// Categories know their code, name, and which content types are
// free vs licensed within that category.

export const CATEGORY_SYSTEM = {
  surface: {
    code: "000",
    name: "Display Surface",
    description: "UI, dashboards, and surfaces.",
    contentTypes: {
      free: ["publicUI"],
      licensed: ["privateDashboards"],
    },
  },

  social: {
    code: "100",
    name: "Social Signals",
    description: "Social interaction and network-related content.",
    contentTypes: {
      free: ["publicPosts", "publicLikes", "publicFollows"],
      licensed: ["privateMessages", "privateAnalytics"],
    },
  },

  media: {
    code: "200",
    name: "Media Streams",
    description: "Music, video, playlists, and consumption signals.",
    contentTypes: {
      free: ["publicPlaylists", "publicTracks"],
      licensed: ["listeningHistory", "privatePlaylists"],
    },
  },

  commerce: {
    code: "300",
    name: "Commerce & Orders",
    description: "Storefronts, products, orders, and fulfillment.",
    contentTypes: {
      free: ["publicStorefront", "publicProducts"],
      licensed: ["orders", "customers", "fulfillment"],
    },
  },

  creator: {
    code: "400",
    name: "Creator Economy",
    description: "Creator pages, subscribers, and patronage.",
    contentTypes: {
      free: ["publicCreatorPage"],
      licensed: ["subscribers", "patrons"],
    },
  },

  identity: {
    code: "500",
    name: "Identity & Accounts",
    description: "Accounts, roles, repos, and identity-linked metadata.",
    contentTypes: {
      free: ["publicRepos", "publicProfiles"],
      licensed: ["privateRepos", "accountAnalytics"],
    },
  },

  engagement: {
    code: "600",
    name: "Engagement Metrics",
    description: "Cross-platform engagement signals.",
    contentTypes: {
      free: ["likes", "views", "clicks"],
      licensed: ["conversion", "retention"],
    },
  },

  authority: {
    code: "700",
    name: "Authority & Agreements",
    description: "Licensing, identity agreements, and permission gates.",
    contentTypes: {
      free: [],
      licensed: ["licensingAgreement", "identityAgreement"],
    },
  },

  inventory: {
    code: "800",
    name: "Inventory Layers",
    description: "Free and licensed inventory layers.",
    contentTypes: {
      free: ["freeInventory"],
      licensed: ["licensedInventory"],
    },
  },

  ping: {
    code: "900",
    name: "Ping Routing",
    description: "Ping routing, moment shaping, and identity-bound signals.",
    contentTypes: {
      free: ["backgroundPing"],
      licensed: ["identityPing"],
    },
  },
};

export function getCategory(key) {
  return CATEGORY_SYSTEM[key] || null;
}

export function listCategories() {
  return Object.keys(CATEGORY_SYSTEM);
}

export function listContentTypesForCategory(key, accessLevel) {
  const category = CATEGORY_SYSTEM[key];
  if (!category) return [];
  const types = category.contentTypes[accessLevel];
  return Array.isArray(types) ? types : [];
}

export const DeweyCategories = {
  CATEGORY_SYSTEM,
  getCategory,
  listCategories,
  listContentTypesForCategory,
};

// src/dewey/content-types.js
// CyberCrowd Core
// Dewey Content Types
//
// Purpose:
// Define the gathered-ready content types that MASTER-DIP can catalog,
// inventory, normalize, bind, and route.
//
// Inventory = gathered-ready.
// Inventory is not Identity.
// Agreement is the doorway into Identity.

export const CONTENT_TYPES = {
  publicPosts: {
    key: "publicPosts",
    label: "Public Posts",
    category: "social",
    fields: {
      id: { type: "string", required: true },
      text: { type: "richText" },
      timestamp: { type: "date", required: true },
    },
  },

  publicLikes: {
    key: "publicLikes",
    label: "Public Likes",
    category: "social",
    fields: {
      id: { type: "string", required: true },
      targetId: { type: "string", required: true },
      timestamp: { type: "date", required: true },
    },
  },

  publicFollows: {
    key: "publicFollows",
    label: "Public Follows",
    category: "social",
    fields: {
      followerId: { type: "string", required: true },
      followedId: { type: "string", required: true },
      timestamp: { type: "date", required: true },
    },
  },

  privateMessages: {
    key: "privateMessages",
    label: "Private Messages",
    category: "social",
    fields: {
      id: { type: "string", required: true },
      from: { type: "string", required: true },
      to: { type: "string", required: true },
      body: { type: "richText" },
      timestamp: { type: "date", required: true },
    },
  },

  privateAnalytics: {
    key: "privateAnalytics",
    label: "Private Analytics",
    category: "social",
    fields: {
      impressions: { type: "number" },
      reach: { type: "number" },
      engagementRate: { type: "number" },
    },
  },

  publicPlaylists: {
    key: "publicPlaylists",
    label: "Public Playlists",
    category: "media",
    fields: {
      id: { type: "string", required: true },
      title: { type: "string" },
      trackCount: { type: "number" },
    },
  },

  publicTracks: {
    key: "publicTracks",
    label: "Public Tracks",
    category: "media",
    fields: {
      id: { type: "string", required: true },
      title: { type: "string" },
      artist: { type: "string" },
    },
  },

  listeningHistory: {
    key: "listeningHistory",
    label: "Listening History",
    category: "media",
    fields: {
      trackId: { type: "string", required: true },
      playedAt: { type: "date", required: true },
    },
  },

  privatePlaylists: {
    key: "privatePlaylists",
    label: "Private Playlists",
    category: "media",
    fields: {
      id: { type: "string", required: true },
      title: { type: "string" },
      trackCount: { type: "number" },
    },
  },

  publicStorefront: {
    key: "publicStorefront",
    label: "Public Storefront",
    category: "commerce",
    fields: {
      id: { type: "string", required: true },
      name: { type: "string" },
      url: { type: "string" },
    },
  },

  publicProducts: {
    key: "publicProducts",
    label: "Public Products",
    category: "commerce",
    fields: {
      id: { type: "string", required: true },
      title: { type: "string" },
      price: { type: "number" },
    },
  },

  orders: {
    key: "orders",
    label: "Orders",
    category: "commerce",
    fields: {
      orderId: { type: "string", required: true },
      customerId: { type: "string" },
      total: { type: "number" },
      createdAt: { type: "date" },
    },
  },

  customers: {
    key: "customers",
    label: "Customers",
    category: "commerce",
    fields: {
      id: { type: "string", required: true },
      email: { type: "string" },
      name: { type: "string" },
    },
  },

  fulfillment: {
    key: "fulfillment",
    label: "Fulfillment",
    category: "commerce",
    fields: {
      id: { type: "string", required: true },
      status: { type: "string" },
      updatedAt: { type: "date" },
    },
  },

  publicCreatorPage: {
    key: "publicCreatorPage",
    label: "Public Creator Page",
    category: "creator",
    fields: {
      id: { type: "string", required: true },
      name: { type: "string" },
      bio: { type: "richText" },
    },
  },

  subscribers: {
    key: "subscribers",
    label: "Subscribers",
    category: "creator",
    fields: {
      id: { type: "string", required: true },
      since: { type: "date" },
    },
  },

  patrons: {
    key: "patrons",
    label: "Patrons",
    category: "creator",
    fields: {
      id: { type: "string", required: true },
      tier: { type: "string" },
      since: { type: "date" },
    },
  },

  publicRepos: {
    key: "publicRepos",
    label: "Public Repos",
    category: "identity",
    fields: {
      id: { type: "string", required: true },
      name: { type: "string" },
      stars: { type: "number" },
    },
  },

  publicProfiles: {
    key: "publicProfiles",
    label: "Public Profiles",
    category: "identity",
    fields: {
      id: { type: "string", required: true },
      username: { type: "string" },
    },
  },

  privateRepos: {
    key: "privateRepos",
    label: "Private Repos",
    category: "identity",
    fields: {
      id: { type: "string", required: true },
      name: { type: "string" },
      lastUpdated: { type: "date" },
    },
  },

  accountAnalytics: {
    key: "accountAnalytics",
    label: "Account Analytics",
    category: "identity",
    fields: {
      activityScore: { type: "number" },
      loginCount: { type: "number" },
    },
  },

  likes: {
    key: "likes",
    label: "Likes",
    category: "engagement",
    fields: {
      id: { type: "string", required: true },
      targetId: { type: "string" },
    },
  },

  views: {
    key: "views",
    label: "Views",
    category: "engagement",
    fields: {
      id: { type: "string", required: true },
      targetId: { type: "string" },
    },
  },

  clicks: {
    key: "clicks",
    label: "Clicks",
    category: "engagement",
    fields: {
      id: { type: "string", required: true },
      targetId: { type: "string" },
    },
  },

  conversion: {
    key: "conversion",
    label: "Conversion",
    category: "engagement",
    fields: {
      id: { type: "string", required: true },
      value: { type: "number" },
    },
  },

  retention: {
    key: "retention",
    label: "Retention",
    category: "engagement",
    fields: {
      id: { type: "string", required: true },
      days: { type: "number" },
    },
  },

  licensingAgreement: {
    key: "licensingAgreement",
    label: "Licensing Agreement",
    category: "authority",
    fields: {
      acceptedAt: { type: "date", required: true },
    },
  },

  identityAgreement: {
    key: "identityAgreement",
    label: "Identity Agreement",
    category: "authority",
    fields: {
      acceptedAt: { type: "date", required: true },
    },
  },

  freeInventory: {
    key: "freeInventory",
    label: "Free Inventory",
    category: "inventory",
    fields: {
      items: {
        type: "array",
        items: { type: "reference", to: "ContentType" },
      },
    },
  },

  licensedInventory: {
    key: "licensedInventory",
    label: "Licensed Inventory",
    category: "inventory",
    fields: {
      items: {
        type: "array",
        items: { type: "reference", to: "ContentType" },
      },
    },
  },

  backgroundPing: {
    key: "backgroundPing",
    label: "Background Ping",
    category: "ping",
    fields: {
      timestamp: { type: "date", required: true },
    },
  },

  identityPing: {
    key: "identityPing",
    label: "Identity Ping",
    category: "ping",
    fields: {
      timestamp: { type: "date", required: true },
      identityId: { type: "string", required: true },
    },
  },

  publicUI: {
    key: "publicUI",
    label: "Public UI",
    category: "surface",
    fields: {
      id: { type: "string", required: true },
    },
  },

  privateDashboards: {
    key: "privateDashboards",
    label: "Private Dashboards",
    category: "surface",
    fields: {
      id: { type: "string", required: true },
      ownerId: { type: "string", required: true },
    },
  },
};

export function getContentType(key) {
  return CONTENT_TYPES[key] || null;
}

export function listContentTypes() {
  return Object.keys(CONTENT_TYPES);
}

export function listContentTypesByCategory(category) {
  return Object.values(CONTENT_TYPES).filter(
    (type) => type.category === category
  );
}

export const DeweyContentTypes = {
  CONTENT_TYPES,
  getContentType,
  listContentTypes,
  listContentTypesByCategory,
};

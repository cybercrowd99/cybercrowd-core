// src/Root_Doctrine_Guard.ts
// CyberCrowd Root Doctrine Guard
//
// Core lane organ.
//
// Purpose:
// - Enforce Public vs Corporate separation.
// - Protect admin, dispatcher, lifecycle, guard, audit, and sovereign controls.
// - Decide whether a surface, channel, valve, or dispatch flow is safe.
// - Keep public rooms public.
// - Keep machine controls private/corporate.
// - No elevation.
// - No hidden authority.
// - No UI.
// - No HTML.
// - No route ownership.
//
// Root rule:
// Public users can enter public rooms.
// They cannot control the machine.

export type RootDoctrineDecisionReason =
  | "allowed-public-surface"
  | "allowed-corporate-channel"
  | "allowed-public-valve"
  | "allowed-protected-valve"
  | "allowed-safe-dispatch"
  | "blocked-public-forbidden-surface"
  | "blocked-corporate-public-exposure"
  | "blocked-protected-valve-public"
  | "blocked-unsafe-dispatch"
  | "blocked-unknown-surface"
  | "blocked-unknown-channel"
  | "blocked-unknown-valve"
  | "blocked-invalid-request";

export type RootDoctrineAccessMode = "public" | "corporate";

export interface RootDoctrineConfig {
  public_world_allowed_surfaces: string[];
  public_world_forbidden_surfaces: string[];

  corporate_control_allowed_channels: string[];
  corporate_control_public_exposure_forbidden: boolean;

  protected_valves: string[];
  public_valve_entry: string;

  safe_dispatch_flows: string[];
  unsafe_dispatch_flows: string[];

  xr_runtime_path: string;
  xr_admin_console: string;
  xr_docs_files: string[];

  expected_assets: string[];
  asset_paths: Record<string, string>;

  github_owner: string;
  github_known_repos: string[];
  github_possible_repos: string[];

  doctrine_rules: string[];
  root_statement: string;
}

export interface RootDoctrineDecision {
  ok: boolean;
  reason: RootDoctrineDecisionReason;
  mode: RootDoctrineAccessMode;
  subject: string;
  statement: string;
}

export interface SurfaceRequest {
  surface: string;
  mode: RootDoctrineAccessMode;
}

export interface ChannelRequest {
  channel: string;
  mode: RootDoctrineAccessMode;
}

export interface ValveRequest {
  valve: string;
  mode: RootDoctrineAccessMode;
}

export interface DispatchRequest {
  from: string;
  to: string;
  mode: RootDoctrineAccessMode;
}

export class RootDoctrineGuard {
  private readonly config: RootDoctrineConfig;

  private readonly publicSurfaces: Set<string>;
  private readonly forbiddenPublicSurfaces: Set<string>;
  private readonly corporateChannels: Set<string>;
  private readonly protectedValves: Set<string>;
  private readonly safeDispatch: Set<string>;
  private readonly unsafeDispatch: Set<string>;

  constructor(config: RootDoctrineConfig = DEFAULT_ROOT_DOCTRINE) {
    this.config = normalizeConfig(config);

    this.publicSurfaces = new Set(this.config.public_world_allowed_surfaces);
    this.forbiddenPublicSurfaces = new Set(
      this.config.public_world_forbidden_surfaces
    );
    this.corporateChannels = new Set(
      this.config.corporate_control_allowed_channels
    );
    this.protectedValves = new Set(this.config.protected_valves);
    this.safeDispatch = new Set(this.config.safe_dispatch_flows);
    this.unsafeDispatch = new Set(this.config.unsafe_dispatch_flows);
  }

  getRootStatement(): string {
    return this.config.root_statement;
  }

  getConfig(): RootDoctrineConfig {
    return cloneConfig(this.config);
  }

  canEnterSurface(request: SurfaceRequest): RootDoctrineDecision {
    const surface = cleanId(request?.surface);
    const mode = cleanMode(request?.mode);

    if (!surface || !mode) {
      return this.deny(
        mode ?? "public",
        surface,
        "blocked-invalid-request"
      );
    }

    if (mode === "corporate") {
      if (this.corporateChannels.has(surface)) {
        return this.allow(
          mode,
          surface,
          "allowed-corporate-channel"
        );
      }

      if (this.publicSurfaces.has(surface)) {
        return this.allow(
          mode,
          surface,
          "allowed-public-surface"
        );
      }

      return this.deny(mode, surface, "blocked-unknown-surface");
    }

    if (this.forbiddenPublicSurfaces.has(surface)) {
      return this.deny(
        mode,
        surface,
        "blocked-public-forbidden-surface"
      );
    }

    if (this.corporateChannels.has(surface)) {
      return this.deny(
        mode,
        surface,
        "blocked-corporate-public-exposure"
      );
    }

    if (!this.publicSurfaces.has(surface)) {
      return this.deny(
        mode,
        surface,
        "blocked-unknown-surface"
      );
    }

    return this.allow(
      mode,
      surface,
      "allowed-public-surface"
    );
  }

  canUseCorporateChannel(request: ChannelRequest): RootDoctrineDecision {
    const channel = cleanId(request?.channel);
    const mode = cleanMode(request?.mode);

    if (!channel || !mode) {
      return this.deny(
        mode ?? "public",
        channel,
        "blocked-invalid-request"
      );
    }

    if (!this.corporateChannels.has(channel)) {
      return this.deny(
        mode,
        channel,
        "blocked-unknown-channel"
      );
    }

    if (
      mode === "public" &&
      this.config.corporate_control_public_exposure_forbidden
    ) {
      return this.deny(
        mode,
        channel,
        "blocked-corporate-public-exposure"
      );
    }

    return this.allow(
      mode,
      channel,
      "allowed-corporate-channel"
    );
  }

  canUseValve(request: ValveRequest): RootDoctrineDecision {
    const valve = cleanId(request?.valve);
    const mode = cleanMode(request?.mode);

    if (!valve || !mode) {
      return this.deny(
        mode ?? "public",
        valve,
        "blocked-invalid-request"
      );
    }

    if (valve === this.config.public_valve_entry) {
      return this.allow(
        mode,
        valve,
        "allowed-public-valve"
      );
    }

    if (!this.protectedValves.has(valve)) {
      return this.deny(
        mode,
        valve,
        "blocked-unknown-valve"
      );
    }

    if (mode === "public") {
      return this.deny(
        mode,
        valve,
        "blocked-protected-valve-public"
      );
    }

    return this.allow(
      mode,
      valve,
      "allowed-protected-valve"
    );
  }

  canDispatch(request: DispatchRequest): RootDoctrineDecision {
    const from = cleanFlowPart(request?.from);
    const to = cleanFlowPart(request?.to);
    const mode = cleanMode(request?.mode);

    if (!from || !to || !mode) {
      return this.deny(
        mode ?? "public",
        `${from || "unknown"} -> ${to || "unknown"}`,
        "blocked-invalid-request"
      );
    }

    const flow = `${from} -> ${to}`;

    if (this.unsafeDispatch.has(flow)) {
      return this.deny(
        mode,
        flow,
        "blocked-unsafe-dispatch"
      );
    }

    if (mode === "public") {
      if (
        this.corporateChannels.has(from) ||
        this.corporateChannels.has(to) ||
        this.protectedValves.has(from) ||
        this.protectedValves.has(to)
      ) {
        return this.deny(
          mode,
          flow,
          "blocked-corporate-public-exposure"
        );
      }
    }

    if (this.safeDispatch.has(flow)) {
      return this.allow(
        mode,
        flow,
        "allowed-safe-dispatch"
      );
    }

    return this.deny(
      mode,
      flow,
      "blocked-unsafe-dispatch"
    );
  }

  isExpectedAsset(assetName: string): boolean {
    const cleanAsset = cleanId(assetName);

    if (!cleanAsset) {
      return false;
    }

    return this.config.expected_assets.includes(cleanAsset);
  }

  getAssetPath(assetName: string): string | null {
    const cleanAsset = cleanId(assetName);

    if (!cleanAsset) {
      return null;
    }

    return this.config.asset_paths[cleanAsset] ?? null;
  }

  isKnownRepo(repo: string): boolean {
    const cleanRepo = cleanRepoName(repo);

    if (!cleanRepo) {
      return false;
    }

    return this.config.github_known_repos.includes(cleanRepo);
  }

  isPossibleRepo(repo: string): boolean {
    const cleanRepo = cleanRepoName(repo);

    if (!cleanRepo) {
      return false;
    }

    return this.config.github_possible_repos.includes(cleanRepo);
  }

  hasDoctrineRule(rule: string): boolean {
    const cleanRule = cleanId(rule);

    if (!cleanRule) {
      return false;
    }

    return this.config.doctrine_rules.includes(cleanRule);
  }

  private allow(
    mode: RootDoctrineAccessMode,
    subject: string,
    reason: RootDoctrineDecisionReason
  ): RootDoctrineDecision {
    return {
      ok: true,
      reason,
      mode,
      subject,
      statement: this.config.root_statement
    };
  }

  private deny(
    mode: RootDoctrineAccessMode,
    subject: string,
    reason: RootDoctrineDecisionReason
  ): RootDoctrineDecision {
    return {
      ok: false,
      reason,
      mode,
      subject,
      statement: this.config.root_statement
    };
  }
}

export const DEFAULT_ROOT_DOCTRINE: RootDoctrineConfig = {
  public_world_allowed_surfaces: [
    "publicXR",
    "guestPreview",
    "portfolio",
    "profile",
    "media",
    "projectRooms",
    "safePortals"
  ],

  public_world_forbidden_surfaces: [
    "adminControls",
    "guardRules",
    "auditTrail",
    "reviewApproval",
    "dispatcherCommands",
    "surfaceLifecycle",
    "sovereignValves"
  ],

  corporate_control_allowed_channels: [
    "adminConsole",
    "reviewQueue",
    "auditTrail",
    "guardRules",
    "digitalAppDispatcher",
    "surfaceRegistry",
    "surfaceLifecycle",
    "swarmHealth",
    "swarmFailover",
    "sovereignContinuity"
  ],

  corporate_control_public_exposure_forbidden: true,

  protected_valves: [
    "adminControl",
    "dispatcher",
    "lifecycle",
    "guardRules",
    "reviewApproval",
    "auditAccess",
    "assetVerification"
  ],

  public_valve_entry: "publicEntry",

  safe_dispatch_flows: [
    "publicSurface -> publicEntry",
    "publicEntry -> xrRoomPublicMode",
    "corporateChannel -> sovereignContinuity",
    "sovereignContinuity -> dispatcher",
    "dispatcher -> lifecycle",
    "dispatcher -> admin",
    "dispatcher -> swarm"
  ],

  unsafe_dispatch_flows: [
    "publicForum -> dispatcher",
    "guestPage -> guardRules",
    "botVisibleSurface -> adminConsole",
    "publicXRPage -> lifecycleStop"
  ],

  xr_runtime_path: "Apps/xr-room-vr-build/",

  xr_admin_console: "Apps/admin-console/",

  xr_docs_files: [
    "XR_ADMIN_CONTROL_ROOM.md",
    "XR_SURFACE_MAPPING.md"
  ],

  expected_assets: [
    "octopus",
    "halo",
    "colosieum"
  ],

  asset_paths: {
    octopus: "Apps/xr-room-vr-build/public/assets/octopus.glb",
    halo: "Apps/xr-room-vr-build/public/assets/halo.webp",
    colosieum: "Apps/xr-room-vr-build/public/assets/colosieum.glb"
  },

  github_owner: "cybercrowd99",

  github_known_repos: [
    "cybercrowd99/cybercrowd99.github.io"
  ],

  github_possible_repos: [
    "cybercrowd99/cybercrowd-net"
  ],

  doctrine_rules: [
    "buildRealFiles",
    "separatePublicAndAdmin",
    "neverExposePrivilegedControl",
    "ownerContinuityAboveAutomation",
    "swarmAgentsAreControlled",
    "botsArePublicUnlessAuthenticated",
    "auditPrivilegedActions",
    "keepArtifactsVisible",
    "preferClearFilenames",
    "doNotPushUnlessRepoConfirmed"
  ],

  root_statement:
    "CyberCrowd is a multiplex XR and admin-control system where the public can enter the world, but only sovereign/private channels can control the machinery."
};

export function createRootDoctrineGuard(
  config: RootDoctrineConfig = DEFAULT_ROOT_DOCTRINE
): RootDoctrineGuard {
  return new RootDoctrineGuard(config);
}

function normalizeConfig(config: RootDoctrineConfig): RootDoctrineConfig {
  if (!config || typeof config !== "object") {
    throw new Error("ROOT_DOCTRINE_CONFIG_REQUIRED");
  }

  const normalized: RootDoctrineConfig = {
    public_world_allowed_surfaces: cleanIdList(
      config.public_world_allowed_surfaces
    ),
    public_world_forbidden_surfaces: cleanIdList(
      config.public_world_forbidden_surfaces
    ),
    corporate_control_allowed_channels: cleanIdList(
      config.corporate_control_allowed_channels
    ),
    corporate_control_public_exposure_forbidden: Boolean(
      config.corporate_control_public_exposure_forbidden
    ),
    protected_valves: cleanIdList(config.protected_valves),
    public_valve_entry:
      cleanId(config.public_valve_entry) || "publicEntry",
    safe_dispatch_flows: cleanFlowList(config.safe_dispatch_flows),
    unsafe_dispatch_flows: cleanFlowList(config.unsafe_dispatch_flows),
    xr_runtime_path: cleanPath(config.xr_runtime_path),
    xr_admin_console: cleanPath(config.xr_admin_console),
    xr_docs_files: cleanPathList(config.xr_docs_files),
    expected_assets: cleanIdList(config.expected_assets),
    asset_paths: cleanAssetPaths(config.asset_paths),
    github_owner: cleanId(config.github_owner),
    github_known_repos: cleanRepoList(config.github_known_repos),
    github_possible_repos: cleanRepoList(config.github_possible_repos),
    doctrine_rules: cleanIdList(config.doctrine_rules),
    root_statement:
      typeof config.root_statement === "string"
        ? config.root_statement.trim()
        : ""
  };

  if (!normalized.root_statement) {
    throw new Error("ROOT_STATEMENT_REQUIRED");
  }

  return normalized;
}

function cloneConfig(config: RootDoctrineConfig): RootDoctrineConfig {
  return {
    public_world_allowed_surfaces: [...config.public_world_allowed_surfaces],
    public_world_forbidden_surfaces: [...config.public_world_forbidden_surfaces],
    corporate_control_allowed_channels: [
      ...config.corporate_control_allowed_channels
    ],
    corporate_control_public_exposure_forbidden:
      config.corporate_control_public_exposure_forbidden,
    protected_valves: [...config.protected_valves],
    public_valve_entry: config.public_valve_entry,
    safe_dispatch_flows: [...config.safe_dispatch_flows],
    unsafe_dispatch_flows: [...config.unsafe_dispatch_flows],
    xr_runtime_path: config.xr_runtime_path,
    xr_admin_console: config.xr_admin_console,
    xr_docs_files: [...config.xr_docs_files],
    expected_assets: [...config.expected_assets],
    asset_paths: { ...config.asset_paths },
    github_owner: config.github_owner,
    github_known_repos: [...config.github_known_repos],
    github_possible_repos: [...config.github_possible_repos],
    doctrine_rules: [...config.doctrine_rules],
    root_statement: config.root_statement
  };
}

function cleanMode(value: unknown): RootDoctrineAccessMode | null {
  if (value === "public" || value === "corporate") {
    return value;
  }

  return null;
}

function cleanIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.map(cleanId).filter(Boolean));
}

function cleanRepoList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.map(cleanRepoName).filter(Boolean));
}

function cleanPathList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.map(cleanPath).filter(Boolean));
}

function cleanFlowList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.map(cleanFlow).filter(Boolean));
}

function cleanAssetPaths(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: Record<string, string> = {};

  for (const [key, path] of Object.entries(value as Record<string, unknown>)) {
    const cleanKey = cleanId(key);
    const cleanValue = cleanPath(path);

    if (cleanKey && cleanValue) {
      out[cleanKey] = cleanValue;
    }
  }

  return out;
}

function cleanFlow(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const parts = value
    .split("->")
    .map((part) => cleanFlowPart(part))
    .filter(Boolean);

  if (parts.length !== 2) {
    return "";
  }

  return `${parts[0]} -> ${parts[1]}`;
}

function cleanFlowPart(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const clean = value.trim();

  if (!clean || clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)) {
    return "";
  }

  return clean;
}

function cleanRepoName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const clean = value.trim();

  if (!clean || clean.length > 240) {
    return "";
  }

  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(clean)) {
    return "";
  }

  return clean;
}

function cleanPath(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const clean = value.trim();

  if (!clean || clean.length > 500) {
    return "";
  }

  if (clean.includes("..")) {
    return "";
  }

  if (!/^[a-zA-Z0-9._/@+=$ -]+$/.test(clean)) {
    return "";
  }

  return clean;
}

function cleanId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const clean = String(value).trim();

  if (!clean || clean.length > 180) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:@/+=$-]+$/.test(clean)) {
    return "";
  }

  return clean;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

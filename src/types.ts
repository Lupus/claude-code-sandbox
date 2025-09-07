export interface VolumeMount {
  source: string;
  target: string;
  readonly?: boolean;
}

export interface SandboxConfig {
  dockerImage?: string;
  dockerfile?: string;
  containerPrefix?: string;
  autoPush?: boolean;
  autoCreatePR?: boolean;
  autoStartClaude?: boolean;
  defaultShell?: "claude" | "bash";
  claudeConfigPath?: string;
  setupCommands?: string[];
  environment?: Record<string, string>;
  envFile?: string;
  volumes?: string[];
  mounts?: VolumeMount[];
  allowedTools?: string[];
  maxThinkingTokens?: number;
  bashTimeout?: number;
  includeUntracked?: boolean;
  targetBranch?: string;
  remoteBranch?: string;
  prNumber?: string;
  dockerSocketPath?: string;
  // Network configuration options
  networkMode?: string; // e.g., "bridge", "none", "host", or custom network name
  networkName?: string; // Use existing custom network by name
  dnsServers?: string[]; // Custom DNS servers for the container
  extraHosts?: Record<string, string>; // Additional host mappings
}

export interface Credentials {
  claude?: {
    type: "api_key" | "oauth" | "bedrock" | "vertex";
    value: string;
    region?: string;
    project?: string;
  };
  github?: {
    token?: string;
    gitConfig?: string;
  };
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

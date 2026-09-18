/**
 * DSH settings namespace for Graph Memory.
 *
 * The plugin config in `cordis.patch.yml` stays the composition layer; this
 * schema is what the Settings → Plugins card edits, and it layers on top:
 * schema defaults, then the composition entry, then the user document.
 *
 * Every field here is read once at plugin start, so the namespace declares
 * `applies: "restart"` and the card tells the user to restart `dsh web`.
 *
 * @module graph-memory/settings
 */

import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by the DSH half of Graph Memory. */
export const GRAPH_MEMORY_SETTINGS_NAMESPACE = "graph-memory";

/** Which `gm_*` tools the assistant sees. */
export type AssistantToolsMode = "none" | "search" | "all";

/** Reasoning effort accepted by the extraction route. */
export type ReasoningEffortMode =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

/** Raw-message retention policy. */
export type MessageRetentionMode = "all" | "referenced" | "recent";

/** Embedding provider fields a user may own. */
export interface GraphMemoryEmbeddingSettings {
  /** Credential (or environment) reference holding the API key. */
  apiKeyEnv?: string;
  /** OpenAI-compatible embeddings endpoint. */
  baseURL?: string;
  /** Legacy alias of {@link GraphMemoryEmbeddingSettings.baseURL}. */
  baseUrl?: string;
  /** Embedding model name. */
  model?: string;
  /** Vector dimensions; must match the vectors already stored. */
  dimensions?: number;
}

/** Retention fields a user may own. */
export interface GraphMemoryRetentionSettings {
  keep: MessageRetentionMode;
  recentTurns: number;
  retentionDays: number;
  batchSize: number;
  dryRun: boolean;
}

/** The user-ownable Graph Memory configuration. */
export interface GraphMemorySettings {
  extractionEnabled: boolean;
  recallEnabled: boolean;
  recallMaxNodes: number;
  semanticScoreThreshold?: number;
  assistantTools: AssistantToolsMode;
  maintenanceInterval: number;
  freshTurnCount: number;
  contextCompactionEnabled: boolean;
  projectCompletedTurnTools: boolean;
  llmProvider?: string;
  llmModel?: string;
  llmReasoningEffort: ReasoningEffortMode;
  llmMaxTokens?: number;
  embedding?: GraphMemoryEmbeddingSettings;
  dbPath: string;
  messageRetention: GraphMemoryRetentionSettings;
}

/**
 * Schema of the namespace. Defaults mirror the plugin's own fallbacks so a
 * composition entry that omits a field resolves to the same value as before.
 */
export const GRAPH_MEMORY_SETTINGS_SCHEMA = z.object({
  extractionEnabled: z.boolean().default(true),
  recallEnabled: z.boolean().default(true),
  recallMaxNodes: z.number().step(1).min(1).default(6),
  semanticScoreThreshold: z.number().min(-1).max(1),
  assistantTools: z.union([z.const("none"), z.const("search"), z.const("all")]).default("none"),
  maintenanceInterval: z.number().step(1).min(1).default(6),
  freshTurnCount: z.number().step(1).min(1).default(5),
  contextCompactionEnabled: z.boolean().default(false),
  projectCompletedTurnTools: z.boolean().default(false),
  llmProvider: z.string(),
  llmModel: z.string(),
  llmReasoningEffort: z.union([
    z.const("off"),
    z.const("minimal"),
    z.const("low"),
    z.const("medium"),
    z.const("high"),
    z.const("xhigh"),
    z.const("max"),
  ]).default("off"),
  llmMaxTokens: z.number().step(1).min(1),
  embedding: z.object({
    apiKeyEnv: z.string(),
    baseURL: z.string(),
    baseUrl: z.string(),
    model: z.string(),
    dimensions: z.number().step(1).min(1),
  }),
  dbPath: z.string().default("~/.dsh/graph-memory/graph-memory.db"),
  messageRetention: z.object({
    keep: z.union([z.const("all"), z.const("referenced"), z.const("recent")]).default("all"),
    recentTurns: z.number().step(1).min(0).default(0),
    retentionDays: z.number().step(1).min(0).default(0),
    batchSize: z.number().step(1).min(1).default(500),
    dryRun: z.boolean().default(false),
  }),
});

/** The composition-layer shape read from `cordis.patch.yml`. */
export interface GraphMemorySettingsInput {
  dbPath?: string;
  extractionEnabled?: boolean;
  recallEnabled?: boolean;
  recallMaxNodes?: number;
  semanticScoreThreshold?: number;
  assistantTools?: AssistantToolsMode;
  maintenanceInterval?: number;
  freshTurnCount?: number;
  contextCompactionEnabled?: boolean;
  projectCompletedTurnTools?: boolean;
  llmProvider?: string;
  llmModel?: string;
  llmReasoningEffort?: ReasoningEffortMode;
  llmMaxTokens?: number;
  embedding?: GraphMemoryEmbeddingSettings;
  messageRetention?: {
    keep?: MessageRetentionMode;
    recentTurns?: number;
    retentionDays?: number;
    batchSize?: number;
    dryRun?: boolean;
  };
}

/** Copy only the fields the composition entry actually declared. */
function defined<T extends object>(value: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) result[key] = entry;
  }
  return result;
}

/**
 * Project the composition entry onto the schema's shape.
 *
 * A field the entry did not declare is omitted, so it resolves from the schema
 * default instead of being pinned to a copy of it.
 * @param input - the plugin configuration from `cordis.patch.yml`.
 * @returns the composition layer for {@link GRAPH_MEMORY_SETTINGS_SCHEMA}.
 */
export function graphMemorySettingsBase(
  input: GraphMemorySettingsInput,
): Partial<GraphMemorySettings> {
  const base: Record<string, unknown> = defined({
    extractionEnabled: input.extractionEnabled,
    recallEnabled: input.recallEnabled,
    recallMaxNodes: input.recallMaxNodes,
    semanticScoreThreshold: input.semanticScoreThreshold,
    assistantTools: input.assistantTools,
    maintenanceInterval: input.maintenanceInterval,
    freshTurnCount: input.freshTurnCount,
    contextCompactionEnabled: input.contextCompactionEnabled,
    projectCompletedTurnTools: input.projectCompletedTurnTools,
    llmProvider: input.llmProvider,
    llmModel: input.llmModel,
    llmReasoningEffort: input.llmReasoningEffort,
    llmMaxTokens: input.llmMaxTokens,
    dbPath: input.dbPath,
  });
  if (input.embedding !== undefined) {
    const embedding = defined({
      apiKeyEnv: input.embedding.apiKeyEnv,
      baseURL: input.embedding.baseURL,
      baseUrl: input.embedding.baseUrl,
      model: input.embedding.model,
      dimensions: input.embedding.dimensions,
    });
    if (Object.keys(embedding).length > 0) base.embedding = embedding;
  }
  if (input.messageRetention !== undefined) {
    const retention = defined({
      keep: input.messageRetention.keep,
      recentTurns: input.messageRetention.recentTurns,
      retentionDays: input.messageRetention.retentionDays,
      batchSize: input.messageRetention.batchSize,
      dryRun: input.messageRetention.dryRun,
    });
    if (Object.keys(retention).length > 0) base.messageRetention = retention;
  }
  return base as Partial<GraphMemorySettings>;
}

/**
 * Reject a section the plugin could not act on.
 *
 * Cross-field rules the schema cannot express: a half-configured extraction
 * route, a credential reference that is not an identifier, and a `recent`
 * retention window with neither bound set. Throwing here refuses the write
 * that produced the value, so a hostile document cannot strand the plugin.
 * @param value - the schema-resolved section.
 */
export function validateGraphMemorySettings(value: GraphMemorySettings): void {
  if ((value.llmProvider === undefined) !== (value.llmModel === undefined)) {
    throw new TypeError("[graph-memory] llmProvider and llmModel must be configured together");
  }
  const credentialRef = value.embedding?.apiKeyEnv;
  if (credentialRef !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(credentialRef)) {
    throw new TypeError(
      `[graph-memory] embedding.apiKeyEnv must be a credential reference, received ${JSON.stringify(credentialRef)}`,
    );
  }
  if (
    value.messageRetention.keep === "recent"
    && value.messageRetention.recentTurns === 0
    && value.messageRetention.retentionDays === 0
  ) {
    throw new TypeError("[graph-memory] messageRetention.keep=recent requires recentTurns or retentionDays");
  }
}

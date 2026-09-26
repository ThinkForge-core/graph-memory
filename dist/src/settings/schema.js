/**
 * DSH configuration schema for Graph Memory.
 *
 * The Cordis Loader validates this schema, layers schema defaults, the
 * `cordis.patch.yml` composition entry and the user document the Settings card
 * writes, then hands the result to `apply`. Nothing here registers itself with
 * the settings service: since DSH 0.1.7 `settings.describe()` serves a
 * namespace from the *profile entry* whose plugin exports this `Config`, and
 * only when the entry's schema exposes at least one volatile field.
 *
 * That is why every field the card edits is declared `.volatile()`: the field
 * arrives as a stable reference the Loader updates in place on a settings
 * write without remounting the plugin. Ordinary fields would force the
 * ordinary update lifecycle instead.
 *
 * Every field is read once while the plugin wires itself, so a stored change
 * takes effect on the next `dsh web` start and the card says exactly that.
 *
 * @module graph-memory/settings
 */
import z from "@deepseek-ai/schemastery";
/** Profile entry id that owns this schema; also the settings namespace the card reads. */
export const GRAPH_MEMORY_SETTINGS_NAMESPACE = "graph-memory";
/**
 * Schema the Loader validates and the Plugins card edits.
 *
 * Defaults mirror the plugin's own fallbacks so a composition entry that omits
 * a field resolves to the same value as before. Every field the
 * `graph-memory-ui-dsh` card edits carries `.volatile()`; the legacy
 * `embedding.baseUrl` alias is not a card field and stays ordinary.
 */
export const GRAPH_MEMORY_SETTINGS_SCHEMA = z.object({
    extractionEnabled: z.boolean().default(true).volatile(),
    recallEnabled: z.boolean().default(true).volatile(),
    recallMaxNodes: z.number().step(1).min(1).default(6).volatile(),
    // Two independent reach settings instead of one switch: other sessions are
    // read once at session start (the default) while this session's own history
    // stays recoverable whenever the takeover hides it.
    recallCrossSession: z
        .union([z.const("first-turn"), z.const("every-turn"), z.const("never")])
        .default("first-turn")
        .volatile(),
    recallSessionHistory: z.boolean().default(true).volatile(),
    // Deprecated: superseded by the pair above and ignored by the host. Declared
    // without a default so a profile that never carried it stays distinguishable
    // from one that did.
    recallOnFirstTurnOnly: z.boolean().volatile(),
    semanticScoreThreshold: z.number().min(-1).max(1).volatile(),
    assistantTools: z.union([z.const("none"), z.const("search"), z.const("all")]).default("none").volatile(),
    maintenanceInterval: z.number().step(1).min(1).default(6).volatile(),
    freshTurnCount: z.number().step(1).min(1).default(5).volatile(),
    contextCompactionEnabled: z.boolean().default(false).volatile(),
    projectCompletedTurnTools: z.boolean().default(false).volatile(),
    llmProvider: z.string().volatile(),
    llmModel: z.string().volatile(),
    llmReasoningEffort: z.union([
        z.const("off"),
        z.const("minimal"),
        z.const("low"),
        z.const("medium"),
        z.const("high"),
        z.const("xhigh"),
        z.const("max"),
    ]).default("off").volatile(),
    llmMaxTokens: z.number().step(1).min(1).volatile(),
    embedding: z.object({
        apiKeyEnv: z.string().volatile(),
        baseURL: z.string().volatile(),
        baseUrl: z.string(),
        model: z.string().volatile(),
        dimensions: z.number().step(1).min(1).volatile(),
    }),
    dbPath: z.string().default("~/.dsh/graph-memory/graph-memory.db").volatile(),
    // Internal stamp, deliberately absent from the card's field list: the host
    // writes the optimal preset once per revision. See OPTIMAL_SETTINGS_REVISION.
    appliedOptimalRevision: z.string().volatile(),
    messageRetention: z.object({
        keep: z.union([z.const("all"), z.const("referenced"), z.const("recent")]).default("all").volatile(),
        recentTurns: z.number().step(1).min(0).default(0).volatile(),
        retentionDays: z.number().step(1).min(0).default(0).volatile(),
        batchSize: z.number().step(1).min(1).default(500).volatile(),
        dryRun: z.boolean().default(false).volatile(),
    }),
});
/** The cosmokit volatile-reference protocol marker; `Symbol.for` matches it across module copies. */
const VOLATILE_REF = Symbol.for("cosmokit.volatile.write");
/** Whether a Loader-parsed value is a stable volatile reference rather than plain data. */
function isVolatileRef(value) {
    return typeof value === "object" && value !== null && VOLATILE_REF in value;
}
/** Replace every volatile reference with its current value, recursively. */
function plainValues(value) {
    if (isVolatileRef(value))
        return plainValues(value.get());
    if (Array.isArray(value))
        return value.map(plainValues);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, plainValues(child)]));
    }
    return value;
}
/**
 * Project the Loader-resolved configuration into the plain values `apply` uses.
 *
 * The Loader layers schema defaults, the `cordis.patch.yml` composition entry
 * and the user document, then validates against {@link GRAPH_MEMORY_SETTINGS_SCHEMA}.
 * Fields the card edits are volatile, so they arrive as references; this reads
 * their current values once, which is why a stored change applies on the next
 * `dsh web` start. Plain input (a hand-built context in tests) passes through.
 * @param input - configuration the Loader resolved for this entry.
 * @returns the effective Graph Memory configuration.
 */
export function resolveGraphMemorySettings(input) {
    return plainValues(input);
}

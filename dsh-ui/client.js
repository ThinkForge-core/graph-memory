/**
 * Browser half of Graph Memory — the plugin's settings card.
 *
 * Hand-written factory-form module (the same shape `graph-memory-pro-dsh`
 * uses): no bundler, no JSX, no build step. The card is the configuration of
 * the `graph-memory` bundle: it registers into the Plugins page's
 * `plugins.bundle.config` keyed by that package name, and the page renders it
 * on the bundle's own page — the one a click on the bundle's card in the
 * Installed list opens. Gating on the Host serving the `graph-memory` settings
 * namespace keeps an unserved entry from showing an empty section. It declares
 * the same namespace on the locale service so the framework hands it a `t`
 * seat and re-renders on a language switch.
 *
 * The `__ModuleLoader__` id is this package's own name: the client module
 * system requires each bundle to register the package whose Loader row owns
 * it, and reports a bundle that registers anything else as a duplicate
 * factory.
 *
 * Every field is read once when the Host plugin starts, so the card tells the
 * user that changes apply on the next `dsh web` start. The Host schema marks
 * these fields volatile, so a write updates the stored value without
 * remounting the plugin; nothing reads the new value before that restart.
 *
 * The card reads and writes through `ctx.configForms`, which owns revision
 * fencing, per-field overrides, and recovery — this module only renders.
 */
window.__ModuleLoader__.load({
  id: "graph-memory-ui-dsh",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const h = React.createElement;
    const NS = "graph-memory";

    // ── dictionaries ────────────────────────────────────────────────────────

    const en = {
      title: "Graph Memory",
      description:
        "What the memory layer learns, recalls, and keeps. Values live in the profile's settings document; cordis.patch.yml stays the base layer.",
      subtitle: "Learning, recall, and retention settings.",
      restartTag: "restart needed",
      restartStatic: "Stored immediately — applied on the next dsh web start.",
      restartSaved: "Saved. Restart dsh web to apply.",
      loading: "Loading Graph Memory settings…",
      reset: "Reset",
      caution: "caution",
      showAdvanced: "Show advanced settings ({count})",
      hideAdvanced: "Hide advanced settings",
      kindInteger: "whole number",
      kindNumber: "number",
      errorNumber: "{label}: enter a valid {kind}.",
      errorBelow: "{label}: must be at least {min}.",
      errorAbove: "{label}: must be at most {max}.",

      group_recallTuning: "Recall tuning",
      group_surface: "Model surface",
      group_extraction: "Extraction model",
      group_embeddings: "Embeddings",
      group_storage: "Storage & retention",

      f_extractionEnabled_label: "Learn from new conversations",
      f_extractionEnabled_hint:
        "When on, each finished turn is summarized into memory by the extraction model. Turn off to stop automatic learning — gm_record still works.",
      f_recallEnabled_label: "Put memory into the context",
      f_recallEnabled_hint:
        "Master switch for automatic injection. Turn off to stop it entirely — gm_search and gm_record still work.",
      f_recallCrossSession_label: "Memory from other conversations",
      f_recallCrossSession_hint:
        "How far automatic recall may reach into earlier sessions: once when a session starts (default), before every message, or never — leaving them to the gm_search tool. A session already under way is not re-fed them.",
      f_recallSessionHistory_label: "Restore this conversation's hidden history",
      f_recallSessionHistory_hint:
        "When the history takeover below hides older turns of THIS conversation, put the relevant ones back automatically — each one once, and only while it stays hidden. Turn this off only together with the takeover, or the hidden part is gone for good.",
      f_recallMaxNodes_label: "Max memories per recall",
      f_recallMaxNodes_hint:
        "Upper bound on memory nodes one automatic recall may return. Higher = more context, more tokens.",
      f_assistantTools_label: "Memory tools for the model",
      f_assistantTools_hint:
        "Which gm_* tools the assistant sees. none keeps automatic recall and hides every tool schema.",
      f_semanticScoreThreshold_label: "Minimum similarity score",
      f_semanticScoreThreshold_hint:
        "Cosine floor for semantic recall; only candidates at or above it are injected. Empty leaves the plugin default in place (0.70 in this build).",
      f_maintenanceInterval_label: "Maintenance every N turns",
      f_maintenanceInterval_hint:
        "Run one graph maintenance tick (PageRank, communities, retention) after this many finished turns.",
      f_freshTurnCount_label: "Keep recent turns verbatim",
      f_freshTurnCount_hint:
        "The newest N turns stay as native question/answer on the model surface. Older turns are governed by the two rewrite options below.",
      f_contextCompactionEnabled_label: "Fold old history away (lossy)",
      f_contextCompactionEnabled_hint:
        "Lets Graph Memory replace the older model-surface history with recalled material; the model never sees that history verbatim again. Refused unless learning, recall and 'restore this conversation's hidden history' are all on.",
      f_projectCompletedTurnTools_label: "Hide tool traces from the model",
      f_projectCompletedTurnTools_hint:
        "Removes completed-turn tool and reasoning traces from the model surface, keeping only the question and the final answer. The hidden trace stays in the durable log.",
      f_llmProvider_label: "Provider",
      f_llmProvider_hint:
        "Dedicated provider for the extraction model, taking precedence over the foreground agent model. Must be set together with the model.",
      f_llmModel_label: "Model",
      f_llmModel_hint:
        "Model that summarizes finished turns into memory. Must be set together with the provider.",
      f_llmReasoningEffort_label: "Reasoning effort",
      f_llmReasoningEffort_hint:
        "Reasoning effort for extraction. off is recommended: extraction is a background task and does not need chain-of-thought.",
      f_llmMaxTokens_label: "Response cap",
      f_llmMaxTokens_hint:
        "Optional cap on the extraction response length. Empty = provider default.",
      f_baseURL_label: "Base URL",
      f_baseURL_hint:
        "OpenAI-compatible embeddings endpoint. Changing it re-embeds the entire graph.",
      f_model_label: "Model",
      f_model_hint:
        "Embedding model. Changing it re-embeds the entire graph and changes the stored vector space.",
      f_dimensions_label: "Dimensions",
      f_dimensions_hint:
        "Must match the vectors already stored. Changing it re-embeds the entire graph.",
      f_apiKeyEnv_label: "Credential reference",
      f_apiKeyEnv_hint:
        "Name of the credential (or environment variable) holding the embeddings API key. The key itself lives on the Credentials page, never here.",
      f_dbPath_label: "Database file",
      f_dbPath_hint:
        "SQLite file holding every memory. Switching it opens a different — usually empty — database; the old file is left untouched.",
      f_keep_label: "Raw message retention",
      f_keep_hint:
        "What happens to the raw question/answer rows. all keeps them forever; the other modes prune.",
      f_recentTurns_label: "Keep last N turns",
      f_recentTurns_hint:
        "With retention = recent: never delete the newest N turns, whatever their age.",
      f_retentionDays_label: "Delete older than N days",
      f_retentionDays_hint:
        "With retention = recent: delete raw messages older than N days. recent needs at least one of these two thresholds to be non-zero.",
      f_batchSize_label: "Deletion batch size",
      f_batchSize_hint:
        "How many rows one retention pass deletes at a time. Smaller = gentler, more passes.",
      f_dryRun_label: "Dry run (report only)",
      f_dryRun_hint:
        "When on, retention reports what it would delete and deletes nothing. Keep it on until you trust the policy.",

      o_assistantTools_none: "none — automatic recall only",
      o_assistantTools_search: "search — expose gm_search",
      o_assistantTools_all: "all — also expose the admin tools",
      o_recallCrossSession_firstTurn: "first message only — read them once at session start",
      o_recallCrossSession_everyTurn: "every message — keep pulling them in",
      o_recallCrossSession_never: "never — leave them to gm_search",
      o_keep_all: "all — never delete raw messages",
      o_keep_referenced: "referenced — delete unreferenced only",
      o_keep_recent: "recent — delete outside the window",

      chainHint: "Linked — change one and the others stay optimal.",
      autoTag: "adjusted",
      resetHint: "Overridden in your profile — click to return the default.",
      restoreOptimal: "Restore optimal settings",
      restoreOptimalHint:
        "Applies the validated combination: history takeover on, tool traces hidden, other conversations read at session start, this conversation's hidden history restored, five recent turns, and a bounded recall size.",
      chainReason_takeover:
        "History takeover needs learning and recall on, and 'restore this conversation's hidden history' enabled, or the hidden part can never come back.",
      chainReason_noTakeover:
        "Without a working recall path the takeover is refused, so it is switched off.",
      chainReason_budget:
        "{window} recent turns → {nodes} memories per recall, so the total stays bounded.",
      chainReason_firstTurn:
        "Reading other conversations once never accumulates, so the size is capped rather than shrunk.",
      chainReason_dryRun:
        "Preview first: dry run stays on until you turn it off deliberately.",
    };

    const zh = {
      title: "Graph Memory",
      description:
        "记忆层学习什么、召回什么、保留什么。取值保存在配置档案的设置文档中；cordis.patch.yml 仍作为基础层。",
      subtitle: "学习、召回与保留设置。",
      restartTag: "需要重启",
      restartStatic: "立即保存 —— 下次启动 dsh web 时生效。",
      restartSaved: "已保存。重启 dsh web 后生效。",
      loading: "正在载入 Graph Memory 设置…",
      reset: "重置",
      caution: "谨慎",
      showAdvanced: "显示高级设置（{count} 项）",
      hideAdvanced: "隐藏高级设置",
      kindInteger: "整数",
      kindNumber: "数字",
      errorNumber: "{label}：请输入有效的{kind}。",
      errorBelow: "{label}：不能小于 {min}。",
      errorAbove: "{label}：不能大于 {max}。",

      group_recallTuning: "召回调优",
      group_surface: "模型上下文",
      group_extraction: "提取模型",
      group_embeddings: "嵌入",
      group_storage: "存储与保留",

      f_extractionEnabled_label: "从新对话中学习",
      f_extractionEnabled_hint:
        "开启后，每个已完成的轮次由提取模型总结进记忆。关闭即停止自动学习 —— gm_record 仍然可用。",
      f_recallEnabled_label: "把记忆放入上下文",
      f_recallEnabled_hint:
        "自动注入的总开关。关闭即完全停止注入 —— gm_search 与 gm_record 仍然可用。",
      f_recallCrossSession_label: "来自其他对话的记忆",
      f_recallCrossSession_hint:
        "自动召回可以触及以往会话的程度：会话开始时一次（默认）、每条消息、或从不 —— 交由 gm_search 工具。已经开始的会话不会再次注入。",
      f_recallSessionHistory_label: "恢复本对话被隐藏的历史",
      f_recallSessionHistory_hint:
        "当下面的历史接管隐藏了本对话较早的轮次时，自动把相关轮次放回来 —— 每一条只放一次，且仅在它仍被隐藏期间。请只与接管一起关闭此处，否则被隐藏的部分将永久丢失。",
      f_recallMaxNodes_label: "每次召回的记忆上限",
      f_recallMaxNodes_hint:
        "一次自动召回最多返回的记忆节点数。数值越大，占用的上下文与 token 越多。",
      f_assistantTools_label: "提供给模型的记忆工具",
      f_assistantTools_hint:
        "助手可见的 gm_* 工具。none 保留自动召回并隐藏全部工具 schema。",
      f_semanticScoreThreshold_label: "最低相似度分数",
      f_semanticScoreThreshold_hint:
        "语义召回的余弦阈值，只有达到或高于该值的候选才会注入。留空则沿用插件默认值（当前构建为 0.70）。",
      f_maintenanceInterval_label: "每 N 轮维护一次",
      f_maintenanceInterval_hint:
        "每完成这么多轮后执行一次图谱维护（PageRank、社区、保留策略）。",
      f_freshTurnCount_label: "原样保留最近轮次",
      f_freshTurnCount_hint:
        "最近 N 轮以原生问答形式保留在模型上下文中；更早的轮次由下面两个改写选项决定。",
      f_contextCompactionEnabled_label: "收起旧历史（有损）",
      f_contextCompactionEnabled_hint:
        "允许 Graph Memory 用召回内容替换较早的模型上下文；模型将不再逐字看到那段历史。只有在学习、召回与“恢复本对话被隐藏的历史”都开启时才可用。",
      f_projectCompletedTurnTools_label: "对模型隐藏工具轨迹",
      f_projectCompletedTurnTools_hint:
        "从模型上下文中移除已完成轮次的工具与推理轨迹，只保留问题与最终回答。被隐藏的轨迹仍留在持久日志中。",
      f_llmProvider_label: "提供方",
      f_llmProvider_hint:
        "提取模型专用的提供方，优先于前台智能体模型。必须与模型一同设置。",
      f_llmModel_label: "模型",
      f_llmModel_hint: "把已完成轮次总结为记忆的模型。必须与提供方一同设置。",
      f_llmReasoningEffort_label: "推理强度",
      f_llmReasoningEffort_hint:
        "提取所用的推理强度。建议 off：提取是后台任务，不需要思维链。",
      f_llmMaxTokens_label: "响应上限",
      f_llmMaxTokens_hint: "可选的提取响应长度上限。留空表示使用提供方默认值。",
      f_baseURL_label: "接口地址",
      f_baseURL_hint: "兼容 OpenAI 的嵌入接口地址。更改后会重新嵌入整个图谱。",
      f_model_label: "模型",
      f_model_hint: "嵌入模型。更改后会重新嵌入整个图谱，并改变已存储的向量空间。",
      f_dimensions_label: "维度",
      f_dimensions_hint: "必须与已存储的向量一致。更改后会重新嵌入整个图谱。",
      f_apiKeyEnv_label: "凭据引用名",
      f_apiKeyEnv_hint:
        "存放嵌入 API 密钥的凭据（或环境变量）名称。密钥本身在凭据页面填写，不在这里。",
      f_dbPath_label: "数据库文件",
      f_dbPath_hint:
        "保存全部记忆的 SQLite 文件。切换后会打开另一个（通常是空的）数据库；原文件不会被改动。",
      f_keep_label: "原始消息保留策略",
      f_keep_hint: "原始问答行的处理方式。all 永久保留；其他模式会进行清理。",
      f_recentTurns_label: "保留最近 N 轮",
      f_recentTurns_hint: "当保留策略为 recent 时：最近 N 轮永不删除，无论时间多久。",
      f_retentionDays_label: "删除 N 天以前的",
      f_retentionDays_hint:
        "当保留策略为 recent 时：删除超过 N 天的原始消息。recent 需要这两个阈值至少有一个不为零。",
      f_batchSize_label: "删除批大小",
      f_batchSize_hint: "一次保留清理删除的行数。数值越小越温和，但需要更多轮次。",
      f_dryRun_label: "仅预演（只报告）",
      f_dryRun_hint:
        "开启后，保留清理只报告将要删除的内容，不实际删除。在信任该策略之前请保持开启。",

      o_assistantTools_none: "none —— 仅自动召回",
      o_assistantTools_search: "search —— 暴露 gm_search",
      o_assistantTools_all: "all —— 另含管理工具",
      o_recallCrossSession_firstTurn: "仅第一条消息 —— 会话开始时读取一次",
      o_recallCrossSession_everyTurn: "每条消息 —— 持续注入",
      o_recallCrossSession_never: "从不 —— 交由 gm_search",
      o_keep_all: "all —— 永不删除原始消息",
      o_keep_referenced: "referenced —— 只删除未被引用的",
      o_keep_recent: "recent —— 删除窗口之外的",

      chainHint: "联动 —— 修改一项，其余保持最优。",
      autoTag: "已自动调整",
      resetHint: "已在配置档案中覆盖 —— 点击恢复默认值。",
      restoreOptimal: "恢复最优设置",
      restoreOptimalHint:
        "应用经验证的组合：开启历史接管、隐藏工具轨迹、其他对话仅在会话开始时读取、恢复本对话被隐藏的历史、保留最近五轮，并限制单次召回规模。",
      chainReason_takeover:
        "历史接管需要学习与召回开启，并且开启“恢复本对话被隐藏的历史”，否则被隐藏的部分无法再回来。",
      chainReason_noTakeover: "没有可用的召回路径时接管会被拒绝，因此已将其关闭。",
      chainReason_budget: "最近 {window} 轮 → 每次召回 {nodes} 条，以保证总量受限。",
      chainReason_firstTurn: "其他对话只读取一次不会累积，因此只做上限约束，不缩小。",
      chainReason_dryRun: "先预演：在明确关闭之前保持仅预演。",
    };

    // ── field catalogue ─────────────────────────────────────────────────────

    /** `assistantTools`, the recall reach and `messageRetention.keep` need translated options. */
    const ASSISTANT_TOOLS = ["none", "search", "all"].map((value) => ({
      value,
      labelKey: `o_assistantTools_${value}`,
    }));
    const RECALL_CROSS_SESSION = ["first-turn", "every-turn", "never"].map((value) => ({
      value,
      labelKey: `o_recallCrossSession_${value === "first-turn"
        ? "firstTurn"
        : value === "every-turn" ? "everyTurn" : "never"}`,
    }));
    const REASONING_EFFORTS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"].map(
      (value) => ({ value }),
    );
    const RETENTION_MODES = ["all", "referenced", "recent"].map((value) => ({
      value,
      labelKey: `o_keep_${value}`,
    }));

    /**
     * One editable field, in render order. `key` is the dictionary stem:
     * `f_<key>_label` and `f_<key>_hint` carry its copy.
     */
    const FIELDS = [
      // Essentials ─────────────────────────────────────────────────────────
      { group: "essentials", key: "extractionEnabled", path: ["extractionEnabled"], kind: "boolean" },
      { group: "essentials", key: "recallEnabled", path: ["recallEnabled"], kind: "boolean" },
      {
        group: "essentials",
        key: "recallCrossSession",
        path: ["recallCrossSession"],
        kind: "select",
        options: RECALL_CROSS_SESSION,
      },
      {
        group: "essentials",
        key: "recallSessionHistory",
        path: ["recallSessionHistory"],
        kind: "boolean",
      },
      { group: "essentials", key: "recallMaxNodes", path: ["recallMaxNodes"], kind: "number", min: 1, step: 1 },
      {
        group: "essentials",
        key: "assistantTools",
        path: ["assistantTools"],
        kind: "select",
        options: ASSISTANT_TOOLS,
      },

      // Advanced · Recall tuning ───────────────────────────────────────────
      {
        group: "recallTuning",
        key: "semanticScoreThreshold",
        path: ["semanticScoreThreshold"],
        kind: "number",
        min: -1,
        max: 1,
        step: 0.01,
      },

      // Advanced · Model surface ───────────────────────────────────────────
      { group: "surface", key: "maintenanceInterval", path: ["maintenanceInterval"], kind: "number", min: 1, step: 1 },
      { group: "surface", key: "freshTurnCount", path: ["freshTurnCount"], kind: "number", min: 1, step: 1 },
      {
        group: "surface",
        key: "contextCompactionEnabled",
        path: ["contextCompactionEnabled"],
        kind: "boolean",
        danger: true,
      },
      {
        group: "surface",
        key: "projectCompletedTurnTools",
        path: ["projectCompletedTurnTools"],
        kind: "boolean",
        danger: true,
      },

      // Advanced · Extraction model ────────────────────────────────────────
      {
        group: "extraction",
        key: "llmProvider",
        path: ["llmProvider"],
        kind: "text",
        placeholder: "e.g. ollama",
      },
      {
        group: "extraction",
        key: "llmModel",
        path: ["llmModel"],
        kind: "text",
        placeholder: "e.g. llama3.1:8b",
      },
      {
        group: "extraction",
        key: "llmReasoningEffort",
        path: ["llmReasoningEffort"],
        kind: "select",
        options: REASONING_EFFORTS,
      },
      { group: "extraction", key: "llmMaxTokens", path: ["llmMaxTokens"], kind: "number", min: 1, step: 1 },

      // Advanced · Embeddings ──────────────────────────────────────────────
      {
        group: "embeddings",
        key: "baseURL",
        path: ["embedding", "baseURL"],
        kind: "text",
        placeholder: "http://127.0.0.1:11434/v1",
      },
      {
        group: "embeddings",
        key: "model",
        path: ["embedding", "model"],
        kind: "text",
        placeholder: "e.g. nomic-embed-text",
      },
      {
        group: "embeddings",
        key: "dimensions",
        path: ["embedding", "dimensions"],
        kind: "number",
        min: 1,
        step: 1,
      },
      {
        group: "embeddings",
        key: "apiKeyEnv",
        path: ["embedding", "apiKeyEnv"],
        kind: "text",
        placeholder: "e.g. GRAPH_MEMORY_EMBEDDING_API_KEY",
      },

      // Advanced · Storage & retention ─────────────────────────────────────
      {
        group: "storage",
        key: "dbPath",
        path: ["dbPath"],
        kind: "text",
        danger: true,
      },
      {
        group: "storage",
        key: "keep",
        path: ["messageRetention", "keep"],
        kind: "select",
        options: RETENTION_MODES,
        danger: true,
      },
      {
        group: "storage",
        key: "recentTurns",
        path: ["messageRetention", "recentTurns"],
        kind: "number",
        min: 0,
        step: 1,
        danger: true,
      },
      {
        group: "storage",
        key: "retentionDays",
        path: ["messageRetention", "retentionDays"],
        kind: "number",
        min: 0,
        step: 1,
        danger: true,
      },
      {
        group: "storage",
        key: "batchSize",
        path: ["messageRetention", "batchSize"],
        kind: "number",
        min: 1,
        step: 1,
        danger: true,
      },
      {
        group: "storage",
        key: "dryRun",
        path: ["messageRetention", "dryRun"],
        kind: "boolean",
      },
    ];

    /** Advanced groups in render order; `essentials` is always visible. */
    const GROUPS = [
      { id: "essentials" },
      { id: "recallTuning" },
      { id: "surface" },
      { id: "extraction" },
      { id: "embeddings" },
      { id: "storage" },
    ];

    const ESSENTIAL_COUNT = FIELDS.filter((field) => field.group === "essentials").length;

    // ── linked settings ─────────────────────────────────────────────────────
    // Editing one field can make a related one unwise: a wider retention window
    // multiplies the per-recall block, a takeover without a recall path hides
    // history nothing can return. Each rule below runs only for the field the
    // user actually touched, and its targets are written in the SAME atomic
    // mutation, so the card never shows a half-applied pair. RECALL_BUDGET and
    // the formula mirror the host's optimalRecallMaxNodes(): one policy, both
    // halves.

    const RECALL_BUDGET = 20;

    function optimalRecallNodes(window) {
      const value = Number(window);
      if (!Number.isFinite(value) || value < 1) return 6;
      return Math.min(6, Math.max(1, Math.round(RECALL_BUDGET / value)));
    }

    function capRecallNodes(value, max) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return max;
      return Math.min(max, Math.max(1, Math.round(parsed)));
    }

    function setPath(root, path, value) {
      const next = Object.assign({}, root);
      let cursor = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        cursor[key] = isPlainObject(cursor[key]) ? Object.assign({}, cursor[key]) : {};
        cursor = cursor[key];
      }
      cursor[path[path.length - 1]] = value;
      return next;
    }

    const LINKS = [
      {
        // Hiding history is only safe when something can put it back. The path
        // back is this conversation's own recall — NOT a per-turn re-read of
        // unrelated conversations, which the reach setting above governs.
        from: ["contextCompactionEnabled"],
        apply(values) {
          if (values.contextCompactionEnabled !== true) return [];
          const ops = [];
          if (values.extractionEnabled !== true) {
            ops.push({ path: ["extractionEnabled"], value: true, reason: "chainReason_takeover" });
          }
          if (values.recallEnabled !== true) {
            ops.push({ path: ["recallEnabled"], value: true, reason: "chainReason_takeover" });
          }
          if (values.recallSessionHistory !== true) {
            ops.push({ path: ["recallSessionHistory"], value: true, reason: "chainReason_takeover" });
          }
          return ops;
        },
      },
      {
        // The host refuses the takeover without a recall path; say so here too.
        from: ["recallEnabled", "extractionEnabled", "recallSessionHistory"],
        apply(values) {
          if (values.recallEnabled === true
            && values.extractionEnabled === true
            && values.recallSessionHistory !== false) return [];
          if (values.contextCompactionEnabled !== true) return [];
          return [{ path: ["contextCompactionEnabled"], value: false, reason: "chainReason_noTakeover" }];
        },
      },
      {
        // Window up, single injection down: the total stays bounded. Only a
        // per-message cross-session reach accumulates per turn, so the budget
        // formula applies there; the other reaches cap the size instead.
        from: ["freshTurnCount", "recallCrossSession"],
        apply(values) {
          if (values.recallCrossSession !== "every-turn") {
            const capped = capRecallNodes(values.recallMaxNodes, 6);
            if (values.recallMaxNodes === capped) return [];
            return [{ path: ["recallMaxNodes"], value: capped, reason: "chainReason_firstTurn" }];
          }
          const next = optimalRecallNodes(values.freshTurnCount);
          if (values.recallMaxNodes === next) return [];
          return [{
            path: ["recallMaxNodes"],
            value: next,
            reason: "chainReason_budget",
            params: { window: values.freshTurnCount, nodes: next },
          }];
        },
      },
      {
        from: ["messageRetention.keep"],
        apply(values) {
          const keep = readPath(values, ["messageRetention", "keep"]);
          if (keep === undefined || keep === "all") return [];
          if (readPath(values, ["messageRetention", "dryRun"]) === true) return [];
          return [{ path: ["messageRetention", "dryRun"], value: true, reason: "chainReason_dryRun" }];
        },
      },
    ];

    /** Chains drawn with a brace; order inside a group is the render order. */
    const CHAIN_GROUPS = [
      ["contextCompactionEnabled", "recallEnabled", "extractionEnabled", "recallSessionHistory"],
      ["freshTurnCount", "recallMaxNodes"],
      ["messageRetention.keep", "messageRetention.dryRun"],
    ];

    /** Field lookup by path key, used to place a chain row in a group. */
    const FIELD_BY_PATH = new Map(FIELDS.map((field) => [pathKey(field.path), field]));
    const GROUP_INDEX = new Map(GROUPS.map((group, index) => [group.id, index]));

    /**
     * Where a chain is drawn: the earliest (least advanced) group any member
     * belongs to. A chain linking an essential field to an advanced one must
     * not hide the essential half behind the advanced toggle.
     */
    function chainOwner(members) {
      let owner;
      let best = Number.MAX_SAFE_INTEGER;
      for (const key of members) {
        const field = FIELD_BY_PATH.get(key);
        if (field === undefined) continue;
        const index = GROUP_INDEX.get(field.group);
        if (index !== undefined && index < best) {
          best = index;
          owner = field.group;
        }
      }
      return owner;
    }

    /**
     * Resolve the chain reachable from `changedKey`, applying each rule to a
     * working copy so later rules see earlier results. Bounded so a future rule
     * cycle cannot loop the card.
     */
    function linkedOps(values, changedKey, skipKeys) {
      let working = values;
      const emitted = [];
      const seen = new Set(skipKeys);
      let queue = [changedKey];
      let guard = 0;
      while (queue.length && guard < 8) {
        guard += 1;
        const nextQueue = [];
        for (const key of queue) {
          for (const rule of LINKS) {
            if (!rule.from.includes(key)) continue;
            for (const op of rule.apply(working)) {
              const target = pathKey(op.path);
              if (seen.has(target)) continue;
              seen.add(target);
              working = setPath(working, op.path, op.value);
              emitted.push(op);
              nextQueue.push(target);
            }
          }
        }
        queue = nextQueue;
      }
      return emitted;
    }

    /** The validated combination, mirroring the host's optimalSettingsPatch(). */
    function optimalValues() {
      return {
        extractionEnabled: true,
        recallEnabled: true,
        contextCompactionEnabled: true,
        projectCompletedTurnTools: true,
        recallCrossSession: "first-turn",
        recallSessionHistory: true,
        freshTurnCount: 5,
        recallMaxNodes: optimalRecallNodes(5),
        assistantTools: "all",
      };
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    function isPlainObject(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function readPath(root, path) {
      let current = root;
      for (const key of path) {
        if (!isPlainObject(current)) return undefined;
        current = current[key];
      }
      return current;
    }

    function hasPath(root, path) {
      let current = root;
      for (const key of path) {
        if (!isPlainObject(current) || !(key in current)) return false;
        current = current[key];
      }
      return true;
    }

    function pathKey(path) {
      return path.join(".");
    }

    function clearField(scope, path) {
      return path.length === 1
        ? scope.unset(path[0])
        : scope.mutate([{ op: "unset", path }]);
    }

    /** Mirror the namespace scope into render state. */
    function useScopeSnapshot(scope) {
      const [snapshot, setSnapshot] = React.useState(() => scope.getSnapshot());
      React.useEffect(() => {
        setSnapshot(scope.getSnapshot());
        return scope.subscribe(() => { setSnapshot(scope.getSnapshot()); });
      }, [scope]);
      return snapshot;
    }

    // ── presentation ────────────────────────────────────────────────────────

    const styles = {
      subtitle: { fontSize: "12px", opacity: 0.72, lineHeight: 1.4 },
      pageBody: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      },
      description: { margin: 0, fontSize: "12px", opacity: 0.72, lineHeight: 1.45 },
      notice: {
        border: "1px solid rgba(214,158,46,0.45)",
        background: "rgba(214,158,46,0.12)",
        borderRadius: "8px",
        padding: "8px 10px",
        fontSize: "12px",
        lineHeight: 1.45,
      },
      noticeSaved: {
        border: "1px solid rgba(214,158,46,0.7)",
        background: "rgba(214,158,46,0.22)",
        borderRadius: "8px",
        padding: "8px 10px",
        fontSize: "12px",
        lineHeight: 1.45,
      },
      error: {
        border: "1px solid rgba(220,76,76,0.55)",
        background: "rgba(220,76,76,0.14)",
        borderRadius: "8px",
        padding: "8px 10px",
        fontSize: "12px",
        lineHeight: 1.45,
      },
      groupTitle: {
        margin: "6px 0 2px",
        fontSize: "12px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        opacity: 0.65,
      },
      // One wrapping header: the label takes what it needs and a chip that no
      // longer fits drops to the next line inside the box instead of pushing
      // past its border. A four-across chain box is ~190px wide, so this is the
      // normal case, not the exception.
      header: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" },
      label: {
        flex: "1 1 120px",
        fontSize: "12.5px",
        fontWeight: 600,
        lineHeight: 1.35,
        overflowWrap: "anywhere",
      },
      hint: { fontSize: "11.5px", opacity: 0.66, lineHeight: 1.4 },
      dangerTag: {
        fontSize: "10.5px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        border: "1px solid rgba(220,76,76,0.6)",
        color: "rgb(220,76,76)",
        borderRadius: "999px",
        padding: "1px 6px",
      },
      reset: {
        marginLeft: "auto",
        fontSize: "11.5px",
        background: "none",
        border: "1px solid var(--dsh-border, rgba(127,127,127,0.35))",
        borderRadius: "6px",
        padding: "2px 8px",
        cursor: "pointer",
        color: "inherit",
      },
      input: {
        width: "100%",
        boxSizing: "border-box",
        fontSize: "12.5px",
        padding: "5px 8px",
        borderRadius: "6px",
        border: "1px solid var(--dsh-border, rgba(127,127,127,0.35))",
        background: "var(--dsh-input-bg, rgba(127,127,127,0.06))",
        color: "inherit",
      },
      checkboxRow: { display: "flex", alignItems: "center", gap: "8px" },
      advancedToggle: {
        alignSelf: "flex-start",
        fontSize: "12.5px",
        background: "none",
        border: "1px solid var(--dsh-border, rgba(127,127,127,0.35))",
        borderRadius: "6px",
        padding: "4px 10px",
        cursor: "pointer",
        color: "inherit",
      },
      rows: { display: "flex", flexDirection: "column", gap: "10px" },
      // One chain row: member boxes joined by drawn chain segments.
      row: { display: "flex", flexDirection: "row", alignItems: "stretch", flexWrap: "wrap" },
      chainBlock: { display: "flex", flexDirection: "column", gap: "3px" },
      chainNoteRow: { display: "flex", alignItems: "flex-start", gap: "6px" },
      node: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flex: "1 1 190px",
        minWidth: "175px",
        maxWidth: "460px",
        padding: "9px 11px",
        border: "1px solid var(--dsh-border, rgba(127,127,127,0.35))",
        borderRadius: "10px",
        background: "rgba(127,127,127,0.05)",
        boxSizing: "border-box",
      },
      nodeSingle: { flex: "1 1 100%", maxWidth: "none" },
      linkCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "32px",
        padding: "0 2px",
      },
      chainNote: { fontSize: "11px", opacity: 0.6, lineHeight: 1.4 },
      autoTag: {
        fontSize: "10.5px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        border: "1px solid rgba(70,150,220,0.6)",
        color: "rgb(70,150,220)",
        borderRadius: "999px",
        padding: "1px 6px",
      },
      autoNote: { fontSize: "11px", color: "rgb(70,150,220)", opacity: 0.9, lineHeight: 1.4 },
      restoreRow: { display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" },
    };

    function fieldControlId(path) {
      return `gm-config-${pathKey(path).replace(/\./g, "-")}`;
    }

    /** One setting inside its own box: label, control, hint, override and adjustment marks. */
    function FieldRow(props) {
      const { field, value, overridden, disabled, draft, variant, adjusted, onDraft, onCommit, onReset, t } = props;
      const id = fieldControlId(field.path);
      const label = t(`f_${field.key}_label`);
      const hint = t(`f_${field.key}_hint`);
      const raw = readPath(value, field.path);
      const common = {
        id,
        disabled,
        style: styles.input,
        "aria-label": label,
        title: hint,
      };

      let control;
      if (field.kind === "boolean") {
        control = h("input", {
          id,
          type: "checkbox",
          disabled,
          checked: raw === true,
          "aria-label": label,
          title: hint,
          onChange: (event) => { onCommit(field.path, event.target.checked); },
        });
      } else if (field.kind === "select") {
        control = h(
          "select",
          Object.assign({}, common, {
            value: raw === undefined ? "" : String(raw),
            onChange: (event) => { onCommit(field.path, event.target.value); },
          }),
          field.options.map((option) => h(
            "option",
            { key: option.value, value: option.value },
            option.labelKey === undefined ? option.value : t(option.labelKey),
          )),
        );
      } else {
        const text = draft !== undefined ? draft : raw === undefined || raw === null ? "" : String(raw);
        control = h("input", Object.assign({}, common, {
          type: "text",
          inputMode: field.kind === "number" ? "decimal" : "text",
          placeholder: field.placeholder,
          value: text,
          onChange: (event) => { onDraft(pathKey(field.path), event.target.value); },
          onBlur: () => { onCommit(field.path, text); },
          onKeyDown: (event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") { onDraft(pathKey(field.path), undefined); event.currentTarget.blur(); }
          },
        }));
      }

      // Chips: only what the drawing cannot say. The chain segments between the
      // boxes already show which fields are linked, so a per-field "linked"
      // pill would be noise; the "overridden" word is implied by the Reset
      // button, which exists only for an overridden field.
      const meta = [];
      if (field.danger) {
        meta.push(h("span", { key: "caution", style: styles.dangerTag, "data-gm-chip": "" }, t("caution")));
      }
      if (adjusted === true) {
        meta.push(h("span", { key: "adjusted", style: styles.autoTag, "data-gm-chip": "" }, t("autoTag")));
      }
      if (overridden) {
        meta.push(h("button", {
          key: "reset",
          type: "button",
          style: styles.reset,
          disabled,
          title: t("resetHint"),
          "data-gm-chip": "",
          onClick: () => { onReset(field.path); },
        }, t("reset")));
      }

      return h(
        "div",
        {
          style: variant === "chain" ? styles.node : Object.assign({}, styles.node, styles.nodeSingle),
          "data-gm-field": pathKey(field.path),
          "data-gm-chain": variant === "chain" ? "1" : "0",
        },
        h("div", { style: styles.header }, [h("label", { key: "label", htmlFor: id, style: styles.label, "data-gm-label": "" }, label)].concat(meta)),
        field.kind === "boolean" ? h("div", { style: styles.checkboxRow }, control) : control,
        h("span", { style: styles.hint }, hint),
      );
    }

    /** The drawn segment between two linked settings; lit when it just pulled a value. */
    function chainSvg(width, color, opacity) {
      const count = Math.floor((width - 3) / 13);
      return h(
        "svg",
        { width, height: 16, viewBox: `0 0 ${width} 16`, focusable: "false", style: { opacity } },
        Array.from({ length: count }, (_unused, index) => h("rect", {
          key: index,
          x: index * 13,
          y: 3.5,
          width: 16,
          height: 9,
          rx: 4.5,
          fill: "none",
          stroke: color,
          strokeWidth: 1.2,
        })),
      );
    }

    /** Standalone chain mark standing before a chain's caption. */
    function ChainMark(props) {
      return h(
        "span",
        { style: { display: "flex", alignItems: "center", flex: "0 0 auto" }, "aria-hidden": "true" },
        chainSvg(30, "currentColor", 0.65),
      );
    }

    /** One drawn chain segment between two linked settings; lit when it just pulled a value. */
    function ChainLink(props) {
      const active = props.active === true;
      const color = active ? "rgb(70,150,220)" : "currentColor";
      return h(
        "div",
        {
          style: Object.assign({}, styles.linkCell, { color, opacity: active ? 0.95 : 0.5 }),
          title: props.t("chainHint"),
          "data-gm-link": active ? "active" : "idle",
        },
        chainSvg(42, color, 1),
      );
    }

    /** The Graph Memory settings card: one-liner for the card list, form for its page. */
    function GraphMemoryCard(props) {
      const scope = props.scope;
      const t = props.t !== undefined ? props.t : (key) => key;
      const snapshot = useScopeSnapshot(scope);
      const [drafts, setDrafts] = React.useState({});
      const [saved, setSaved] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [advanced, setAdvanced] = React.useState(false);
      // Fields the chain just changed, keyed by path → the reason to show.
      const [adjustments, setAdjustments] = React.useState({});

      // The Plugins page draws the card's title, icon, and crumb itself and
      // asks the entry for the one-liner beside the title, then for the body.
      if (props.view === "summary") return h("span", null, t("subtitle"));
      if (snapshot.status === "unavailable") return null;
      const value = snapshot.value;
      const ready = snapshot.status === "ready" && isPlainObject(value);
      const user = ready && isPlainObject(snapshot.user) ? snapshot.user : {};
      const disabled = snapshot.writable === false;

      function commit(path, next) {
        const field = FIELDS.find((entry) => pathKey(entry.path) === pathKey(path));
        let payload = next;
        if (field !== undefined && field.kind === "number") {
          const label = t(`f_${field.key}_label`);
          if (next === "") {
            payload = undefined;
          } else {
            const parsed = Number(next);
            const integer = field.step === 1;
            const kind = t(integer ? "kindInteger" : "kindNumber");
            if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
              setError(t("errorNumber", { label, kind }));
              return;
            }
            if (field.min !== undefined && parsed < field.min) {
              setError(t("errorBelow", { label, min: field.min }));
              return;
            }
            if (field.max !== undefined && parsed > field.max) {
              setError(t("errorAbove", { label, max: field.max }));
              return;
            }
            payload = parsed;
          }
        }
        setError(null);

        // One atomic mutation: the touched field plus everything its chain
        // adjusts. Writing them together keeps the stored pair consistent and
        // shares a single revision fence.
        const changedKey = pathKey(path);
        const staged = payload === undefined
          ? (isPlainObject(value) ? value : {})
          : setPath(isPlainObject(value) ? value : {}, path, payload);
        const linked = payload === undefined ? [] : linkedOps(staged, changedKey, [changedKey]);
        const ops = [];
        ops.push(payload === undefined ? { op: "unset", path } : { op: "set", path, value: payload });
        for (const op of linked) ops.push({ op: "set", path: op.path, value: op.value });

        const nextAdjustments = Object.assign({}, adjustments);
        delete nextAdjustments[changedKey];
        for (const op of linked) {
          nextAdjustments[pathKey(op.path)] = { reason: op.reason, params: op.params };
        }
        setAdjustments(nextAdjustments);

        Promise.resolve(scope.mutate(ops)).then(
          () => {
            setSaved(true);
            setDrafts((current) => {
              const nextDrafts = Object.assign({}, current);
              delete nextDrafts[changedKey];
              return nextDrafts;
            });
          },
          (reason) => { setError(reason && reason.message ? reason.message : String(reason)); },
        );
      }

      function reset(path) {
        setError(null);
        const nextAdjustments = Object.assign({}, adjustments);
        delete nextAdjustments[pathKey(path)];
        setAdjustments(nextAdjustments);
        Promise.resolve(clearField(scope, path)).then(
          () => { setSaved(true); },
          (reason) => { setError(reason && reason.message ? reason.message : String(reason)); },
        );
      }

      /** Put the whole validated combination back in one write. */
      function restoreOptimal() {
        setError(null);
        const ops = Object.entries(optimalValues()).map(([key, next]) => ({
          op: "set",
          path: [key],
          value: next,
        }));
        setAdjustments({});
        setDrafts({});
        Promise.resolve(scope.mutate(ops)).then(
          () => { setSaved(true); },
          (reason) => { setError(reason && reason.message ? reason.message : String(reason)); },
        );
      }

      /** Render one setting box; `variant` decides its width inside a row. */
      function renderField(field, variant) {
        const key = pathKey(field.path);
        const adjustment = adjustments[key];
        return h(FieldRow, {
          key,
          field,
          value,
          overridden: hasPath(user, field.path),
          disabled,
          draft: drafts[key],
          variant,
          adjusted: adjustment !== undefined,
          onDraft: (draftKey, text) => { setDrafts((current) => Object.assign({}, current, { [draftKey]: text })); },
          onCommit: commit,
          onReset: reset,
          t,
        });
      }

      // Rows are drawn per group: a chain goes to the earliest group any of its
      // members belongs to, so an essential field linked to an advanced one is
      // never hidden behind the advanced toggle. A member claimed by a chain
      // row is not drawn a second time on its own.
      const rows = [];
      const consumed = new Set();
      for (const group of ready ? GROUPS : []) {
        if (group.id !== "essentials" && !advanced) continue;
        const groupFields = FIELDS.filter((field) => field.group === group.id);
        const chains = CHAIN_GROUPS
          .map((members) => members.filter((key) => FIELD_BY_PATH.has(key)))
          .filter((members) => members.length > 1 && chainOwner(members) === group.id);

        const items = [];
        for (const field of groupFields) {
          const key = pathKey(field.path);
          if (consumed.has(key)) continue;
          const chain = chains.find((members) => members.includes(key));
          if (chain === undefined) {
            consumed.add(key);
            items.push({ kind: "single", key, field });
            continue;
          }
          for (const member of chain) consumed.add(member);
          items.push({ kind: "chain", key: `chain:${chain.join("+")}`, members: chain });
        }
        if (items.length === 0) continue;

        if (group.id !== "essentials") {
          rows.push(h("p", { key: `t-${group.id}`, style: styles.groupTitle }, t(`group_${group.id}`)));
        }
        for (const item of items) {
          if (item.kind === "single") {
            rows.push(renderField(item.field, "single"));
            continue;
          }
          const members = item.members
            .map((key) => FIELD_BY_PATH.get(key))
            .filter((field) => field !== undefined);
          const notes = members
            .map((field) => adjustments[pathKey(field.path)])
            .filter((adjustment) => adjustment !== undefined)
            .map((adjustment) => t(adjustment.reason, adjustment.params || {}));
          const parts = [];
          members.forEach((field, index) => {
            if (index > 0) {
              const lit = [members[index - 1], field]
                .some((entry) => adjustments[pathKey(entry.path)] !== undefined);
              parts.push(h(ChainLink, { key: `link:${index}`, active: lit, t }));
            }
            parts.push(renderField(field, "chain"));
          });
          rows.push(h(
            "div",
            { key: item.key, style: styles.chainBlock },
            h("div", { style: styles.row }, parts),
            h(
              "div",
              { style: styles.chainNoteRow, "data-gm-chain-note": item.key },
              h(ChainMark, {}),
              h("span", { style: notes.length > 0 ? styles.autoNote : styles.chainNote }, notes.length > 0
                ? notes.join(" ")
                : t("chainHint")),
            ),
          ));
        }
      }

      const body = ready
        ? [
          h("p", { key: "description", style: styles.description }, t("description")),
          h("div", { key: "notice", style: saved ? styles.noticeSaved : styles.notice }, t(saved ? "restartSaved" : "restartStatic")),
          error ? h("div", { key: "error", style: styles.error }, error) : null,
          h("div", { key: "restore", style: styles.restoreRow }, [
            h("button", {
              key: "restore-button",
              type: "button",
              style: styles.advancedToggle,
              disabled,
              title: t("restoreOptimalHint"),
              onClick: restoreOptimal,
            }, t("restoreOptimal")),
            h("span", { key: "restore-hint", style: styles.hint }, t("restoreOptimalHint")),
          ]),
          h("button", {
            key: "advanced",
            type: "button",
            style: styles.advancedToggle,
            "aria-expanded": advanced,
            onClick: () => { setAdvanced(!advanced); },
          }, advanced ? t("hideAdvanced") : t("showAdvanced", { count: FIELDS.length - ESSENTIAL_COUNT })),
          h("div", { key: "rows", style: styles.rows }, rows),
        ]
        : h("span", { style: styles.hint }, t("loading"));

      return h("div", { style: styles.pageBody }, body);
    }

    // ── plugin entry ────────────────────────────────────────────────────────

    const inject = ["slots", "configForms", "locale"];

    /**
     * Package the Host keys a bundle's own configuration by: the bundle whose
     * page the Plugins list opens. It is the installed package name, not the
     * settings namespace. `plugins.item` is reserved for the official settings
     * pages, so a Community bundle's configuration belongs here instead.
     */
    const BUNDLE_PACKAGE = "graph-memory";

    /** Register the dictionaries and the bundle's configuration section. */
    function apply(ctx) {
      const locale = ctx.locale;
      if (locale !== undefined && typeof locale.register === "function") {
        ctx.effect(() => locale.register(NS, { zh, en }), "graph-memory: settings dictionaries");
      }
      const scope = ctx.configForms.get(NS);
      // The card is the configuration of the `graph-memory` bundle: it
      // registers into `plugins.bundle.config` under that package name and the
      // Plugins list renders it on the bundle's own page, opened from the
      // bundle's card. Gating on the Host serving the namespace keeps an
      // unserved entry from showing an empty section. The page supplies no
      // `form` for a bundle, so the card keeps its own scope.
      return ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
        name: "plugins.bundle.config",
        key: BUNDLE_PACKAGE,
        locale: NS,
        inject: () => ({ scope }),
      }, GraphMemoryCard))), "graph-memory: bundle configuration");
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    // Internal test seam: the linkage policy is exercised headlessly by
    // test/dsh-settings-card.test.ts. Not part of the plugin API.
    module.exports.__chainPolicy = {
      CHAIN_GROUPS,
      optimalRecallNodes,
      optimalValues,
      linkedOps,
    };
    return module.exports;
  },
});

/**
 * Browser half of Graph Memory — the plugin's settings card.
 *
 * Hand-written factory-form module (the same shape `graph-memory-pro-dsh`
 * uses): no bundler, no JSX, no build step. The card registers into
 * `settings.plugin.item` under the `graph-memory` settings namespace, which is
 * the key the configurable-plugins tab dispatches on, and declares that
 * namespace on the locale service so the framework hands it a `t` seat and
 * re-renders on a language switch.
 *
 * The `__ModuleLoader__` id is this package's own name: the client module
 * system requires each bundle to register the package whose Loader row owns
 * it, and reports a bundle that registers anything else as a duplicate
 * factory.
 *
 * Every field is read once when the Host plugin starts, so the card tells the
 * user that changes apply on the next `dsh web` start; the Host namespace
 * declares `applies: "restart"`.
 *
 * The card reads and writes through `ctx.settingsScope`, which owns revision
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
      description:
        "What the memory layer learns, recalls, and keeps. Values live in the profile's settings document; cordis.patch.yml stays the base layer.",
      subtitle: "Learning, recall, and retention settings.",
      restartTag: "restart needed",
      restartStatic: "Stored immediately — applied on the next dsh web start.",
      restartSaved: "Saved. Restart dsh web to apply.",
      loading: "Loading Graph Memory settings…",
      overridden: "overridden",
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
      f_recallEnabled_label: "Recall memories automatically",
      f_recallEnabled_hint:
        "When on, relevant memories from earlier sessions are injected before every message. Turn off to stop injection — gm_search still works.",
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
      f_contextCompactionEnabled_label: "Allow history takeover (lossy)",
      f_contextCompactionEnabled_hint:
        "Lets Graph Memory replace the older model-surface history with recalled material; the model never sees that history again. Refused while recall or learning is off.",
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
      o_keep_all: "all — never delete raw messages",
      o_keep_referenced: "referenced — delete unreferenced only",
      o_keep_recent: "recent — delete outside the window",
    };

    const zh = {
      description:
        "记忆层学习什么、召回什么、保留什么。取值保存在配置档案的设置文档中；cordis.patch.yml 仍作为基础层。",
      subtitle: "学习、召回与保留设置。",
      restartTag: "需要重启",
      restartStatic: "立即保存 —— 下次启动 dsh web 时生效。",
      restartSaved: "已保存。重启 dsh web 后生效。",
      loading: "正在载入 Graph Memory 设置…",
      overridden: "已覆盖",
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
      f_recallEnabled_label: "自动召回记忆",
      f_recallEnabled_hint:
        "开启后，来自以往会话的相关记忆会在每条消息前注入。关闭即停止注入 —— gm_search 仍然可用。",
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
      f_contextCompactionEnabled_label: "允许接管历史（有损）",
      f_contextCompactionEnabled_hint:
        "允许 Graph Memory 用召回内容替换较早的模型上下文；模型将不再看到那段历史。召回或学习关闭时会被拒绝。",
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
      o_keep_all: "all —— 永不删除原始消息",
      o_keep_referenced: "referenced —— 只删除未被引用的",
      o_keep_recent: "recent —— 删除窗口之外的",
    };

    // ── field catalogue ─────────────────────────────────────────────────────

    /** `assistantTools` and `messageRetention.keep` need translated options. */
    const ASSISTANT_TOOLS = ["none", "search", "all"].map((value) => ({
      value,
      labelKey: `o_assistantTools_${value}`,
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

    function writeField(scope, path, value) {
      return path.length === 1
        ? scope.set(path[0], value)
        : scope.mutate([{ op: "set", path, value }]);
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
      card: {
        listStyle: "none",
        border: "1px solid var(--dsh-border, rgba(127,127,127,0.25))",
        borderRadius: "10px",
        margin: "0 0 12px",
        overflow: "hidden",
      },
      header: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        boxSizing: "border-box",
        textAlign: "left",
        padding: "12px 14px",
        background: "none",
        border: "none",
        color: "inherit",
        font: "inherit",
        cursor: "pointer",
      },
      headText: { display: "flex", flexDirection: "column", gap: "2px", flex: 1 },
      title: { fontSize: "14px", fontWeight: 600 },
      subtitle: { fontSize: "12px", opacity: 0.72, lineHeight: 1.4 },
      chevron: { fontSize: "12px", opacity: 0.7 },
      body: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "0 14px 14px",
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
      field: { display: "flex", flexDirection: "column", gap: "3px" },
      labelRow: { display: "flex", alignItems: "center", gap: "8px" },
      label: { fontSize: "13px", fontWeight: 500 },
      hint: { fontSize: "11.5px", opacity: 0.66, lineHeight: 1.4 },
      tag: {
        fontSize: "10.5px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        opacity: 0.7,
        border: "1px solid currentColor",
        borderRadius: "999px",
        padding: "1px 6px",
      },
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
    };

    function fieldControlId(path) {
      return `gm-config-${pathKey(path).replace(/\./g, "-")}`;
    }

    /** One editable row: label, control, hint, and the override marker. */
    function FieldRow(props) {
      const { field, value, overridden, disabled, draft, onDraft, onCommit, onReset, t } = props;
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

      return h(
        "div",
        { style: styles.field },
        h(
          "div",
          { style: styles.labelRow },
          h("label", { htmlFor: id, style: styles.label }, label),
          field.danger ? h("span", { style: styles.dangerTag }, t("caution")) : null,
          overridden ? h("span", { style: styles.tag }, t("overridden")) : null,
          overridden
            ? h("button", { type: "button", style: styles.reset, disabled, onClick: () => { onReset(field.path); } }, t("reset"))
            : null,
        ),
        field.kind === "boolean" ? h("div", { style: styles.checkboxRow }, control) : control,
        h("span", { style: styles.hint }, hint),
      );
    }

    /** The Graph Memory settings card. */
    function GraphMemoryCard(props) {
      const scope = props.scope;
      const t = props.t !== undefined ? props.t : (key) => key;
      const snapshot = useScopeSnapshot(scope);
      const [drafts, setDrafts] = React.useState({});
      const [saved, setSaved] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [advanced, setAdvanced] = React.useState(false);
      const [open, setOpen] = React.useState(false);

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
        const request = payload === undefined ? clearField(scope, path) : writeField(scope, path, payload);
        Promise.resolve(request).then(
          () => {
            setSaved(true);
            setDrafts((current) => {
              const nextDrafts = Object.assign({}, current);
              delete nextDrafts[pathKey(path)];
              return nextDrafts;
            });
          },
          (reason) => { setError(reason && reason.message ? reason.message : String(reason)); },
        );
      }

      function reset(path) {
        setError(null);
        Promise.resolve(clearField(scope, path)).then(
          () => { setSaved(true); },
          (reason) => { setError(reason && reason.message ? reason.message : String(reason)); },
        );
      }

      const rows = [];
      for (const group of ready ? GROUPS : []) {
        const fields = FIELDS.filter((field) => field.group === group.id);
        if (fields.length === 0) continue;
        if (group.id !== "essentials" && !advanced) continue;
        if (group.id !== "essentials") {
          rows.push(h("p", { key: `t-${group.id}`, style: styles.groupTitle }, t(`group_${group.id}`)));
        }
        for (const field of fields) {
          rows.push(h(FieldRow, {
            key: pathKey(field.path),
            field,
            value,
            overridden: hasPath(user, field.path),
            disabled,
            draft: drafts[pathKey(field.path)],
            onDraft: (key, text) => { setDrafts((current) => Object.assign({}, current, { [key]: text })); },
            onCommit: commit,
            onReset: reset,
            t,
          }));
        }
      }

      const body = ready
        ? [
          h("p", { key: "description", style: styles.description }, t("description")),
          h("div", { key: "notice", style: saved ? styles.noticeSaved : styles.notice }, t(saved ? "restartSaved" : "restartStatic")),
          error ? h("div", { key: "error", style: styles.error }, error) : null,
          h("button", {
            key: "advanced",
            type: "button",
            style: styles.advancedToggle,
            "aria-expanded": advanced,
            onClick: () => { setAdvanced(!advanced); },
          }, advanced ? t("hideAdvanced") : t("showAdvanced", { count: FIELDS.length - ESSENTIAL_COUNT })),
          ...rows,
        ]
        : h("span", { style: styles.hint }, t("loading"));

      return h(
        "li",
        { style: styles.card },
        h("button", {
          type: "button",
          style: styles.header,
          "aria-expanded": open,
          "aria-label": `Graph Memory: ${open ? "collapse" : "expand"}`,
          onClick: () => { setOpen(!open); },
        },
          h("span", { style: styles.headText },
            h("span", { style: styles.title }, "Graph Memory"),
            h("span", { style: styles.subtitle }, t("subtitle")),
          ),
          saved ? h("span", { style: styles.tag }, t("restartTag")) : null,
          h("span", { style: styles.chevron, "aria-hidden": true }, open ? "▾" : "▸"),
        ),
        open ? h("div", { style: styles.body }, body) : null,
      );
    }

    // ── plugin entry ────────────────────────────────────────────────────────

    const inject = ["slots", "settingsScope", "locale"];

    /** Register the dictionaries and the settings card. */
    function apply(ctx) {
      const locale = ctx.locale;
      if (locale !== undefined && typeof locale.register === "function") {
        ctx.effect(() => locale.register(NS, { zh, en }), "graph-memory: settings dictionaries");
      }
      const scope = ctx.settingsScope.bind({ namespace: NS });
      return ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        key: NS,
        locale: NS,
        inject: () => ({ scope }),
      }, GraphMemoryCard));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});

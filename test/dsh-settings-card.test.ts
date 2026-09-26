import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

interface LinkOp {
  path: string[];
  value: unknown;
  reason: string;
  params?: Record<string, unknown>;
}

interface ChainVisual {
  state: "active" | "linked" | "broken";
  color: string;
  opacity: number;
  glow: boolean;
  dashed: boolean;
}

interface ChainPolicy {
  BROKEN_CHAINS_KEY: string;
  CHAIN_BLUE: string;
  CHAIN_GROUPS: string[][];
  chainKeyOf(index: number): string;
  chainVisual(active: boolean, broken: boolean): ChainVisual;
  optimalRecallNodes(window: number): number;
  optimalValues(): Record<string, unknown>;
  linkedOps(
    values: Record<string, unknown>,
    changedKey: string,
    skip: string[],
    brokenChains?: string[],
  ): LinkOp[];
  readBrokenChains(): Set<string>;
  writeBrokenChains(broken: Set<string>): void;
}

/** Load the browser half the way the module loader does, without a browser. */
function loadChainPolicy(storage?: Record<string, string>): ChainPolicy {
  let loaded: { id: string; factory: (require: (id: string) => unknown) => any } | undefined;
  const sandbox: Record<string, unknown> = {
    window: { __ModuleLoader__: { load: (entry: any) => { loaded = entry; } } },
  };
  if (storage !== undefined) {
    sandbox.localStorage = {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: (key: string, value: string) => { storage[key] = value; },
    };
  }
  runInNewContext(readFileSync(new URL("../dsh-ui/client.js", import.meta.url), "utf8"), sandbox);
  expect(loaded?.id).toBe("graph-memory-ui-dsh");
  const react = {
    createElement: (...args: unknown[]) => ({ args }),
    useState: (initial: unknown) => [initial, () => {}],
    useEffect: () => {},
  };
  const plugin = loaded!.factory((id) => {
    if (id === "react") return react;
    throw new Error(`unexpected client external ${id}`);
  });
  return plugin.__chainPolicy;
}

describe("settings card chain policy", () => {
  const policy = loadChainPolicy();

  it("shrinks the recall size as the window grows, matching the host", () => {
    expect([5, 8, 12, 2].map((window) => policy.optimalRecallNodes(window))).toEqual([4, 3, 2, 6]);
  });

  it("restores the same combination the host applies", () => {
    expect(policy.optimalValues()).toEqual({
      extractionEnabled: true,
      recallEnabled: true,
      contextCompactionEnabled: true,
      projectCompletedTurnTools: true,
      recallCrossSession: "first-turn",
      recallSessionHistory: true,
      freshTurnCount: 5,
      recallMaxNodes: 4,
      assistantTools: "all",
    });
  });

  it("turning the takeover on brings the recall path with it", () => {
    const ops = policy.linkedOps(
      {
        contextCompactionEnabled: true,
        extractionEnabled: false,
        recallEnabled: false,
        recallCrossSession: "first-turn",
        recallSessionHistory: false,
        freshTurnCount: 5,
        recallMaxNodes: 4,
      },
      "contextCompactionEnabled",
      ["contextCompactionEnabled"],
    );
    expect(ops.map((op) => op.path.join("."))).toEqual([
      "extractionEnabled",
      "recallEnabled",
      "recallSessionHistory",
    ]);
    expect(ops.every((op) => op.reason === "chainReason_takeover")).toBe(true);
  });

  it("keeps cross-session reach out of the takeover chain", () => {
    // Reading other conversations at session start is compatible with the
    // takeover: the path that restores hidden history is the session's own
    // recall, not a per-turn re-read of unrelated conversations.
    const ops = policy.linkedOps(
      {
        contextCompactionEnabled: true,
        extractionEnabled: true,
        recallEnabled: true,
        recallCrossSession: "first-turn",
        recallSessionHistory: true,
        freshTurnCount: 5,
        recallMaxNodes: 4,
      },
      "contextCompactionEnabled",
      ["contextCompactionEnabled"],
    );
    expect(ops).toEqual([]);
  });

  it("switching recall off switches the takeover off instead of hiding history", () => {
    const ops = policy.linkedOps(
      {
        contextCompactionEnabled: true,
        recallEnabled: false,
        extractionEnabled: true,
        recallCrossSession: "first-turn",
        recallSessionHistory: true,
        freshTurnCount: 5,
        recallMaxNodes: 4,
      },
      "recallEnabled",
      ["recallEnabled"],
    );
    expect(ops).toEqual([
      { path: ["contextCompactionEnabled"], value: false, reason: "chainReason_noTakeover" },
    ]);
  });

  it("switching the hidden-history restore off switches the takeover off", () => {
    const ops = policy.linkedOps(
      {
        contextCompactionEnabled: true,
        recallEnabled: true,
        extractionEnabled: true,
        recallCrossSession: "every-turn",
        recallSessionHistory: false,
        freshTurnCount: 5,
        recallMaxNodes: 4,
      },
      "recallSessionHistory",
      ["recallSessionHistory"],
    );
    expect(ops).toEqual([
      { path: ["contextCompactionEnabled"], value: false, reason: "chainReason_noTakeover" },
    ]);
  });

  it("a wider window tightens the per-recall size", () => {
    const ops = policy.linkedOps(
      { freshTurnCount: 8, recallCrossSession: "every-turn", recallMaxNodes: 6 },
      "freshTurnCount",
      ["freshTurnCount"],
    );
    expect(ops).toEqual([{
      path: ["recallMaxNodes"],
      value: 3,
      reason: "chainReason_budget",
      params: { window: 8, nodes: 3 },
    }]);
  });

  it("applies the same budget under every cross-session reach", () => {
    // The window counts the snapshots that stay live, not how often a new one
    // arrives: a bounded reach shrinks the injection exactly like a per-message
    // one, because the total is bounded in both cases.
    const forReach = (reach: string) => policy.linkedOps(
      { freshTurnCount: 12, recallCrossSession: reach, recallMaxNodes: 4 },
      "freshTurnCount",
      ["freshTurnCount"],
    );
    const expected = [{
      path: ["recallMaxNodes"],
      value: 2,
      reason: "chainReason_budget",
      params: { window: 12, nodes: 2 },
    }];
    expect(forReach("first-turn")).toEqual(expected);
    expect(forReach("every-turn")).toEqual(expected);
  });

  it("runs no rule of a chain the user broke", () => {
    const key = policy.chainKeyOf(1);
    expect(key).toBe("freshTurnCount+recallMaxNodes");
    expect(policy.linkedOps(
      { freshTurnCount: 12, recallCrossSession: "first-turn", recallMaxNodes: 4 },
      "freshTurnCount",
      ["freshTurnCount"],
      [key],
    )).toEqual([]);
    // A break is per chain: the other chains keep working.
    expect(policy.linkedOps(
      { messageRetention: { keep: "recent", dryRun: false } },
      "messageRetention.keep",
      ["messageRetention.keep"],
      [key],
    )).toEqual([
      { path: ["messageRetention", "dryRun"], value: true, reason: "chainReason_dryRun" },
    ]);
  });

  it("a broken takeover chain stops forcing the recall path on", () => {
    const key = policy.chainKeyOf(0);
    expect(policy.linkedOps(
      {
        contextCompactionEnabled: true,
        extractionEnabled: false,
        recallEnabled: false,
        recallSessionHistory: false,
      },
      "contextCompactionEnabled",
      ["contextCompactionEnabled"],
      [key],
    )).toEqual([]);
  });

  it("every drawn chain has a breakable id", () => {
    expect(policy.CHAIN_GROUPS.map((_members, index) => policy.chainKeyOf(index)))
      .toEqual([
        "contextCompactionEnabled+recallEnabled+extractionEnabled+recallSessionHistory",
        "freshTurnCount+recallMaxNodes",
        "messageRetention.keep+messageRetention.dryRun",
      ]);
    expect(policy.chainKeyOf(99)).toBe("");
  });

  it("enabling retention pruning turns the dry run on first", () => {
    const ops = policy.linkedOps(
      { messageRetention: { keep: "recent", dryRun: false } },
      "messageRetention.keep",
      ["messageRetention.keep"],
    );
    expect(ops).toEqual([
      { path: ["messageRetention", "dryRun"], value: true, reason: "chainReason_dryRun" },
    ]);
  });

  it("leaves a consistent chain untouched", () => {
    expect(policy.linkedOps(
      { freshTurnCount: 5, recallCrossSession: "every-turn", recallMaxNodes: 4 },
      "freshTurnCount",
      ["freshTurnCount"],
    )).toEqual([]);
  });

  it("draws each chain over real card fields", () => {
    expect(policy.CHAIN_GROUPS).toContainEqual(["freshTurnCount", "recallMaxNodes"]);
    expect(policy.CHAIN_GROUPS).toContainEqual(["messageRetention.keep", "messageRetention.dryRun"]);
    expect(policy.CHAIN_GROUPS).toContainEqual([
      "contextCompactionEnabled",
      "recallEnabled",
      "extractionEnabled",
      "recallSessionHistory",
    ]);
  });
});

describe("the painted state of a chain segment", () => {
  const policy = loadChainPolicy();
  const blue = policy.CHAIN_BLUE;

  it("paints a live link blue even when nothing was just adjusted", () => {
    const visual = policy.chainVisual(false, false);
    expect(visual.state).toBe("linked");
    expect(visual.color).toBe(blue);
    expect(visual.dashed).toBe(false);
    expect(visual.glow).toBe(false);
  });

  it("keeps the same blue but glows while the link just pulled a value", () => {
    const visual = policy.chainVisual(true, false);
    expect(visual.state).toBe("active");
    expect(visual.color).toBe(blue);
    expect(visual.glow).toBe(true);
    expect(visual.opacity).toBeGreaterThan(policy.chainVisual(false, false).opacity);
  });

  it("drops the colour and dashes the segment once the link is broken", () => {
    const visual = policy.chainVisual(true, true);
    expect(visual.state).toBe("broken");
    expect(visual.color).not.toBe(blue);
    expect(visual.dashed).toBe(true);
    expect(visual.glow).toBe(false);
  });

  it("never reports a live state for a broken link", () => {
    for (const active of [false, true]) {
      expect(policy.chainVisual(active, true).state).toBe("broken");
    }
  });

  it("gives an unadjusted and a just-adjusted link the same hue, so the paint always means linked", () => {
    expect(policy.chainVisual(true, false).color).toBe(policy.chainVisual(false, false).color);
  });
});

describe("broken chains in the browser", () => {
  it("remembers a break across a reload", () => {
    const store: Record<string, string> = {};
    const first = loadChainPolicy(store);
    first.writeBrokenChains(new Set(["freshTurnCount+recallMaxNodes"]));
    expect(store[first.BROKEN_CHAINS_KEY]).toBe('["freshTurnCount+recallMaxNodes"]');
    expect(Array.from(loadChainPolicy(store).readBrokenChains()))
      .toEqual(["freshTurnCount+recallMaxNodes"]);
  });

  it("starts with every chain linked when the browser has no storage", () => {
    expect(Array.from(loadChainPolicy().readBrokenChains())).toEqual([]);
  });

  it("ignores a corrupted entry instead of failing the card", () => {
    const key = loadChainPolicy().BROKEN_CHAINS_KEY;
    expect(Array.from(loadChainPolicy({ [key]: "not json" }).readBrokenChains())).toEqual([]);
    expect(Array.from(loadChainPolicy({ [key]: '{"a":1}' }).readBrokenChains())).toEqual([]);
    expect(Array.from(loadChainPolicy({ [key]: '["ok", 7, null]' }).readBrokenChains()))
      .toEqual(["ok"]);
  });
});

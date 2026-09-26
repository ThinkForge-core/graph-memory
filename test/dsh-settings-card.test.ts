import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

interface LinkOp {
  path: string[];
  value: unknown;
  reason: string;
  params?: Record<string, unknown>;
}

interface ChainPolicy {
  CHAIN_GROUPS: string[][];
  optimalRecallNodes(window: number): number;
  optimalValues(): Record<string, unknown>;
  linkedOps(values: Record<string, unknown>, changedKey: string, skip: string[]): LinkOp[];
}

/** Load the browser half the way the module loader does, without a browser. */
function loadChainPolicy(): ChainPolicy {
  let loaded: { id: string; factory: (require: (id: string) => unknown) => any } | undefined;
  runInNewContext(readFileSync(new URL("../dsh-ui/client.js", import.meta.url), "utf8"), {
    window: { __ModuleLoader__: { load: (entry: any) => { loaded = entry; } } },
  });
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

  it("a wider window tightens the per-recall size under a per-message reach", () => {
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

  it("a bounded reach caps the size instead of shrinking it", () => {
    const ops = policy.linkedOps(
      { recallCrossSession: "first-turn", recallMaxNodes: 9, freshTurnCount: 5 },
      "recallCrossSession",
      ["recallCrossSession"],
    );
    expect(ops).toEqual([{ path: ["recallMaxNodes"], value: 6, reason: "chainReason_firstTurn" }]);
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

import { describe, expect, it } from "vitest";

import { collectPresentedRecall, filterDshRecallNodes, insertDshRecallBeforeCurrentUser } from "../src/format/dsh-recall.ts";

function node(id: string, sourceSessions: string[]) {
  return { id, sourceSessions, status: "active" } as any;
}

describe("DSH recall visibility", () => {
  it("places recalled history before the live user instruction", () => {
    const system = { role: "system", source: { kind: "plugin" } };
    const current = { role: "user", source: { kind: "user" }, content: "do the task" };
    const recall = { role: "user", source: { kind: "plugin", plugin: "graph-memory" } };
    expect(insertDshRecallBeforeCurrentUser([system, current], recall)).toEqual([system, recall, current]);
  });

  it("keeps archived same-session and cross-session memory but removes fresh duplicates", () => {
    const nodes = [
      node("fresh", ["dsh:current"]),
      node("archived", ["dsh:current"]),
      node("cross", ["dsh:other"]),
      node("mixed", ["dsh:current", "dsh:other"]),
    ];
    const sources = [
      { nodeId: "fresh", sessionId: "dsh:current", messageId: "dsh:current:10", turnIndex: 10 },
      { nodeId: "archived", sessionId: "dsh:current", messageId: "dsh:current:2", turnIndex: 2 },
      { nodeId: "cross", sessionId: "dsh:other", messageId: "dsh:other:3", turnIndex: 3 },
      { nodeId: "mixed", sessionId: "dsh:current", messageId: "dsh:current:10", turnIndex: 10 },
    ];

    expect(filterDshRecallNodes(
      nodes,
      sources,
      "dsh:current",
      new Set(["dsh:current:10"]),
      true,
    ).map(value => value.id)).toEqual(["archived", "cross", "mixed"]);
  });

  it("does not invent current-session memory without provenance before archival", () => {
    expect(filterDshRecallNodes(
      [node("unknown", ["dsh:current"])],
      [],
      "dsh:current",
      new Set(),
      false,
    )).toEqual([]);
  });
});

describe("presented recall bookkeeping", () => {
  const BLOCK = [
    "<memory_capsules>",
    '  <turn_memory id="tm-1" outcome="completed" created_at="1">one</turn_memory>',
    '  <turn_memory id="tm-2" outcome="completed" created_at="2">two</turn_memory>',
    "</memory_capsules>",
    "<knowledge_graph>",
    '  <task name="build the timer" desc="x" source="recalled" updated="2026-01-01">',
    "body",
    "  </task>",
    "</knowledge_graph>",
  ].join("\n");

  function snapshot(seq: number, text: string) {
    return {
      type: "user/message",
      seq,
      data: {
        source: {
          kind: "plugin:graph-memory",
          form: "snapshot",
          sections: [{ name: "graph-memory:recall", text }],
        },
        content: [{ type: "text", text }],
      },
    };
  }

  it("collects capsule ids and node names from live recall snapshots", () => {
    const presented = collectPresentedRecall({
      events: [snapshot(0, BLOCK)],
      surface: { nodes: [0] },
    });
    expect([...presented.memoryIds].sort()).toEqual(["tm-1", "tm-2"]);
    expect([...presented.nodeNames]).toEqual(["build the timer"]);
  });

  it("forgets a snapshot once rolling compaction takes it off the surface", () => {
    const events = [
      snapshot(0, BLOCK),
      { type: "user/message", seq: 1, data: { source: { kind: "user" } } },
    ];
    expect(collectPresentedRecall({ events, surface: { nodes: [1] } }).memoryIds.size).toBe(0);
  });

  it("never reads an ordinary user message as already presented memory", () => {
    const events = [{
      type: "user/message",
      seq: 0,
      data: { source: { kind: "user" }, content: [{ type: "text", text: BLOCK }] },
    }];
    expect(collectPresentedRecall({ events, surface: { nodes: [0] } }).memoryIds.size).toBe(0);
  });

  it("tolerates a session without a surface or an event log", () => {
    expect(collectPresentedRecall({}).memoryIds.size).toBe(0);
    expect(collectPresentedRecall({ surface: { nodes: [0] } }).nodeNames.size).toBe(0);
  });
});

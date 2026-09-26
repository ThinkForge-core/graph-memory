import { describe, expect, it } from "vitest";

import {
  dshSurfaceUserTurnNumbers,
  isDshUserTurn,
  selectDshRollingCompactionRange,
} from "../src/format/dsh-compaction.ts";

function user(kind = "user") {
  return { type: "user/message", data: { source: { kind } } };
}

describe("DSH rolling compaction selection", () => {
  it("counts only real user prompts and retains the configured tail", () => {
    const events = [
      user(),
      { type: "assistant/message" },
      user("plugin"),
      user(),
      { type: "tool/call" },
      { type: "tool/result" },
      user(),
      { type: "assistant/message" },
      user(),
    ];
    const range = selectDshRollingCompactionRange(
      { events, surface: { nodes: events.map((_, index) => index) } },
      3,
    );

    expect(range).toEqual({
      start: 0,
      end: 2,
      shadowedSeqs: [0, 1, 2],
      retainedUserTurns: 3,
    });
  });

  it("does nothing while the surface is within the configured turn count", () => {
    const events = [user(), { type: "assistant/message" }, user()];
    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: [0, 1, 2] } },
      2,
    )).toBeNull();
  });

  it("preserves DSH's protected system head while archiving old turns", () => {
    const events = [
      { type: "system/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
    ];
    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: events.map((_, index) => index) } },
      2,
    )).toEqual({
      start: 1,
      end: 2,
      shadowedSeqs: [1, 2],
      retainedUserTurns: 2,
    });
  });

  it("replaces an earlier archive marker together with the next expired turn", () => {
    const events = [
      { type: "system/message" },
      user("plugin"),
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
    ];
    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: events.map((_, index) => index) } },
      2,
    )).toEqual({
      start: 1,
      end: 3,
      shadowedSeqs: [1, 2, 3],
      retainedUserTurns: 2,
    });
  });

  it("counts a claimed incoming user turn before DSH appends it to the surface", () => {
    const events = [
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
    ];
    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: events.map((_, index) => index) } },
      5,
    )).toBeNull();
  });

  it("retains the current user plus the configured previous tail on tool continuations", () => {
    const events = [
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
    ];
    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: events.map((_, index) => index) } },
      2,
      true,
    )).toMatchObject({ start: 0, end: 1, shadowedSeqs: [0, 1] });
  });

  it("supports replacement seqs whose numeric order differs from surface order", () => {
    const events: any[] = [];
    events[20] = user("plugin");
    events[4] = user();
    events[5] = { type: "assistant/message" };
    events[9] = user();
    events[10] = { type: "assistant/message" };
    events[14] = user();

    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: [20, 4, 5, 9, 10, 14] } },
      2,
    )).toMatchObject({ start: 20, end: 5, shadowedSeqs: [20, 4, 5] });
  });

  it("rejects invalid retention instead of silently changing policy", () => {
    expect(() => selectDshRollingCompactionRange({}, 0)).toThrow(/positive integer/);
  });

  it("recognizes only durable user-origin prompts", () => {
    expect(isDshUserTurn(user())).toBe(true);
    expect(isDshUserTurn(user("plugin"))).toBe(false);
    expect(isDshUserTurn({ type: "assistant/message" })).toBe(false);
  });
});

describe("DSH turn readiness gating", () => {
  /** Four real user turns whose numbers are only available from `turn/start`. */
  function turnEvents() {
    return [
      { type: "system/message" },
      { type: "turn/start", data: { turn: 1 } },
      user(), { type: "assistant/message" },
      { type: "turn/start", data: { turn: 2 } },
      user(), { type: "assistant/message" },
      { type: "turn/start", data: { turn: 3 } },
      user(), { type: "assistant/message" },
      { type: "turn/start", data: { turn: 4 } },
      user(), { type: "assistant/message" },
    ];
  }

  function session(events: any[] = turnEvents()) {
    // `turn/start` lives in the immutable log but is never a surface node, so
    // the surface is exactly the non-lifecycle events in seq order.
    const nodes = events
      .map((event, index) => (event?.type === "turn/start" ? -1 : index))
      .filter(index => index >= 0);
    return { events, surface: { nodes } };
  }

  it("maps surface user prompts to their DSH turn numbers", () => {
    expect([...dshSurfaceUserTurnNumbers(session())]).toEqual([
      [2, 1],
      [5, 2],
      [8, 3],
      [11, 4],
    ]);
  });

  it("archives the full prefix when every candidate turn is summarized", () => {
    expect(selectDshRollingCompactionRange(session(), 2, false, () => true)).toEqual({
      start: 2,
      end: 6,
      shadowedSeqs: [2, 3, 5, 6],
      retainedUserTurns: 2,
    });
  });

  it("archives nothing while the oldest candidate turn has no summary yet", () => {
    expect(selectDshRollingCompactionRange(session(), 2, false, turn => turn !== 1)).toBeNull();
  });

  it("resumes from the second candidate once the first is summarized", () => {
    expect(selectDshRollingCompactionRange(session(), 2, false, turn => turn !== 2)).toEqual({
      start: 2,
      end: 3,
      shadowedSeqs: [2, 3],
      retainedUserTurns: 2,
      deferredUserTurns: 1,
    });
  });

  it("does not freeze a legacy surface whose turn numbers cannot be derived", () => {
    const events = [
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
      user(), { type: "assistant/message" },
    ];
    expect(selectDshRollingCompactionRange(
      { events, surface: { nodes: events.map((_, index) => index) } },
      1,
      false,
      () => false,
    )).toEqual({
      start: 0,
      end: 3,
      shadowedSeqs: [0, 1, 2, 3],
      retainedUserTurns: 1,
    });
  });

  it("keeps the ungated behaviour byte-for-byte when no gate is supplied", () => {
    expect(selectDshRollingCompactionRange(session(), 2)).toEqual({
      start: 2,
      end: 6,
      shadowedSeqs: [2, 3, 5, 6],
      retainedUserTurns: 2,
    });
  });
});

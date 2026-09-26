import { describe, expect, it } from "vitest";

import {
  OPTIMAL_SETTINGS_REVISION,
  optimalRecallMaxNodes,
  optimalSettingsPatch,
} from "../dsh.ts";

describe("optimal settings preset", () => {
  it("shrinks the per-recall budget as the retention window grows", () => {
    expect(optimalRecallMaxNodes(5)).toBe(4);
    expect(optimalRecallMaxNodes(8)).toBe(3);
    expect(optimalRecallMaxNodes(12)).toBe(2);
    expect(optimalRecallMaxNodes(2)).toBe(6);
    expect(optimalRecallMaxNodes(Number.NaN)).toBe(6);
  });

  it("carries the validated takeover combination", () => {
    expect(optimalSettingsPatch()).toEqual({
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

  it("stamps a revision a future release can tell apart", () => {
    expect(OPTIMAL_SETTINGS_REVISION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

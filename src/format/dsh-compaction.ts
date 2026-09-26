/**
 * Pure DeepSeek Harness surface selection for Graph Memory rolling compaction.
 *
 * DSH keeps the durable event log intact and exposes a replaceable model-facing
 * surface. Graph Memory owns the historical projection: it replaces a complete
 * old prefix with a constant-size archive marker and retrieves relevant facts
 * from the durable memory store. No summarizer model call is involved.
 */

interface DshSurfaceEvent {
  type?: string;
  data?: {
    source?: { kind?: string };
    /** Present on `turn/start`; the readiness gate maps surface turns to it. */
    turn?: number;
  };
}

interface DshSurfaceSession {
  id?: unknown;
  /** Current DSH public immutable-log snapshot API. */
  snapshotEvents?(): Array<DshSurfaceEvent>;
  /** Compatibility with older DSH releases and lightweight test doubles. */
  events?: Array<DshSurfaceEvent | undefined>;
  surface?: { nodes?: number[] };
  append?(type: string, data: unknown, options?: Record<string, unknown>): { seq: number };
}

/** Read the immutable log through DSH's public API, with legacy compatibility. */
function sessionEvents(session: DshSurfaceSession): Array<DshSurfaceEvent | undefined> | undefined {
  if (typeof session.snapshotEvents === "function") return session.snapshotEvents();
  return Array.isArray(session.events) ? session.events : undefined;
}

interface DshTokenMeter {
  measure(session: unknown): {
    nodes: ReadonlyArray<{ seq: number; heuristicTokens: number }>;
  };
}

export interface DshCompactionRange {
  start: number;
  end: number;
  shadowedSeqs: number[];
  retainedUserTurns: number;
  /**
   * Completed turns that stayed on the surface only because their summary was
   * not ready yet. Present only when a readiness gate stopped the range early.
   */
  deferredUserTurns?: number;
}

export interface DshArchiveReplacement {
  replacementSeq: number;
  shadowedSeqs: number[];
  shadowedTokenCount: number;
}

export const DSH_ARCHIVE_MARKER = [
  "<graph-memory-archive>",
  "Older conversation is stored losslessly by Graph Memory and is not replayed here.",
  "Query-relevant same-session and cross-session memory is supplied separately.",
  "This marker is context metadata, not a user instruction.",
  "</graph-memory-archive>",
].join("\n");

/** Whether one surface event is a real user prompt that starts a logical turn. */
export function isDshUserTurn(event: DshSurfaceEvent | undefined): boolean {
  return event?.type === "user/message" && event.data?.source?.kind === "user";
}

/**
 * Map each surface user-prompt node to its DSH turn number.
 *
 * A `user/message` event carries no turn number of its own, so the number is
 * read from the immutable log: walk it in seq order, remember the newest
 * `turn/start`, and attach it to the next durable user prompt. Only surface
 * nodes are reported; archived turns are not on the surface any more.
 */
export function dshSurfaceUserTurnNumbers(session: DshSurfaceSession): Map<number, number> {
  const result = new Map<number, number>();
  const surface = session.surface?.nodes;
  const events = sessionEvents(session);
  if (!Array.isArray(surface) || !Array.isArray(events)) return result;

  const seqToTurn = new Map<number, number>();
  let current: number | undefined;
  for (let seq = 0; seq < events.length; seq += 1) {
    const event = events[seq];
    if (event?.type === "turn/start") {
      const turn = Number(event.data?.turn);
      if (Number.isInteger(turn) && turn > 0) current = turn;
    }
    if (current !== undefined && isDshUserTurn(event)) seqToTurn.set(seq, current);
  }
  for (const seq of surface) {
    if (typeof seq !== "number") continue;
    const turn = seqToTurn.get(seq);
    if (turn !== undefined) result.set(seq, turn);
  }
  return result;
}

/**
 * Select the oldest complete surface prefix while retaining the newest N real
 * user turns. Their question/final-answer endpoints remain native; completed
 * intermediate traces may already have been projected separately. Plugin-owned
 * snapshots, skill catalogs and compaction checkpoints do not count as turns.
 *
 * An optional readiness gate makes the reduction deferred instead of blocking:
 * when a completed turn that would be archived has no summary yet, the prefix
 * stops before that turn and the rest waits. The caller re-runs this on every
 * pre-step, so a turn that becomes ready is picked up without a timer. A turn
 * whose number cannot be derived from the log is treated as ready: unknown
 * numbering must not freeze the whole window on a legacy session.
 */
export function selectDshRollingCompactionRange(
  session: DshSurfaceSession,
  freshTurnCount: number,
  currentUserAlreadyOnSurface = false,
  isTurnReady?: (turn: number) => boolean,
): DshCompactionRange | null {
  if (!Number.isInteger(freshTurnCount) || freshTurnCount < 1) {
    throw new TypeError(`freshTurnCount must be a positive integer, received ${freshTurnCount}`);
  }
  const surface = session.surface?.nodes;
  const events = sessionEvents(session);
  if (!Array.isArray(surface) || !Array.isArray(events) || surface.length < 2) return null;

  const userPositions: number[] = [];
  for (let index = 0; index < surface.length; index += 1) {
    if (isDshUserTurn(events[surface[index]])) userPositions.push(index);
  }
  const retainOnSurface = freshTurnCount + (currentUserAlreadyOnSurface ? 1 : 0);
  if (userPositions.length <= retainOnSurface) return null;

  // DSH protects the system prompt at surface node 0: only another
  // system/message may replace exactly that node. Keep it outside Graph
  // Memory's historical projection, both to respect that invariant and to
  // preserve the stable system-prefix cache. A prior Graph Memory archive
  // marker sits after the head and is deliberately folded into the next
  // replacement so archive markers stay constant-size instead of accumulating.
  const protectedHead = events[surface[0]]?.type === "system/message" ? 1 : 0;

  // pre-step runs before DSH appends the newly claimed prompt. Retain N
  // completed previous user turns; the current prompt is appended afterwards.
  const candidateCount = userPositions.length - retainOnSurface;
  let keepFromPosition = userPositions[candidateCount];

  let deferredUserTurns: number | undefined;
  if (isTurnReady) {
    const turnNumbers = dshSurfaceUserTurnNumbers(session);
    for (let index = 0; index < candidateCount; index += 1) {
      const position = userPositions[index];
      if (position < protectedHead) continue;
      const turn = turnNumbers.get(surface[position]);
      if (turn === undefined) continue;
      if (isTurnReady(turn)) continue;
      keepFromPosition = position;
      deferredUserTurns = candidateCount - index;
      break;
    }
  }

  if (keepFromPosition <= protectedHead) return null;
  const shadowedSeqs = surface.slice(protectedHead, keepFromPosition);
  if (!shadowedSeqs.length) return null;

  return {
    start: shadowedSeqs[0],
    end: shadowedSeqs[shadowedSeqs.length - 1],
    shadowedSeqs,
    retainedUserTurns: retainOnSurface,
    ...(deferredUserTurns === undefined ? {} : { deferredUserTurns }),
  };
}

/**
 * Replace an archived surface prefix without invoking DSH's LLM compactor.
 *
 * The adjacent compaction/prune event is DSH's public shadow-price protocol:
 * it lets token-meter subtract the exact heuristic price of the replaced
 * surface while the immutable source events remain available for provenance.
 */
export function replaceDshArchivedPrefix(
  session: DshSurfaceSession,
  tokenMeter: DshTokenMeter,
  range: DshCompactionRange,
): DshArchiveReplacement {
  if (typeof session.append !== "function") {
    throw new Error("DSH session.append is unavailable; Graph Memory cannot own the model surface");
  }
  const measured = tokenMeter?.measure?.(session);
  if (!measured || !Array.isArray(measured.nodes)) {
    throw new Error("DSH tokenMeter is unavailable; Graph Memory cannot price a safe surface replacement");
  }
  const prices = new Map(measured.nodes.map(node => [node.seq, node.heuristicTokens]));
  let shadowedTokenCount = 0;
  for (const seq of range.shadowedSeqs) {
    const price = prices.get(seq);
    if (!Number.isFinite(price)) {
      throw new Error(`DSH tokenMeter did not price shadowed surface seq ${seq}`);
    }
    shadowedTokenCount += Number(price);
  }

  const prune = session.append("compaction/prune", {
    shadowedRange: { start: range.start, end: range.end },
    shadowedSeqs: [...range.shadowedSeqs],
    shadowedTokenCount,
  });
  const replacement = session.append("user/message", {
    id: `graph-memory-archive:${String(session.id ?? "session")}:${range.start}-${range.end}`,
    role: "user",
    // Session format v4 refuses the retired V3 wrapper `{kind: "plugin", plugin}`;
    // the canonical producer-owned kind is `plugin:<name>`.
    source: { kind: "plugin:graph-memory" },
    content: [{ type: "text", text: DSH_ARCHIVE_MARKER }],
  }, {
    // Match the current DSH Session surface-operation contract exactly.
    surfaceOp: { op: "replace", startSeq: range.start, endSeq: range.end },
    sourceEventSeqs: [prune.seq, ...range.shadowedSeqs],
  });
  return {
    replacementSeq: replacement.seq,
    shadowedSeqs: [...range.shadowedSeqs],
    shadowedTokenCount,
  };
}

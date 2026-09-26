import type { GmNode, GmTurnMemory } from "../types.ts";
import type { GmNodeSource } from "../store/store.ts";

/** Keep recalled history before the live human instruction on the model surface. */
export function insertDshRecallBeforeCurrentUser(messages: any[], recalledMessage: any): any[] {
  const entered = [...messages];
  const currentUserIndex = entered.findIndex(message => message?.source?.kind === "user");
  entered.splice(currentUserIndex < 0 ? entered.length : currentUserIndex, 0, recalledMessage);
  return entered;
}

/**
 * Remove only memory that is already visible verbatim in DSH's fresh window.
 * Archived same-session evidence is first-class memory, alongside evidence
 * from other sessions; filtering the whole current session loses exactly the
 * history Graph Memory took off the provider surface.
 */
export function filterDshRecallNodes(
  nodes: GmNode[],
  sources: GmNodeSource[],
  currentSession: string,
  visibleMessageIds: ReadonlySet<string>,
  hasArchivedHistory: boolean,
): GmNode[] {
  const refsByNode = new Map<string, GmNodeSource[]>();
  for (const source of sources) {
    const refs = refsByNode.get(source.nodeId) ?? [];
    refs.push(source);
    refsByNode.set(source.nodeId, refs);
  }

  return nodes.filter(node => {
    if (node.sourceSessions.some(session => session !== currentSession)) return true;
    const refs = refsByNode.get(node.id) ?? [];
    if (refs.length) return refs.some(ref => !visibleMessageIds.has(ref.messageId));
    return hasArchivedHistory;
  });
}

/** Avoid replaying a compact summary whose exact Q/A is still visible. */
export function filterDshRecallMemories(
  memories: GmTurnMemory[],
  currentSession: string,
  visibleMessageIds: ReadonlySet<string>,
): GmTurnMemory[] {
  return memories.filter(memory =>
    memory.sessionId !== currentSession ||
    memory.sources.some(source => !visibleMessageIds.has(source.messageId))
  );
}

/** Identifiers one Graph Memory recall snapshot already presented on the surface. */
export interface DshPresentedRecall {
  memoryIds: Set<string>;
  nodeNames: Set<string>;
}

/** Section name every recall snapshot carries; used to recognize our own block. */
const RECALL_SECTION = "graph-memory:recall";
const PRESENTED_MEMORY = /<turn_memory id="([^"]+)"/g;
const PRESENTED_NODE = /<(task|skill|event) name="([^"]*)"/g;

/**
 * Collect what Graph Memory has already shown on the live surface.
 *
 * Recall is query-driven, so a follow-up question can match a capsule that was
 * injected a turn earlier. That block is already visible to the model and
 * already paid for; injecting it again adds tokens without adding information.
 * Reading the live snapshots (rather than an in-memory ledger) means the
 * bookkeeping survives a restart and, more importantly, self-heals: once
 * rolling compaction archives a snapshot its identifiers are no longer found
 * here, so the memory becomes injectable again exactly when it left the window.
 *
 * Only the plugin's own recall section is read. An ordinary user message that
 * happens to quote the block format is not memory.
 */
export function collectPresentedRecall(session: any): DshPresentedRecall {
  const memoryIds = new Set<string>();
  const nodeNames = new Set<string>();
  const nodes = session?.surface?.nodes;
  const events = typeof session?.snapshotEvents === "function"
    ? session.snapshotEvents()
    : session?.events;
  if (!Array.isArray(nodes) || !Array.isArray(events)) return { memoryIds, nodeNames };

  for (const seq of nodes) {
    const event = events[seq];
    if (event?.type !== "user/message") continue;
    const sections = event?.data?.source?.sections;
    if (!Array.isArray(sections)) continue;
    const section = sections.find((entry: any) => entry?.name === RECALL_SECTION);
    const text = typeof section?.text === "string" ? section.text : "";
    if (!text) continue;
    for (const match of text.matchAll(PRESENTED_MEMORY)) memoryIds.add(match[1]);
    for (const match of text.matchAll(PRESENTED_NODE)) nodeNames.add(match[2]);
  }
  return { memoryIds, nodeNames };
}

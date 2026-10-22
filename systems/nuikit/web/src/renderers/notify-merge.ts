// Repeats of the same notice fold into one (the ox_lib override's rule, #117): a notify with the same
// title, description, status and position as one still on screen, neither with an `id` nor an item,
// takes the first one's slot and counts `×N`; the older intent is cancelled ('replaced'). A script that
// wants two identical toasts stacked gives them ids. Pure, so it is tested without React.

export interface MergeInput {
  id: string;
  seq: number;
  props: { id?: string; title?: string; description?: string; status?: string; position?: string; item?: unknown };
}

export interface MergeSlot {
  /** The first notice's id: the slot's stable key. */
  root: string;
  /** How many notices this slot has counted. */
  count: number;
  /** The first notice's seq: where the slot sits in its stack. */
  seq: number;
}

export interface MergeState {
  slots: Map<string, MergeSlot>;
  /** Folded into a newer one: not drawn, not animated out, cancelled once. */
  absorbed: Set<string>;
}

export const mergeState = (): MergeState => ({ slots: new Map(), absorbed: new Set() });

const mergeable = (p: MergeInput["props"]) => !p.id && !p.item && !!(p.title || p.description);
const sameKey = (a: MergeInput["props"], b: MergeInput["props"], position: (p?: string) => string) =>
  a.title === b.title && a.description === b.description && (a.status ?? "info") === (b.status ?? "info") && position(a.position) === position(b.position);

/**
 * Assign each live intent its slot, folding new repeats into the one on screen. Mutates `state`
 * (call it on every render: ids already seen keep their slot). Returns the ids newly absorbed, which
 * the caller cancels.
 */
export function mergeRepeats<T extends MergeInput>(intents: readonly T[], state: MergeState, position: (p?: string) => string): string[] {
  const live = new Set(intents.map((it) => it.id));
  for (const id of state.slots.keys()) if (!live.has(id)) state.slots.delete(id);
  for (const id of state.absorbed) if (!live.has(id)) state.absorbed.delete(id);

  const fresh: string[] = [];
  const sorted = [...intents].sort((a, b) => a.seq - b.seq);
  for (const it of sorted) {
    if (state.slots.has(it.id)) continue;
    const prev = mergeable(it.props)
      ? sorted.find((o) => o !== it && o.seq < it.seq && state.slots.has(o.id) && !state.absorbed.has(o.id) && mergeable(o.props) && sameKey(o.props, it.props, position))
      : undefined;
    const slot = prev && state.slots.get(prev.id);
    if (prev && slot) {
      state.slots.set(it.id, { root: slot.root, count: slot.count + 1, seq: slot.seq });
      state.absorbed.add(prev.id);
      fresh.push(prev.id);
    } else {
      state.slots.set(it.id, { root: it.id, count: 1, seq: it.seq });
    }
  }
  return fresh;
}

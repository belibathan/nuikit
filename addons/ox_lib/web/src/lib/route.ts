/**
 * The door to the `nuikit` resource's frame (docs/adapters/ox-lib.md §2, docs/intents.md §4):
 * `POST https://nuikit/intent`. When routing is on, every ox_lib intent this page receives is drawn
 * there, by the shared renderers, in the one stack with one focus owner; this page only translates
 * ox_lib's messages into intents and the frame's answers back into ox_lib's POSTs.
 *
 * Routing is on when the probe says so (convar `nuikit_ox_route`, default on) and the runtime
 * answers. Without `nuikit` (not started yet, stopped, an older runtime without the probe), every
 * feature draws locally as before: `isRouted()` is false, and a door that stops answering mid-call
 * turns it off again. ox_lib starts before nuikit, so the probe keeps asking the way the theme does.
 *
 * In the browser (vite dev) there is no runtime: `window.__nuikitDoor = async (body) => answer` fakes
 * one for tests; without it the page is unrouted. The bench harness (bench/screens/ox_lib) serves the
 * built page with GetParentResourceName stubbed, so the real fetch runs and Playwright answers it.
 */
import { isBrowser } from "nuikit-core";
import type { IntentKind, IntentProps } from "nuikit-core/intents";

export const SOURCE = "ox_lib";
const DOOR = "https://nuikit/intent";
/** A quiet `listen` is answered empty by the runtime after 25 s; the fetch waits a little longer. */
const LISTEN_WAIT = 40_000;

export interface DoorEvent {
  event: string;
  data: unknown;
}

/** What the door answers (docs/intents.md §4, override door). */
export interface Answer {
  id?: string;
  result?: unknown;
  reason?: string;
  data?: unknown;
  error?: string;
  ok?: boolean;
  route?: boolean;
  ended?: boolean;
  events?: DoorEvent[] | Record<string, never>;
}

declare global {
  interface Window {
    __nuikitDoor?: (body: unknown) => Promise<Answer | null | undefined>;
  }
}

/** One POST to the door. `null` means no answer: the resource is missing, stopped, or timed out. */
async function door(body: unknown, timeout = 0): Promise<Answer | null> {
  if (isBrowser()) {
    try {
      return (await window.__nuikitDoor?.(body)) ?? null;
    } catch {
      return null;
    }
  }
  const controller = new AbortController();
  const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;
  try {
    const res = await fetch(DOOR, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? (JSON.parse(text) as Answer) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ───────────────────────────────── routed or local

let routed = false;
let generation = 0;

/** True while the nuikit runtime draws this page's intents. Read at each message, never cached by a feature. */
export const isRouted = () => routed;

function setRouted(next: boolean) {
  routed = next;
}

/** Ask the runtime once. */
export async function probe(): Promise<boolean> {
  const a = await door({ probe: true, source: SOURCE }, 4_000);
  // an older runtime answers { error = 'invalid' } (no probe): unknown, so local
  const on = a?.ok === true && a.route === true;
  setRouted(on);
  return on;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** After a miss: every 2 s for the first minute (nuikit is starting), then 30 s (the theme does the same). */
const retryDelay = (misses: number) => (misses <= 30 ? 2_000 : 30_000);

/**
 * Keep the routed flag true to life: ask every 2 s for the first minute (nuikit is starting), then
 * every 30 s while off; every 10 s while on, so `stop nuikit` or the convar turning off is noticed.
 */
export function startRouting() {
  const gen = ++generation;
  void (async () => {
    let misses = 0;
    for (;;) {
      const on = await probe();
      if (gen !== generation) return;
      misses = on ? 0 : misses + 1;
      await sleep(on ? 10_000 : retryDelay(misses));
      if (gen !== generation) return;
    }
  })();
}

// ───────────────────────────────── intents through the door

/** An intent this page opened in the frame. */
export interface Handle {
  /** The runtime's id (`page:ox_lib#<key>`). */
  id: string;
  /** No answer is wanted any more (cancelled or replaced by this page): the open fetch's answer is dropped. */
  stale: boolean;
  /** The intent has ended, one way or another. */
  closed: boolean;
  update(props: Record<string, unknown>): void;
  /** Cancel it in the frame; the page draws nothing and posts nothing (ox_lib's Lua asked). */
  cancel(reason?: string): void;
}

export interface OpenOptions {
  /** The page's key for the intent (`context`, `menu`, `input`…): opening it again replaces it in place. */
  key: string;
  /** An event of the intent (menu change / scroll / check / select…), in order, while it is open. */
  onEvent?: (event: string, data: unknown) => void;
  /** The intent ended: a result, or a reason (escape, close, back, submenu, cancel, stopped…). */
  onEnd?: (answer: Answer) => void;
  /** The frame couldn't take it (nuikit gone, the door refused: busy, invalid): draw it here instead. */
  onLocal: () => void;
}

const byKey = new Map<string, Handle>();

/**
 * Open an intent in the frame, or draw it locally. Returns the handle when the door is being asked;
 * `null` when the page is unrouted and `onLocal` has already run. A door that refuses or doesn't
 * answer the open also falls back to `onLocal`, a moment later.
 */
export function openIntent<K extends IntentKind>(kind: K, props: IntentProps[K], opts: OpenOptions): Handle | null {
  if (!routed) {
    opts.onLocal();
    return null;
  }
  const id = `page:${SOURCE}#${opts.key}`;
  const prev = byKey.get(opts.key);
  if (prev && !prev.closed) prev.stale = true; // the runtime answers its fetch `replaced`; nothing to post
  const handle: Handle = {
    id,
    stale: false,
    closed: false,
    update(patch) {
      if (!handle.closed) void door({ update: id, props: patch });
    },
    cancel(reason) {
      if (handle.closed) return;
      handle.stale = true;
      handle.closed = true;
      void door({ cancel: id, reason });
    },
  };
  byKey.set(opts.key, handle);
  void (async () => {
    const answer = await door({ intent: kind, props, source: SOURCE, id: opts.key });
    if (byKey.get(opts.key) === handle && (handle.closed || !answer || answer.error || !opts.onEvent)) byKey.delete(opts.key);
    if (handle.closed && handle.stale) return;
    if (!answer) {
      // no runtime any more: this page draws it, and stays local until the probe says otherwise
      handle.closed = true;
      setRouted(false);
      if (!handle.stale) opts.onLocal();
      return;
    }
    if (answer.error) {
      // the runtime is there but refused (busy: another resource's progress; invalid): draw it here
      handle.closed = true;
      if (!handle.stale) opts.onLocal();
      return;
    }
    if (answer.result !== undefined || answer.reason !== undefined) {
      // a yielding intent ended
      handle.closed = true;
      if (!handle.stale) opts.onEnd?.(answer);
      return;
    }
    // { id }: a fire-and-forget intent is on screen; it ends by itself or on cancel()
    if (!opts.onEvent) handle.closed = true;
  })();
  if (opts.onEvent) void listen(handle, opts.onEvent);
  return handle;
}

/** One `listen` long-poll at a time per intent, until it ends. */
async function listen(handle: Handle, onEvent: (event: string, data: unknown) => void) {
  let misses = 0;
  while (!handle.closed) {
    const a = await door({ listen: handle.id }, LISTEN_WAIT);
    if (handle.closed) return;
    if (!a) {
      if (++misses >= 3) return; // the runtime is gone; the open fetch settles the handle
      await sleep(250);
      continue;
    }
    misses = 0;
    if (a.ended) return;
    const events = Array.isArray(a.events) ? a.events : [];
    for (const e of events) if (!handle.closed && !handle.stale) onEvent(e.event, e.data);
  }
}

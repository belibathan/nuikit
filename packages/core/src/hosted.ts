/**
 * Hosted mode: this copy of nuikit-core runs inside a UI module that the nuikit host mounted
 * (docs/host.md), not in the resource's own NUI frame.
 *
 * The host hands each module its context synchronously while the module's script runs, through
 * `globalThis.__NUIKIT_HOST_CTX__`, and removes it right after. Every module bundles its own copy
 * of nuikit-core, so each copy picks up its own context once, at load, and never sees another's.
 * With a context, fetchNui/onNui/emit go through it instead of `fetch` and `window` messages:
 * callbacks reach the owning resource's Lua (forwarded by the host), and only that resource's
 * messages arrive.
 */

export interface HostedMessage {
  action: string;
  data: unknown;
}

export interface HostedContext {
  /** The resource that owns this module (its Lua receives every callback). */
  resource: string;
  /** False when the host runs in a plain browser (dev, tests): fetchNui then uses mocks. */
  inGame: boolean;
  /** Call one of the owning resource's NUI callbacks. Resolves with its response. */
  post(name: string, data: unknown): Promise<unknown>;
  /** Receive the messages the owning resource's Lua sends (NUI.send). */
  listen(handler: (msg: HostedMessage) => void): () => void;
}

export const HOST_CTX_KEY = "__NUIKIT_HOST_CTX__";

let current: HostedContext | null =
  typeof globalThis !== "undefined" ? ((globalThis as Record<string, unknown>)[HOST_CTX_KEY] as HostedContext | undefined) ?? null : null;

/** The context this copy of nuikit-core was loaded with, or null outside the host. */
export function hostedContext(): HostedContext | null {
  return current;
}

/** For tests: pretend to be (or stop being) a hosted module. */
export function __setHostedContext(ctx: HostedContext | null): void {
  current = ctx;
}

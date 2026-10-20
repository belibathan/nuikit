/**
 * The server theme for pages nuikit.lua can't message: overrides (another resource's ui_page, e.g.
 * ox_lib) and the chat page.
 *
 * 1. Ask the `nuikit` resource for the compiled theme + player prefs (NUI callback
 *    https://nuikit/theme, any page may call it), then keep a long-poll open: the callback answers as
 *    soon as `nuikit theme reload` or a pref changes, so overrides repaint live too.
 * 2. Older nuikit resource (no callback): fetch nuikit/theme.css and compile it in the page.
 * 3. No nuikit resource: the page's built-in stock theme stays.
 */
import { isBrowser } from "./index";
import { applyTheme, setPrefs } from "./theme";
import type { CompiledTheme, NuiPrefs } from "./tokens";

export interface ServerThemePayload {
  /** Changes whenever the theme or the player's prefs change. */
  hash: string;
  theme?: CompiledTheme | null;
  /** Raw theme.css, when the server couldn't compile. */
  css?: string | null;
  prefs?: Partial<NuiPrefs> | null;
  unchanged?: boolean;
}

const CALLBACK = "https://nuikit/theme";
const SOURCES = ["https://cfx-nui-nuikit/theme.css", "nui://nuikit/theme.css"];
let polling = false;

async function post(body: unknown, timeout: number): Promise<ServerThemePayload | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(CALLBACK, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    const data = text ? (JSON.parse(text) as ServerThemePayload) : null;
    return data && typeof data.hash === "string" ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Apply a payload from the nuikit resource. Returns true when it carried a theme. */
export function applyServerTheme(p: ServerThemePayload): boolean {
  if (p.prefs) setPrefs(p.prefs);
  if (p.theme && typeof p.theme === "object") {
    applyTheme(p.theme);
    return true;
  }
  if (typeof p.css === "string" && p.css.includes("--")) {
    applyTheme(p.css);
    return true;
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function poll(hash: string) {
  if (polling) return;
  polling = true;
  for (;;) {
    const next = await post({ hash, wait: true }, 40_000);
    if (!next) {
      await sleep(30_000); // the nuikit resource is restarting (or gone): try again later
      continue;
    }
    if (!next.unchanged && next.hash !== hash) applyServerTheme(next);
    hash = next.hash;
  }
}

/**
 * Load the server theme into this page. In the browser (dev) it does nothing and returns false.
 * `live` (default true) keeps listening for `nuikit theme reload` and pref changes.
 */
export async function loadServerTheme(options: { live?: boolean } = {}): Promise<boolean> {
  if (isBrowser()) return false;
  const first = await post({ hash: null }, 4_000);
  if (first) {
    const themed = applyServerTheme(first);
    if (options.live !== false) void poll(first.hash);
    if (themed) return true;
  }
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const css = await res.text();
      if (css.includes("--")) {
        applyTheme(css);
        return true;
      }
    } catch {
      /* try the next form; without the nuikit resource the built-in theme stays */
    }
  }
  return false;
}

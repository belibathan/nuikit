import { applyTheme, isBrowser } from "nuikit-core";

/**
 * The server theme lives in the `nuikit` resource (nuikit/theme.css). ox_lib's Lua is untouched,
 * so instead of waiting for a message this page loads the file itself. NUI serves every resource's
 * listed files at https://cfx-nui-<resource>/<path>.
 */
const SOURCES = ["https://cfx-nui-nuikit/theme.css", "nui://nuikit/theme.css"];

export async function loadServerTheme(): Promise<boolean> {
  if (isBrowser()) return false;
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

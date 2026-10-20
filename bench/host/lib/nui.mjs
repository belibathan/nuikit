// A fake FiveM NUI for Playwright: the same URL scheme, frames and message path as the game.
//
//   https://nui-game-internal/ui/root.html     the root page; one <iframe> per ui_page
//   https://cfx-nui-<resource>/<path>          a resource's files (routed to a local folder)
//   POST https://<resource>/<callback>         an NUI callback (routed to `onCallback`)
//
// Every frame gets GetParentResourceName() like in game, so nuikit-core runs in "game" mode.
// Lua → UI messages are posted by the root page to the frame (source = parent), which is how
// FiveM's root page relays SendNUIMessage (see docs/host.md, "verify in game").
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export const ROOT_URL = "https://nui-game-internal/ui/root.html";

const ROOT_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#3a4a5a linear-gradient(160deg,#6b8aa6,#2b3440)}
iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;pointer-events:none}
iframe.focus{pointer-events:auto;z-index:1}
</style></head><body><script>
// The FiveM root page, reduced to what matters here: frames by resource, message relay, focus.
window.frames_ = {};
window.addFrame = (resource, url) => new Promise((resolve) => {
  const f = document.createElement('iframe');
  f.name = resource;
  f.src = url;
  f.allowTransparency = true;
  f.onload = () => resolve(performance.timeOrigin + performance.now());
  document.body.appendChild(f);
  frames_[resource] = f;
});
window.removeFrame = (resource) => { frames_[resource]?.remove(); delete frames_[resource]; };
window.send = (resource, msg) => frames_[resource]?.contentWindow.postMessage(msg, '*');
// SetNuiFocus brings the frame to the top (z-index: moving an iframe in the DOM would reload it).
window.focusFrame = (resource) => {
  for (const [r, f] of Object.entries(frames_)) f.classList.toggle('focus', r === resource);
  if (resource && frames_[resource]) { frames_[resource].focus(); }
};
</script></body></html>`;

/**
 * @param {import('playwright-core').BrowserContext} context
 * @param {{ files: (resource: string) => string | null, onCallback: (resource: string, name: string, body: any) => any | Promise<any>, overrides?: Record<string, string> }} opts
 *   files(resource): the local folder served as https://cfx-nui-<resource>/
 *   overrides: exact URL → body (e.g. a server's theme.css)
 */
export async function installNui(context, { files, onCallback, overrides }) {
  await context.addInitScript(() => {
    const host = location.hostname;
    if (host.startsWith("cfx-nui-")) {
      const resource = host.slice("cfx-nui-".length);
      Object.defineProperty(window, "GetParentResourceName", { value: () => resource });
    }
  });

  await context.route(/^https:\/\/nui-game-internal\//, (route) => route.fulfill({ status: 200, contentType: TYPES[".html"], body: ROOT_HTML }));

  await context.route(/^https:\/\/cfx-nui-[^/]+\//, (route) => {
    const url = new URL(route.request().url());
    const resource = url.hostname.slice("cfx-nui-".length);
    const special = overrides?.[url.origin + url.pathname];
    if (special) return route.fulfill({ status: 200, contentType: TYPES[path.extname(url.pathname)] ?? "text/plain", body: special });
    const dir = files(resource);
    const file = dir && path.join(dir, decodeURIComponent(url.pathname));
    if (!file || !file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return route.fulfill({ status: 404, body: "not found" });
    }
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] ?? "application/octet-stream", body: fs.readFileSync(file) });
  });

  // NUI callbacks: https://<resource>/<name> (single-label host, no dot).
  await context.route(/^https:\/\/(?!cfx-nui-|nui-game-internal)[^./:]+\/.+/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    let body = {};
    try {
      body = JSON.parse(req.postData() || "{}");
    } catch {
      /* not JSON */
    }
    const res = await onCallback(url.hostname, decodeURIComponent(url.pathname.slice(1)), body);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(res ?? {}) });
  });
}

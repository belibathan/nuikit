/*
 * nuikit_chat: brings the server theme into the chat resource's page.
 *
 * The chat page isn't ours and FiveM's Chromium 103 can't read oklch(), so this sets every theme
 * token on <html> as --nk-<name> (plus --nk-<name>-rgb channels for translucent fills), colours as
 * rgb. style.css reads only those.
 *
 * 1. The nuikit resource's compiled theme (tokens v1, already lowered) from its NUI callback
 *    https://nuikit/theme, then a long-poll on it so `nuikit theme reload` repaints the chat live.
 * 2. Older nuikit resource: fetch nuikit/theme.css and convert it here.
 * 3. No nuikit resource: nothing is set and style.css's built-in values stay.
 *
 * Plain ES2017, no build step. MIT, https://github.com/belibathan/nuikit
 */
(function () {
  "use strict";

  var SOURCES = ["https://cfx-nui-nuikit/theme.css", "nui://nuikit/theme.css"];
  var CALLBACK = "https://nuikit/theme";

  /** { light, dark } variable maps from pasted TweakCN / shadcn CSS. */
  function parseTheme(css) {
    var light = {};
    var dark = {};
    var any = false;
    var block = /([^{}]+)\{([^{}]*)\}/g;
    var m;
    while ((m = block.exec(css))) {
      var into = /\.dark/.test(m[1]) ? dark : /:root|:host|html/.test(m[1]) ? light : null;
      if (!into) continue;
      any = true;
      readDecls(m[2], into);
    }
    if (!any) readDecls(css, light);
    return { light: light, dark: dark };
  }

  function readDecls(body, into) {
    var decl = /--([\w-]+)\s*:\s*([^;]+);?/g;
    var m;
    while ((m = decl.exec(body))) into[m[1]] = m[2].trim();
  }

  function pct(s, scale, percentLike) {
    if (s === "none") return 0;
    if (/%$/.test(s)) return (parseFloat(s) / 100) * scale;
    var n = parseFloat(s);
    return percentLike && n > 1 ? n / 100 : n;
  }

  function hue(s) {
    var n = parseFloat(s);
    if (/rad$/.test(s)) return (n * 180) / Math.PI;
    if (/turn$/.test(s)) return n * 360;
    return isNaN(n) ? 0 : n;
  }

  function hsl(h, s, l) {
    var a = s * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h / 30) % 12;
      return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
    }
    return [f(0), f(8), f(4)];
  }

  function oklab(L, a, b) {
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    var s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    function gamma(x) {
      return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    }
    return [
      gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255,
      gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255,
      gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255,
    ];
  }

  /** Lower chroma until the colour fits sRGB (the same mapping vite-plugin-nuikit uses). */
  function gamutMap(L, C, H) {
    function at(c) {
      return oklab(L, c * Math.cos(H), c * Math.sin(H));
    }
    function inGamut(rgb) {
      return rgb.every(function (x) {
        return x >= -0.5 && x <= 255.5;
      });
    }
    var rgb = at(C);
    if (inGamut(rgb) || L >= 1 || L <= 0) return rgb;
    var lo = 0;
    var hi = C;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      var candidate = at(mid);
      var clipped = candidate.map(function (x) {
        return Math.max(0, Math.min(255, x));
      });
      var delta = Math.sqrt(
        candidate.reduce(function (sum, x, j) {
          return sum + (x - clipped[j]) * (x - clipped[j]);
        }, 0),
      );
      if (inGamut(candidate)) lo = mid;
      else if (delta < 5) return clipped;
      else hi = mid;
      rgb = at(lo);
    }
    return rgb;
  }

  /** Any CSS colour Chromium 103 may not read → [r, g, b, a], or null if it isn't a colour. */
  function toRgba(input) {
    var v = String(input).trim().toLowerCase();
    var m = /^#([0-9a-f]{3,8})$/.exec(v);
    if (m) {
      var h = m[1];
      if (h.length <= 4) h = h.replace(/./g, "$&$&");
      var n = function (i) {
        return parseInt(h.slice(i, i + 2), 16);
      };
      return [n(0), n(2), n(4), h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1];
    }
    m = /^(rgba?|hsla?|oklch|oklab)\((.*)\)$/.exec(v);
    if (!m) return null;
    var fn = m[1];
    var split = m[2].split("/");
    var parts = split[0].replace(/,/g, " ").trim().split(/\s+/);
    var alphaStr = split[1] && split[1].trim();
    if (!alphaStr && parts.length === 4) alphaStr = parts.pop();
    var alpha = alphaStr === undefined ? 1 : pct(alphaStr, 1);
    if (parts.length < 3) return null;
    var rgb;
    if (fn.indexOf("rgb") === 0) rgb = parts.slice(0, 3).map(function (p) { return pct(p, 255); });
    else if (fn.indexOf("hsl") === 0) rgb = hsl(hue(parts[0]), pct(parts[1], 1, true), pct(parts[2], 1, true));
    else if (fn === "oklch") rgb = gamutMap(pct(parts[0], 1), pct(parts[1], 0.4), (hue(parts[2]) * Math.PI) / 180);
    else rgb = oklab(pct(parts[0], 1), pct(parts[1], 0.4), pct(parts[2], 0.4));
    return rgb
      .map(function (c) {
        return Math.round(Math.max(0, Math.min(255, c)));
      })
      .concat([Math.round(alpha * 1000) / 1000]);
  }

  /**
   * The declarations to set: --nk-<name> for every theme variable (the .dark values over :root,
   * since the chat sits over the game like every other nuikit UI), colours as rgb()/rgba() with
   * --nk-<name>-rgb and --nk-<name>-a channels, and var(--x) references renamed to var(--nk-x).
   */
  function themeDecls(css) {
    var t = parseTheme(css);
    var vars = {};
    var k;
    for (k in t.light) vars[k] = t.light[k];
    for (k in t.dark) vars[k] = t.dark[k];
    return varsDecls(vars);
  }

  /** The same declarations from a flat token map (a compiled theme's vars). */
  function varsDecls(vars) {
    var k;
    var out = {};
    for (k in vars) {
      var value = vars[k].replace(/var\(\s*--/g, "var(--nk-");
      var rgba = toRgba(value);
      if (rgba) {
        var rgb = rgba[0] + ", " + rgba[1] + ", " + rgba[2];
        out["--nk-" + k] = rgba[3] === 1 ? "rgb(" + rgb + ")" : "rgba(" + rgb + ", " + rgba[3] + ")";
        out["--nk-" + k + "-rgb"] = rgb;
        out["--nk-" + k + "-a"] = String(rgba[3]);
      } else if (!/okl(ch|ab)\(|color-mix\(/.test(value)) {
        out["--nk-" + k] = value;
      }
    }
    return out;
  }

  /** Google Fonts @imports in a pasted theme (quoted URLs may contain ";"). */
  function importUrls(css) {
    var urls = [];
    var imp = /@import\s+(?:url\(\s*)?(["'])(https?:\/\/.*?)\1/g;
    var m;
    while ((m = imp.exec(css))) urls.push(m[2]);
    return urls;
  }

  function applyDecls(decls, imports) {
    var root = document.documentElement;
    var prev = root.__nkThemeKeys || {};
    var k;
    for (k in prev) if (!(k in decls)) root.style.removeProperty(k);
    for (k in decls) root.style.setProperty(k, decls[k]);
    root.__nkThemeKeys = decls;
    for (var i = 0; i < imports.length; i++) {
      if (document.querySelector('link[data-nuikit-import="' + imports[i] + '"]')) continue;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = imports[i];
      link.setAttribute("data-nuikit-import", imports[i]);
      document.head.appendChild(link);
    }
    root.setAttribute("data-nuikit-theme", "server");
  }

  function apply(css) {
    applyDecls(themeDecls(css), importUrls(css));
  }

  /** A payload from the nuikit resource: { hash, theme: { vars, imports }, css?, prefs? }. */
  function applyPayload(p) {
    if (p && p.theme && p.theme.vars) {
      applyDecls(varsDecls(p.theme.vars), p.theme.imports || []);
      return true;
    }
    if (p && typeof p.css === "string" && p.css.indexOf("--") !== -1) {
      apply(p.css);
      return true;
    }
    return false;
  }

  function post(body, timeout) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, timeout);
    return fetch(CALLBACK, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        return res.ok ? res.text() : null;
      })
      .then(function (text) {
        var data = text ? JSON.parse(text) : null;
        return data && typeof data.hash === "string" ? data : null;
      })
      .catch(function () {
        return null;
      })
      .then(function (data) {
        clearTimeout(timer);
        return data;
      });
  }

  /** Wait for `nuikit theme reload`: the callback answers when the theme changes. */
  function poll(hash) {
    post({ hash: hash, wait: true }, 40000).then(function (next) {
      if (!next) return setTimeout(function () { poll(hash); }, 30000);
      if (!next.unchanged && next.hash !== hash) applyPayload(next);
      poll(next.hash);
    });
  }

  function start() {
    if (typeof fetch !== "function") return;
    post({ hash: null }, 4000).then(function (first) {
      if (first) poll(first.hash);
      if (!applyPayload(first)) load(0);
    });
  }

  function load(i) {
    if (i >= SOURCES.length || typeof fetch !== "function") return;
    fetch(SOURCES[i])
      .then(function (res) {
        return res.ok ? res.text() : Promise.reject(res.status);
      })
      .then(function (css) {
        if (css.indexOf("--") === -1) return Promise.reject("empty");
        apply(css);
      })
      .catch(function () {
        load(i + 1);
      });
  }

  var api = { parseTheme: parseTheme, toRgba: toRgba, themeDecls: themeDecls, varsDecls: varsDecls, importUrls: importUrls, apply: apply, applyPayload: applyPayload };
  if (typeof module === "object" && module.exports) module.exports = api;
  else start();
})();

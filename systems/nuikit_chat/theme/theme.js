/*
 * nuikit_chat: brings the server theme (nuikit/theme.css) into the chat resource's page.
 *
 * The chat page isn't ours and FiveM's Chromium 103 can't read oklch(), so this fetches the
 * theme, takes its :root + .dark variables, converts every colour to rgb and sets them on <html>
 * as --nk-<name> (plus --nk-<name>-rgb channels for translucent fills). style.css reads only
 * those. Without the nuikit resource nothing is set and style.css's built-in values stay.
 *
 * Plain ES2017, no build step. MIT, https://github.com/belibathan/nuikit
 */
(function () {
  "use strict";

  var SOURCES = ["https://cfx-nui-nuikit/theme.css", "nui://nuikit/theme.css"];

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

  function apply(css) {
    var decls = themeDecls(css);
    var root = document.documentElement;
    for (var k in decls) root.style.setProperty(k, decls[k]);
    // Google Fonts @imports in a pasted theme
    var imp = /@import\s+(?:url\(\s*)?["']?(https?:\/\/[^"')\s;]+)["']?\s*\)?[^;]*;/g;
    var m;
    while ((m = imp.exec(css))) {
      if (document.querySelector('link[data-nuikit-import="' + m[1] + '"]')) continue;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = m[1];
      link.setAttribute("data-nuikit-import", m[1]);
      document.head.appendChild(link);
    }
    root.setAttribute("data-nuikit-theme", "server");
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

  var api = { parseTheme: parseTheme, toRgba: toRgba, themeDecls: themeDecls, apply: apply };
  if (typeof module === "object" && module.exports) module.exports = api;
  else load(0);
})();

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
 * It also gives chat's input the kit's smooth caret and typing (registry smooth-input, in plain JS
 * since the page is chat's): see smoothField below. Purely visual: chat's keys, history and posts are
 * untouched.
 *
 * The same file is nuikit_skins' skin.js (a byte-identical copy, checked by a test): with
 * `data-skin="<name>"` on its script tag it brings the theme into any resource's page the same way and
 * then adds nuikit_skins/skins/<name>.css after the page's own styles (see skins below).
 *
 * Plain ES2017, no build step. MIT, https://github.com/belibathan/nuikit
 */
(function () {
  "use strict";

  var SOURCES = ["https://cfx-nui-nuikit/theme.css", "nui://nuikit/theme.css"];

  // ── skins (systems/nuikit_skins) ────────────────────────────────────────────────────────────────
  //
  // A third-party page adds one line, `<script src="https://cfx-nui-nuikit_skins/skin.js" data-skin="qb-menu">`:
  // the server theme lands on its <html> as --nk-* (as on chat's page), and once it has, the skin's
  // stylesheet goes in after the page's own, re-pointing the page's own variables and selectors at
  // those tokens. Looks only: nothing here listens to, handles or posts anything of the page's. No
  // nuikit resource: no theme, so no skin either, and the page stays as it ships.
  var self = typeof document !== "undefined" ? document.currentScript : null;
  var SKIN = self && self.getAttribute ? self.getAttribute("data-skin") : null;

  /** skins/<name>.css next to the loader (`src` is the loader's own URL). */
  function skinUrl(src, name) {
    return String(src).replace(/[?#].*$/, "").replace(/[^/]*$/, "") + "skins/" + encodeURIComponent(name) + ".css";
  }

  function addSkin() {
    if (!SKIN || document.querySelector("link[data-nuikit-skin]")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = skinUrl(self.src, SKIN);
    link.setAttribute("data-nuikit-skin", SKIN);
    document.head.appendChild(link);
  }
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
      var pre = /^nk-/.test(k) ? "--" : "--nk-";
      var value = vars[k].replace(/var\(\s*--/g, "var(--nk-");
      var rgba = toRgba(value);
      if (rgba) {
        var rgb = rgba[0] + ", " + rgba[1] + ", " + rgba[2];
        out[pre + k] = rgba[3] === 1 ? "rgb(" + rgb + ")" : "rgba(" + rgb + ", " + rgba[3] + ")";
        out[pre + k + "-rgb"] = rgb;
        out[pre + k + "-a"] = String(rgba[3]);
      } else if (!/okl(ch|ab)\(|color-mix\(/.test(value)) {
        out[pre + k] = value;
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
    addSkin();
  }

  function apply(css) {
    applyDecls(themeDecls(css), importUrls(css));
  }

  /** A payload from the nuikit resource: { hash, theme: { vars, imports }, css?, prefs? }. */
  function applyPayload(p) {
    // the player's reduced-motion pref turns the smooth caret off, as on every nuikit page
    if (p && p.prefs && typeof document !== "undefined") {
      if (p.prefs.reducedMotion) document.documentElement.setAttribute("data-nk-motion", "reduced");
      else if (document.documentElement.getAttribute("data-nk-motion") === "reduced") document.documentElement.removeAttribute("data-nk-motion");
    }
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


  // ── smooth caret and typing ─────────────────────────────────────────────────────────────────────
  //
  // The kit's SmoothInput for chat's <textarea>: the field's own glyphs and caret go transparent and
  // a mirror of its text is drawn over it (same font, padding and scroll), the newly typed characters
  // easing up and a caret that glides between positions and breathes in the theme's primary. While
  // an IME composes, while there is a selection range, and when motion is off or reduced, it is the
  // plain native field. Focus, keys, history (up/down), selection and paste stay the browser's and
  // chat's own; nothing here posts or handles a key.

  var MIRRORED = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "wordSpacing", "textTransform", "textIndent", "textAlign", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "color"];
  var TYPE_MS = 210;
  var CARET_MS = 140;
  var EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

  /**
   * The motion levers from <html> (--nk-caret-time/ease, --nk-type-in-time/distance: the kit's, set by
   * the server theme or style.css's defaults), resolved by the browser itself on a probe so calc(), var()
   * and em all come out as numbers; the constants above only when a lever is missing.
   */
  function levers(el) {
    var probe = levers.probe;
    if (!probe || !probe.isConnected) {
      probe = levers.probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;" +
        "transition-duration:var(--nk-caret-time,140ms);transition-timing-function:var(--nk-caret-ease,cubic-bezier(0.2,0.8,0.2,1));" +
        "animation-duration:var(--nk-type-in-time,210ms);margin-left:var(--nk-type-in-distance,0.45em);";
      document.body.appendChild(probe);
    }
    probe.style.fontSize = getComputedStyle(el).fontSize;
    var cs = getComputedStyle(probe);
    var ms = function (v, d) {
      var n = parseFloat(v);
      if (!(n >= 0)) return d;
      return /ms$/.test(v) ? n : n * 1000;
    };
    var dist = parseFloat(cs.marginLeft);
    return {
      caret: ms(cs.transitionDuration, CARET_MS),
      ease: cs.transitionTimingFunction && cs.transitionTimingFunction !== "ease" ? cs.transitionTimingFunction : EASE,
      type: ms(cs.animationDuration, TYPE_MS),
      distance: dist >= 0 ? dist : 0,
    };
  }

  /** What was inserted going from `before` to `after`: [from, to) in `after`, or null. */
  function inserted(before, after) {
    if (before === after) return null;
    var p = 0;
    while (p < after.length && p < before.length && after[p] === before[p]) p++;
    var s = 0;
    while (s < after.length - p && s < before.length - p && after[after.length - 1 - s] === before[before.length - 1 - s]) s++;
    var to = after.length - s;
    return to > p ? [p, to] : null;
  }

  function motionOn() {
    var a = document.documentElement.getAttribute("data-nk-motion");
    if (a === "off" || a === "reduced") return false;
    return !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function smoothField(el) {
    var row = el.parentElement;
    if (!row || el.hasAttribute("data-nk-smooth")) return;
    el.setAttribute("data-nk-smooth", "");
    var overlay = document.createElement("div");
    overlay.className = "nk-smooth-mirror";
    overlay.setAttribute("aria-hidden", "true");
    var content = document.createElement("div");
    content.className = "nk-smooth-content";
    var caret = document.createElement("span");
    caret.className = "nk-smooth-caret";
    overlay.appendChild(content);
    row.appendChild(overlay);
    var last = el.value;
    var composing = false;
    var frame = 0;
    var breath = null;

    function hide() {
      overlay.style.visibility = "hidden";
      el.classList.remove("nk-smooth");
      if (breath) breath.cancel();
      breath = null;
    }

    function draw() {
      frame = 0;
      var value = el.value;
      var ins = inserted(last, value);
      last = value;
      var a = el.selectionStart == null ? value.length : el.selectionStart;
      var b = el.selectionEnd == null ? a : el.selectionEnd;
      if (!motionOn() || composing || a !== b || document.activeElement !== el || !el.isConnected) return hide();

      // the mirror sits exactly on the field (the row holds the mode prefix too)
      var cs = getComputedStyle(el);
      for (var i = 0; i < MIRRORED.length; i++) overlay.style[MIRRORED[i]] = cs[MIRRORED[i]];
      overlay.style.left = el.offsetLeft + "px";
      overlay.style.top = el.offsetTop + "px";
      overlay.style.width = el.offsetWidth + "px";
      overlay.style.height = el.offsetHeight + "px";

      var lv = levers(el);
      caret.style.transition = "transform " + lv.caret + "ms " + lv.ease;
      // the text as before / typed / after, with a zero-width marker at the caret
      while (content.firstChild) content.removeChild(content.firstChild);
      var cuts = [0, value.length, a];
      if (ins) cuts.push(ins[0], ins[1]);
      cuts = cuts
        .filter(function (c, j) {
          return cuts.indexOf(c) === j;
        })
        .sort(function (x, y) {
          return x - y;
        });
      var marker = null;
      for (var k = 0; k < cuts.length; k++) {
        var at = cuts[k];
        if (at === a) {
          marker = document.createElement("span");
          marker.className = "nk-smooth-marker";
          content.appendChild(marker);
        }
        var next = cuts[k + 1];
        if (next === undefined || next <= at) continue;
        var span = document.createElement("span");
        span.textContent = value.slice(at, next);
        if (ins && at >= ins[0] && next <= ins[1] && typeof span.animate === "function") {
          span.className = "nk-smooth-typed";
          span.animate([{ opacity: 0, transform: "translateY(" + lv.distance + "px)" }, { opacity: 1, transform: "translateY(0)" }], {
            duration: next - at > 12 ? lv.type * 1.5 : lv.type,
            easing: EASE,
          });
        }
        content.appendChild(span);
      }
      // an empty last line still has a height
      if (value.charAt(value.length - 1) === "\n") content.appendChild(document.createTextNode("​"));
      content.appendChild(caret);
      content.style.transform = "translate(" + -el.scrollLeft + "px, " + -el.scrollTop + "px)";

      caret.style.height = marker.offsetHeight + "px";
      caret.style.transform = "translate(" + marker.offsetLeft + "px, " + marker.offsetTop + "px)";
      el.classList.add("nk-smooth");
      overlay.style.visibility = "";
      // moving or typing restarts the breath, so the caret is solid while it moves
      if (breath) breath.cancel();
      breath =
        typeof caret.animate === "function"
          ? caret.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0.15, offset: 0.7 }, { opacity: 1 }], {
              duration: 1100,
              delay: 500,
              iterations: Infinity,
              easing: "ease-in-out",
            })
          : null;
    }

    function later() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    ["input", "keyup", "keydown", "mouseup", "focus", "blur", "select", "scroll"].forEach(function (e) {
      el.addEventListener(e, later);
    });
    el.addEventListener("compositionstart", function () {
      composing = true;
      later();
    });
    el.addEventListener("compositionend", function () {
      composing = false;
      later();
    });
    document.addEventListener("selectionchange", function () {
      if (document.activeElement === el) later();
    });
    hide();
    later();
  }

  /** Chat's input exists once its page has mounted: attach when it appears (and if it is replaced). */
  function watchInput() {
    if (typeof document === "undefined" || typeof MutationObserver !== "function") return;
    var current = null;
    var find = function () {
      if (current && current.isConnected) return;
      current = document.querySelector(".chat-input textarea");
      if (current) smoothField(current);
    };
    find();
    new MutationObserver(find).observe(document.documentElement, { childList: true, subtree: true });
  }

  var api = { skinUrl: skinUrl, inserted: inserted, parseTheme: parseTheme, toRgba: toRgba, themeDecls: themeDecls, varsDecls: varsDecls, importUrls: importUrls, apply: apply, applyPayload: applyPayload };
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    start();
    // chat's input only exists on chat's page
    if (!SKIN) watchInput();
  }
})();

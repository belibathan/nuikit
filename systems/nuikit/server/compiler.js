/* nuikit-core theme compiler (tokens v1) + doctor. MIT, https://github.com/belibathan/nuikit. Generated: do not edit (pnpm sync copies it from packages/core). */
"use strict";
var NuikitTheme = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/fxserver.ts
  var fxserver_exports = {};
  __export(fxserver_exports, {
    ADAPTER_PACKS: () => ADAPTER_PACKS,
    TOKENS_VERSION: () => TOKENS_VERSION,
    TOKEN_NAMES: () => TOKEN_NAMES,
    checkContrast: () => checkContrast,
    compareVersions: () => compareVersions,
    compileTheme: () => compileTheme,
    detectFramework: () => detectFramework,
    doctor: () => doctor,
    formatDoctor: () => formatDoctor,
    pageHash: () => pageHash,
    themeToCss: () => themeToCss,
    toDtcg: () => toDtcg
  });

  // src/color.ts
  function toRgba(input) {
    const v = input.trim().toLowerCase();
    if (v in NAMED) return [...NAMED[v]];
    let m = /^#([0-9a-f]{3,8})$/.exec(v);
    if (m) {
      let h = m[1];
      if (h.length === 5 || h.length === 7) return null;
      if (h.length <= 4) h = [...h].map((c2) => c2 + c2).join("");
      const n2 = (i) => parseInt(h.slice(i, i + 2), 16);
      return [n2(0), n2(2), n2(4), h.length === 8 ? round(n2(6) / 255) : 1];
    }
    m = /^(rgba?|hsla?|oklch|oklab)\((.*)\)$/.exec(v);
    if (!m) return null;
    const fn = m[1];
    if (/var\(|calc\(|from\s/.test(m[2])) return null;
    const [main, alphaRaw] = m[2].split("/");
    const parts = main.replace(/,/g, " ").trim().split(/\s+/);
    let alphaStr = alphaRaw == null ? void 0 : alphaRaw.trim();
    if (!alphaStr && parts.length === 4) alphaStr = parts.pop();
    const alpha = alphaStr === void 0 ? 1 : pct(alphaStr, 1);
    if (parts.length < 3) return null;
    let rgb;
    if (fn.startsWith("rgb")) rgb = parts.slice(0, 3).map((p) => pct(p, 255));
    else if (fn.startsWith("hsl")) rgb = hsl(hue(parts[0]), pct(parts[1], 1, true), pct(parts[2], 1, true));
    else if (fn === "oklch") rgb = oklchToRgb(pct(parts[0], 1), pct(parts[1], 0.4), hue(parts[2]));
    else rgb = oklab(pct(parts[0], 1), pct(parts[1], 0.4), pct(parts[2], 0.4));
    if (rgb.some((c2) => Number.isNaN(c2)) || Number.isNaN(alpha)) return null;
    return [...rgb.map((c2) => Math.round(Math.max(0, Math.min(255, c2)))), round(Math.max(0, Math.min(1, alpha)))];
  }
  function formatRgba(c2) {
    return c2[3] === 1 ? `rgb(${c2[0]}, ${c2[1]}, ${c2[2]})` : `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${c2[3]})`;
  }
  function oklchToRgb(L, C, Hdeg) {
    return gamutMap(L, C, Hdeg * Math.PI / 180);
  }
  function rgbToOklch(c2) {
    const lin = (x) => {
      const s2 = x / 255;
      return s2 <= 0.04045 ? s2 / 12.92 : ((s2 + 0.055) / 1.055) ** 2.4;
    };
    const r = lin(c2[0]);
    const g = lin(c2[1]);
    const b = lin(c2[2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const C = Math.hypot(A, B);
    let H = Math.atan2(B, A) * 180 / Math.PI;
    if (H < 0) H += 360;
    return { l: L, c: C, h: C < 1e-4 ? 0 : H };
  }
  function composite(top, bottom) {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    const ch = (i) => Math.round((top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a);
    return [ch(0), ch(1), ch(2), round(a)];
  }
  function luminance(c2) {
    const ch = (x) => {
      const s = x / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(c2[0]) + 0.7152 * ch(c2[1]) + 0.0722 * ch(c2[2]);
  }
  function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function mix(a, b, t) {
    const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
    return [ch(0), ch(1), ch(2), round(a[3] + (b[3] - a[3]) * t)];
  }
  var NAMED = {
    transparent: [0, 0, 0, 0],
    black: [0, 0, 0, 1],
    white: [255, 255, 255, 1]
  };
  function pct(s, scale, alwaysPercentLike = false) {
    if (s === "none") return 0;
    if (s.endsWith("%")) return parseFloat(s) / 100 * scale;
    const n2 = parseFloat(s);
    return alwaysPercentLike && n2 > 1 ? n2 / 100 : n2;
  }
  function hue(s) {
    const n2 = parseFloat(s);
    if (s.endsWith("rad")) return n2 * 180 / Math.PI;
    if (s.endsWith("turn")) return n2 * 360;
    return Number.isNaN(n2) ? 0 : n2;
  }
  function hsl(h, s, l) {
    const k = (n2) => (n2 + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n2) => l - a * Math.max(-1, Math.min(k(n2) - 3, 9 - k(n2), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  function gamutMap(L, C, H) {
    const at = (c2) => oklab(L, c2 * Math.cos(H), c2 * Math.sin(H));
    const inGamut = (rgb2) => rgb2.every((x) => x >= -0.5 && x <= 255.5);
    let rgb = at(C);
    if (inGamut(rgb) || L >= 1 || L <= 0) return rgb;
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const candidate = at(mid);
      const clipped = candidate.map((x) => Math.max(0, Math.min(255, x)));
      const delta = Math.hypot(...candidate.map((x, j) => x - clipped[j]));
      if (inGamut(candidate)) lo = mid;
      else if (delta < 5) return clipped;
      else hi = mid;
      rgb = at(lo);
    }
    return rgb;
  }
  function oklab(L, a, b) {
    const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
    const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
    const gamma = (x) => x <= 31308e-7 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return [gamma(r) * 255, gamma(g) * 255, gamma(bl) * 255];
  }
  var round = (n2) => Math.round(n2 * 1e3) / 1e3;

  // src/tokens.ts
  var TOKENS_VERSION = 1;
  var TOKENS_REVISION = "1.5";
  var DEFAULT_FONT_SANS = "Inter, ui-sans-serif, system-ui, sans-serif";
  var DEFAULT_FONT_DISPLAY = `"Inter Tight", ${DEFAULT_FONT_SANS}`;
  var DEFAULT_FONT_MONO = `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  var c = (name, description, fallback = "stock shadcn neutral") => ({ name, type: "color", group: "shadcn", description, fallback });
  var n = (name, type, description, fallback) => ({ name, type, group: "nuikit", description, fallback });
  var TOKENS = [
    c("background", "Full-screen surfaces (pause, loading, death scrim)"),
    c("foreground", "Text on full-screen surfaces"),
    c("card", "Raised blocks on a full-screen surface"),
    c("card-foreground", "Text on cards"),
    c("popover", "Every floating panel (nk-panel)"),
    c("popover-foreground", "Text in panels"),
    c("primary", "The one main action per surface, progress fills, selection"),
    c("primary-foreground", "Text on primary"),
    c("secondary", "Secondary buttons"),
    c("secondary-foreground", "Text on secondary"),
    c("muted", "Tracks, slots and wells inside a panel"),
    c("muted-foreground", "Secondary text"),
    c("accent", "Hover and keyboard highlight"),
    c("accent-foreground", "Text on accent"),
    c("destructive", "Danger, damage, low values, death"),
    c("destructive-foreground", "Text on destructive", "foreground or background, whichever contrasts more with destructive"),
    c("border", "Hairlines"),
    c("input", "Field borders"),
    c("ring", "Focus rings"),
    c("chart-1", "Categorical colour 1"),
    c("chart-2", "Categorical colour 2"),
    c("chart-3", "Categorical colour 3"),
    c("chart-4", "Categorical colour 4"),
    c("chart-5", "Categorical colour 5"),
    { name: "radius", type: "dimension", group: "shadcn", description: "Corner radius (panels radius + 4px, controls radius \u2212 2px)", fallback: "0.625rem" },
    { name: "font-sans", type: "fontFamily", group: "shadcn", description: "Text", fallback: DEFAULT_FONT_SANS },
    { name: "font-mono", type: "fontFamily", group: "shadcn", description: "Codes and IDs a player might type", fallback: DEFAULT_FONT_MONO },
    n("success", "color", "Positive status: done, paid, online", "oklch(L, C, 150): green at the lightness/chroma of destructive"),
    n("success-foreground", "color", "Text on success", "foreground or background, whichever contrasts more"),
    n("warning", "color", "Caution status: low fuel, about to expire", "oklch(L + 0.08, C, 75): amber at the lightness/chroma of destructive"),
    n("warning-foreground", "color", "Text on warning", "foreground or background, whichever contrasts more"),
    n("info", "color", "Neutral status: tips, notices", "primary"),
    n("info-foreground", "color", "Text on info", "primary-foreground"),
    n("hud", "color", "Surfaces drawn straight on the game: HUD chips, hotbar, target eye", "rgba(0, 0, 0, 0.45)"),
    n("hud-foreground", "color", "Text and icons on hud", "rgb(255, 255, 255)"),
    n("scrim", "color", "Darkens the game behind full-screen screens, bar tracks and shadows on the game; always used with opacity", "rgb(0, 0, 0)"),
    n("vital-health", "color", "Health bar", "chart-1 if red, else another red chart-*, else destructive if red, else oklch(0.68 0.21 25)"),
    n("vital-armor", "color", "Armor bar", "chart-2 if blue, else another blue chart-*, else oklch(0.68 0.16 250)"),
    n("vital-hunger", "color", "Hunger bar", "chart-3 if orange/amber, else another one, else oklch(0.78 0.16 70)"),
    n("vital-thirst", "color", "Thirst bar", "chart-4 if cyan/blue, else another one, else oklch(0.76 0.13 215)"),
    n("vital-stress", "color", "Stress bar", "chart-5 if purple/magenta, else another one, else oklch(0.68 0.2 320)"),
    n("nk-scale", "number", "UI size multiplier (unitless). Players can scale further (0.85\u20131.25).", "1"),
    n("nk-motion", "number", "1 = animations on, 0 = off. Painted as 0 when the theme or the player's reduced-motion pref turns motion down.", "1")
  ];
  var TOKEN_NAMES = TOKENS.map((t) => t.name);
  var id = (name, type, description, fallback, extra = {}) => ({ name, type, group: "identity", description, fallback, since: "1.1", ...extra });
  var dv = (name, type, description, fallback) => ({ name, type, group: "derived", description, fallback, since: "1.1" });
  var MOTION_FEELS = ["crisp", "snap", "smooth", "stepped"];
  var SPRING_PRESETS = ["snap", "move", "soft", "pop"];
  var mt = (name, type, description, fallback) => ({ name, type, group: "derived", description, fallback, since: "1.2" });
  var MOTION_TOKENS = [
    { name: "nk-motion-feel", type: "keyword", group: "identity", description: "How the identity moves: crisp (Graphite), snap (Signal: no glide on selection, flash instead of press scale), smooth (Velvet: longer springs, a hint of bounce), stepped (Vector: values tick in steps)", fallback: "crisp", values: MOTION_FEELS, since: "1.2" },
    { name: "nk-spring-bounce", type: "number", group: "identity", description: "Bounce folded into the snap, move and soft springs (0 = critically damped; 0.3 is the most the kit allows)", fallback: "0", range: [0, 0.3], since: "1.2" },
    mt("nk-motion-move", "number", "1 = things may move (translate, scale, rotate, FLIP, stagger); 0 under reduced motion or off, where only fades of at most 100ms are kept", "1"),
    mt("nk-time-instant", "duration", "State that must be immediate: keyboard and controller selection, held key-repeat", "0ms"),
    { ...mt("nk-time-snap", "duration", "The ladder (1.5): snap, 0.5 \xD7 d. A press, a rim switching state", "70ms"), since: "1.5" },
    { ...mt("nk-time-fast", "duration", "The ladder (1.5): fast, 0.667 \xD7 d. Hover, a deny beat", "93ms"), since: "1.5" },
    { ...mt("nk-time-slow", "duration", "The ladder (1.5): slow, 1.556 \xD7 d. A sheet or dialog opening, a confirm pop", "218ms"), since: "1.5" },
    mt("nk-time-press", "duration", "Press, toggle, key-chip flash: 0.5 \xD7 d, 50\u2013100ms", "70ms"),
    mt("nk-time-hover", "duration", "Pointer hover colour and row background: 0.75 \xD7 d", "105ms"),
    mt("nk-time-base", "duration", "Panel and menu enter, the selection indicator, tab switch: d (kit.css --nk-time)", "140ms"),
    mt("nk-time-exit", "duration", "Every exit (panel, toast, menu, modal): 0.7 \xD7 d", "98ms"),
    mt("nk-time-move", "duration", "Toasts entering, FLIP moves, meters gaining: 1.5 \xD7 d, at most 300ms", "210ms"),
    mt("nk-time-modal", "duration", "Dialog enter (on an inner wrapper): 1.25 \xD7 d", "175ms"),
    mt("nk-time-screen", "duration", "Full-screen enter (pause, death, loading): 2.5 \xD7 d, at most 400ms", "350ms"),
    mt("nk-time-ambient", "duration", "HUD show-on-change fades and the damage trail; not scaled by the identity", "400ms"),
    mt("nk-stagger", "duration", "Delay per item on a list's first open: 0.15 \xD7 d (snap and smooth 0.125 \xD7 d), at most 20ms (smooth 30ms)", "20ms"),
    mt("nk-stagger-max", "duration", "Total stagger cap: items past the fifth enter together", "100ms"),
    mt("nk-ease-out", "cubicBezier", "Enter, hover, anything arriving: the identity's --nk-ease", "nk-ease"),
    mt("nk-ease-in", "cubicBezier", "Exits (speeds up as it leaves)", "cubic-bezier(0.4, 0, 1, 1)"),
    mt("nk-ease-in-out", "cubicBezier", "On-screen moves (indicator, FLIP, tab underline) when not a spring", "cubic-bezier(0.2, 0, 0, 1)"),
    mt("nk-ease-emphasized", "cubicBezier", "Full-screen enter, big moments", "cubic-bezier(0.05, 0.7, 0.1, 1)"),
    mt("nk-ease-linear", "keyword", "Progress, countdowns, streamed values, needles", "linear"),
    mt("nk-spring-snap", "keyword", "Spring (duration, bounce): selection indicator, tab underline, needle catch-up", "160ms 0"),
    mt("nk-spring-move", "keyword", "Spring (duration, bounce): toasts in, FLIP reflow, drawers, digit roll", "240ms 0.1"),
    mt("nk-spring-soft", "keyword", "Spring (duration, bounce): full-screen content, large frame changes", "360ms 0"),
    mt("nk-spring-pop", "keyword", "Spring (duration, bounce): rewards only (item added, level-up, a \xD73 badge)", "260ms 0.3")
  ];
  var SPRING_RATIO = {
    crisp: [1.15, 1.7, 2.55, 1.85],
    snap: [1.1, 1.65, 2.5, 1.8],
    smooth: [1.08, 1.42, 1.75, 1.5],
    stepped: [1, 1.43, 2.15, 1.7]
  };
  var SPRING_MAX = [400, 400, 450, 400];
  var MAX_DURATION_MS = 260;
  function motionTokens(d, feel = "crisp", bounce = 0, opts = {}) {
    var _a;
    const ms = (x) => `${Math.round(x)}ms`;
    const exit = opts.exitFactor !== void 0 && Number.isFinite(opts.exitFactor) ? opts.exitFactor : 0.7;
    const b = Math.max(0, Math.min(0.3, bounce));
    const r = (_a = SPRING_RATIO[feel]) != null ? _a : SPRING_RATIO.crisp;
    const bounces = [b, Math.max(0.1, b), b, Math.max(0.3, b)];
    const out = {
      "nk-motion-move": "1",
      "nk-time-instant": "0ms",
      "nk-time-press": ms(Math.max(50, Math.min(100, d * 0.5))),
      "nk-time-hover": ms(d * 0.75),
      "nk-time-base": ms(d),
      "nk-time-exit": ms(d * exit),
      "nk-time-move": ms(Math.min(300, d * 1.5)),
      "nk-time-modal": ms(d * 1.25),
      "nk-time-screen": ms(Math.min(400, d * 2.5)),
      "nk-time-ambient": "400ms",
      "nk-stagger": ms(feel === "smooth" ? Math.min(30, d * 0.125) : Math.min(20, d * (feel === "snap" ? 0.125 : 0.15))),
      "nk-stagger-max": "100ms",
      // tokens 1.4: the extra rungs (foundation.md §9)
      "nk-time-confirm": ms(Math.max(60, d * 0.65)),
      "nk-time-retract": ms(Math.min(300, d * 1.55)),
      "nk-time-fill": ms(d * 3),
      "nk-time-pulse": "1000ms",
      // tokens 1.5: the ladder (ink.md §2): snap .5, fast .667, base 1, slow 1.556, fill 2.333 × d
      "nk-time-snap": ms(d * 0.5),
      "nk-time-fast": ms(d * 0.667),
      "nk-time-slow": ms(d * 1.556)
    };
    if (opts.ladder) {
      out["nk-time-fill"] = ms(d * 2.333);
      out["nk-time-press"] = out["nk-time-snap"];
      out["nk-time-hover"] = out["nk-time-fast"];
      for (const k of ["nk-time-move", "nk-time-modal", "nk-time-confirm", "nk-time-retract", "nk-time-screen"]) out[k] = out["nk-time-slow"];
      out["nk-time-ambient"] = out["nk-time-fill"];
    }
    SPRING_PRESETS.forEach((name, i) => {
      const t = Math.min(SPRING_MAX[i], Math.round(d * r[i] / 10) * 10);
      out[`nk-spring-${name}`] = `${t}ms ${Math.round(bounces[i] * 1e3) / 1e3}`;
    });
    return out;
  }
  var TREATMENTS = ["soft", "glass", "plate", "slab", "tile"];
  var TREATMENT_PRESETS = {
    soft: {},
    glass: {
      "nk-surface-edge": "0.12",
      "nk-surface-gradient": "0.06",
      "nk-elevation": "deep",
      "nk-focus-style": "halo",
      "nk-motion-feel": "smooth",
      "nk-material-hud-blur": "1.25rem",
      "nk-material-menu-blur": "2rem",
      "nk-material-overlay-blur": "0.5rem"
    },
    plate: {
      "nk-cut": "0.5rem",
      "nk-surface-edge": "0.1",
      "nk-label-case": "uppercase",
      "nk-tracking-label": "0.1em",
      "nk-row-indicator": "outline",
      "nk-focus-style": "bar",
      "nk-motion-feel": "stepped",
      "nk-material-menu-texture": "scanlines",
      "nk-material-hud-radius": "0px",
      "nk-material-menu-radius": "0px"
    },
    slab: {
      "nk-border-width": "2px",
      "nk-elevation": "hard",
      "nk-surface-opacity": "1",
      "nk-surface-tint": "0",
      "nk-surface-edge": "0",
      "nk-display-style": "italic",
      "nk-skew": "-8deg",
      "nk-weight-display": "900",
      "nk-motion-feel": "snap",
      "nk-row-indicator": "fill",
      "nk-focus-style": "fill",
      "nk-focus-shift": "0.25rem",
      "nk-hold-style": "fill",
      "nk-level-style": "slab",
      "nk-slash": "cut"
    },
    /**
     * tile (1.5, docs/design/ink.md): Ink's values, so Ink is `tile` plus a palette. One slanted keycap language
     * on hard plates, fill-based status, italic caps for anything scanned, the 1.5 motion ladder.
     */
    tile: {
      "nk-density": "1",
      "nk-duration": "180ms",
      "nk-elevation": "hard",
      "nk-display-style": "italic",
      "nk-label-case": "uppercase",
      "nk-row-indicator": "sweep",
      "nk-hold-style": "fill",
      "nk-confirm-scale": "1.08",
      "nk-stagger": "40ms",
      "nk-surface-edge": "0",
      "nk-surface-gradient": "0",
      // scales
      "nk-r-key": "0.25rem",
      "nk-r-chip": "0.375rem",
      "nk-r-control": "0.5rem",
      "nk-r-surface": "0.75rem",
      "nk-h-key": "1.5rem",
      "nk-h-chip": "1.75rem",
      "nk-h-control": "2.25rem",
      "nk-h-row": "3rem",
      "nk-text-key": "0.8125rem",
      // type roles: Barlow italic caps (font-display) for anything scanned, the sans for sentences
      ...Object.fromEntries(
        ["scan", "title", "label", "num"].flatMap((r) => [
          [`nk-type-${r}-family`, "var(--font-display)"],
          [`nk-type-${r}-style`, "italic"],
          [`nk-type-${r}-weight`, r === "scan" || r === "title" ? "800" : "700"],
          [`nk-type-${r}-tracking`, r === "label" ? "0.03em" : r === "num" ? "0.01em" : "0.02em"],
          [`nk-type-${r}-case`, r === "num" ? "none" : "uppercase"],
          [`nk-type-${r}-pad`, "0.15em"]
        ])
      ),
      // tile
      "nk-tile-face": "rgb(22, 22, 22)",
      "nk-tile-ink": "rgb(255, 255, 255)",
      "nk-tile-light": "rgba(255, 255, 255, 0.16)",
      "nk-tile-shade": "rgba(0, 0, 0, 0)",
      "nk-tile-rim": "rgba(255, 255, 255, 0.32)",
      "nk-tile-rim-focus": "rgba(255, 255, 255, 0.4)",
      "nk-tile-plate": "rgb(115, 115, 115)",
      "nk-tile-plate-dim": "rgb(38, 38, 38)",
      "nk-tile-plate-x": "2px",
      "nk-tile-plate-y": "2px",
      "nk-tile-press": "1px",
      "nk-tile-skew": "-12deg",
      // plate (surface recipe)
      "nk-plate": "rgb(10, 10, 10)",
      "nk-plate-hair": "rgba(255, 255, 255, 0.12)",
      "nk-plate-drop": "0 0.125rem 0 rgba(0, 0, 0, 0.6)",
      // fill
      "nk-fill-color": "var(--foreground)",
      "nk-fill-track": "rgba(255, 255, 255, 0.12)",
      "nk-fill-tint": "rgba(255, 255, 255, 0.12)",
      "nk-fill-edge": "rgba(255, 255, 255, 0.4)",
      // motion distances
      "nk-lift": "0.5rem",
      "nk-rise": "0.5rem",
      "nk-land-scale": "0.6",
      "nk-deny-x": "0.3125rem"
    }
  };
  var ROLE_SETS = {
    vitals: ["health", "armor", "hunger", "thirst", "stress", "stamina", "oxygen"],
    status: ["info", "success", "warning", "danger"],
    faction: ["police", "ems", "mech", "gang", "civ", "staff"],
    rarity: ["common", "uncommon", "rare", "epic", "legendary"],
    brand: ["brand"],
    neutral: ["neutral"]
  };
  var ROLES = Object.values(ROLE_SETS).flat();
  var ROLE_DEFAULTS = {
    health: "vital-health",
    armor: "vital-armor",
    hunger: "vital-hunger",
    thirst: "vital-thirst",
    stress: "vital-stress",
    stamina: "success",
    oxygen: "info",
    info: "info",
    success: "success",
    warning: "warning",
    danger: "destructive",
    police: [0.62, 0.17, 255],
    ems: [0.64, 0.2, 25],
    mech: [0.74, 0.15, 60],
    gang: [0.6, 0.2, 305],
    civ: "muted-foreground",
    staff: "brand",
    common: "muted-foreground",
    uncommon: [0.72, 0.17, 145],
    rare: [0.66, 0.16, 250],
    epic: [0.62, 0.22, 305],
    legendary: [0.78, 0.16, 75],
    brand: "brand",
    neutral: "muted-foreground"
  };
  var f14 = (name, type, description, fallback, extra = {}) => ({ name, type, group: "identity", description, fallback, since: "1.4", ...extra });
  var d14 = (name, type, description, fallback) => ({ name, type, group: "derived", description, fallback, since: "1.4" });
  var MATERIAL_CONTEXTS = { hud: "HUD parts drawn over the game", menu: "menus, sheets and dialogs", overlay: "full-screen overlays (pause, death, loading)" };
  var MS = [0, 6e4];
  var FOUNDATION_TOKENS = [
    f14("nk-treatment", "keyword", "How the palette is drawn: soft (Graphite), glass, plate or slab. Fills material, stroke, type, focus and motion defaults; any value the theme sets wins", "soft", { values: TREATMENTS }),
    f14("nk-focus-style", "keyword", "Every component's focus (controller and keyboard highlight)", "ring", { values: ["ring", "halo", "tint", "fill", "invert", "bar"] }),
    f14("nk-hold-style", "keyword", "How a press-and-hold shows its progress", "bar", { values: ["bar", "ring", "fill"] }),
    f14("nk-confirm-scale", "number", "The short pop of a confirm", "1.04", { range: [1, 1.2] }),
    f14("nk-level-style", "keyword", "How a level (--level, 0\u20131) is drawn by meters, vitals, holds, timers and cooldowns", "bar", { values: ["bar", "ring", "liquid", "slab", "pips"] }),
    ...ROLES.map((r) => f14(`role-${r}`, "color", `Role colour ${r}: the --hue-* ramp under data-hue="${r}"`, typeof ROLE_DEFAULTS[r] === "string" ? String(ROLE_DEFAULTS[r]) : `oklch(${ROLE_DEFAULTS[r].join(" ")})`)),
    ...ROLES.flatMap((r) => [
      d14(`role-${r}-deep`, "color", `${r}, darker: the ramp's deep step and gradient end`, `role-${r}, OKLCH lightness \u2212 0.12`),
      d14(`role-${r}-light`, "color", `${r}, lighter: the ramp's gradient start`, `role-${r}, OKLCH lightness + 0.1`)
    ]),
    f14("nk-hue-line", "number", "Alpha of a role's line (borders, tracks)", "0.5", { range: [0, 1] }),
    f14("nk-hue-tint", "number", "Alpha of a role's tint (fills behind text)", "0.14", { range: [0, 1] }),
    f14("nk-hue-glow", "number", "Alpha of a role's glow (under the glow budget)", "0.45", { range: [0, 1] }),
    f14("nk-hue-alert", "number", "Alpha of a role's alert wash (below the alert threshold)", "0.24", { range: [0, 1] }),
    ...Object.entries(MATERIAL_CONTEXTS).flatMap(([ctx, what]) => [
      f14(`nk-material-${ctx}-opacity`, "number", `Surface opacity of ${what}`, ctx === "hud" ? "nk-hud-opacity" : "nk-surface-opacity", { range: [0, 1] }),
      f14(`nk-material-${ctx}-blur`, "dimension", `Backdrop blur behind ${what}`, "0px"),
      f14(`nk-material-${ctx}-radius`, "dimension", `Corner radius of ${what}`, "radius"),
      f14(`nk-material-${ctx}-edge`, "number", `Inner top highlight of ${what} (alpha)`, "nk-surface-edge", { range: [0, 0.3] }),
      f14(`nk-material-${ctx}-texture`, "keyword", `Texture over ${what}`, "none", { values: ["none", "scanlines"] })
    ]),
    f14("nk-backdrop", "keyword", "Backdrop filters (blur behind materials, the death screen's desaturation): off by default, because FiveM's NUI draws backdrop-filter as a black box over the game; on applies each surface's --nk-backdrop-filter (browser previews, clients that draw it right)", "off", { values: ["on", "off"] }),
    f14("nk-slash", "keyword", "A decorative diagonal cut on menus, at most once per full-screen moment", "none", { values: ["none", "cut"] }),
    f14("nk-legibility", "keyword", "night: as designed. day: surfaces and hairlines lifted for a bright sky (not a light theme). auto: day while the game clock says so (html[data-nk-daytime], set by the HUD)", "auto", { values: ["auto", "night", "day"] }),
    f14("nk-legibility-lift", "number", "How far day closes the gap to opaque (0 none, 1 fully opaque)", "0.5", { range: [0, 1] }),
    f14("nk-alert-threshold", "number", "A level at or under this is an alert (vitals, durability)", "0.2", { range: [0, 1] }),
    f14("nk-fuel-threshold", "number", "Fuel alert level", "0.15", { range: [0, 1] }),
    ...["info", "success", "warning", "danger"].map((s) => f14(`nk-notify-ms-${s}`, "duration", `How long a ${s} notice stays`, "5000ms", { range: MS })),
    f14("nk-hold-ms", "duration", "Press-and-hold time", "800ms", { range: MS }),
    f14("nk-cooldown-ms", "duration", "Default cooldown after an action", "0ms", { range: MS }),
    f14("nk-rest-delay", "duration", "How long an idle HUD part waits before it retracts (0 = never)", "0ms", { range: MS }),
    f14("nk-motion-profile", "keyword", "full: as designed. reduced: no movement, short fades. instant: nothing animates", "full", { values: ["full", "reduced", "instant"] }),
    d14("nk-ease-standard", "cubicBezier", "On-screen moves", "nk-ease-in-out"),
    d14("nk-ease-expand", "cubicBezier", "Things opening and growing", "nk-ease-emphasized"),
    d14("nk-ease-retract", "cubicBezier", "Things closing and tucking away", "nk-ease-in"),
    d14("nk-ease-spring", "cubicBezier", "An overshoot without a spring (confirm pops)", "cubic-bezier(0.34, 1.56, 0.64, 1)"),
    d14("nk-ease-breathe", "cubicBezier", "Loops (alerts, pulses)", "cubic-bezier(0.37, 0, 0.63, 1)"),
    d14("nk-time-confirm", "duration", "A confirm pop: 0.65 \xD7 d, at least 60ms", "91ms"),
    d14("nk-time-retract", "duration", "A HUD part tucking away: 1.55 \xD7 d, at most 300ms", "217ms"),
    d14("nk-time-fill", "duration", "A level filling or draining: 3 \xD7 d", "420ms"),
    d14("nk-time-pulse", "duration", "One alert pulse", "1000ms"),
    ...["world", "hud", "scrim", "surface", "dim", "dialog", "system"].map((l, i) => f14(`nk-z-${l}`, "number", `Stacking layer: ${l}. A modal is the current surface + dim + dialog`, String((i + 1) * 10), { range: [0, 1e5] })),
    f14("nk-focus-shift", "dimension", "The focused row's nudge toward its content", "0rem"),
    f14("nk-glow-budget", "number", "How many elements may glow at once (the top surface's focused one first); 0 = no limit", "1", { range: [0, 8] })
  ];
  var IDENTITY_TOKENS = [
    id("brand", "color", "The server's signature colour: active indicators, gauge needles, focus, logos (not the action: that's primary)", "primary if chromatic (OKLCH C \u2265 0.06), else chart-1"),
    id("brand-foreground", "color", "Text on brand", "foreground or background, whichever contrasts more"),
    id("world-foreground", "color", "Text and icons drawn straight on the game, no panel (death text, unplated HUD values, nk-on-game). Light in every theme, light or dark", "rgb(255, 255, 255)"),
    id("world-foreground-muted", "color", "Secondary text on the game", "world-foreground at 80% (3:1 on a mid-grey frame)"),
    id("world-shadow", "shadow", "Text-shadow that keeps world-foreground legible over any frame", "0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)"),
    id("world-success", "color", "A gain drawn on the game or the HUD plate (slab deltas: +2, $250). Reads on the dark plate in every theme, light or dark", "success, OKLCH lightness at least 0.7", { since: "1.3" }),
    id("world-destructive", "color", "A loss drawn on the game or the HUD plate (slab deltas: \u22121)", "destructive, OKLCH lightness at least 0.7", { since: "1.3" }),
    id("font-display", "fontFamily", "Headings and big moments (titles, timers, the balance)", "font-sans; Inter Tight when font-sans is the default Inter"),
    id("font-numeric", "fontFamily", "Every number on a gauge, money or timer (always tabular)", "font-sans"),
    id("nk-type-ratio", "number", "Step between type sizes: 1.125 calm \u2026 1.333 dramatic", "1.2", { range: [1, 1.6] }),
    id("nk-weight-body", "number", "Body text weight", "400", { range: [100, 900] }),
    id("nk-weight-strong", "number", "Titles, key numbers, active rows", "600", { range: [100, 900] }),
    id("nk-weight-display", "number", "Display type (full-screen titles, big numbers)", "700", { range: [100, 900] }),
    id("nk-tracking-display", "dimension", "Letter-spacing of display type", "-0.02em"),
    id("nk-label-case", "keyword", "Captions (the short names of values) in uppercase or as written", "uppercase", { values: ["none", "uppercase"] }),
    id("nk-tracking-label", "dimension", "Letter-spacing of captions (uppercase wants 0.06\u20130.12em)", "0.06em"),
    id("nk-border-width", "dimension", "Hairline weight of panels, rows and fields", "1px"),
    id("nk-cut", "dimension", "Chamfered corners (top left, bottom right), drawn with clip-path; 0 = off", "0px"),
    id("nk-display-style", "keyword", "Display, heading, title and numeric text upright or italic (a real italic face where the font has one)", "normal", { values: ["normal", "italic"], since: "1.3" }),
    id("nk-pause-style", "keyword", "The pause menu: a full-height sheet, or a light slash panel with a diagonal edge into the scene", "sheet", { values: ["sheet", "slash"], since: "1.3" }),
    id("nk-pause-surface", "color", "The slash pause panel's light surface", "rgb(246, 247, 249)", { since: "1.3" }),
    id("nk-pause-ink", "color", "Text on the slash pause panel", "rgb(14, 16, 20)", { since: "1.3" }),
    id("nk-skew", "dimension", "Badges, chips, key caps, tags and the primary / selected bar drawn skewed (their text stays upright); 0deg = off, at most \xB120deg", "0deg", { since: "1.3" }),
    id("nk-surface-opacity", "number", "Panel opacity over the game (floor 0.92 for text panels)", "0.96", { range: [0, 1] }),
    id("nk-surface-tint", "number", "How much brand tints neutral surfaces (0\u20130.12)", "0.02", { range: [0, 0.12] }),
    id("nk-surface-gradient", "number", "Top-to-bottom light falloff on panels (0 = flat)", "0", { range: [0, 0.2] }),
    id("nk-surface-edge", "number", "Inner top highlight, the machined edge (alpha)", "0.06", { range: [0, 0.3] }),
    id("nk-elevation", "keyword", "Shadow recipe of floating panels: none, soft, deep, or hard (a solid offset drop, no blur; tokens 1.3)", "soft", { values: ["none", "soft", "deep", "hard"] }),
    id("nk-glow", "number", "Brand glow on active parts and HUD fills (alpha, 0 = off)", "0", { range: [0, 1] }),
    id("nk-density", "number", "Multiplies the kit's spacing scale: 0.875 compact (Graphite) \u2026 1.15 roomy", "0.875", { range: [0.75, 1.3] }),
    id("nk-ease", "cubicBezier", "The one easing curve", "cubic-bezier(0.2, 0.8, 0.2, 1)"),
    id("nk-duration", "duration", "Base duration (panel enter, transitions); \xD7 nk-motion", "140ms"),
    id("nk-hud-opacity", "number", "Minimum backplate opacity of HUD chips and tiles", "0.55", { range: [0, 1] }),
    id("nk-hud-text-shadow", "keyword", "Shadow under text drawn on the game", "soft", { values: ["none", "soft", "strong"] }),
    id("nk-gauge-style", "keyword", "How gauges are drawn", "arc", { values: ["arc", "bar", "digital"] }),
    id("nk-gauge-track", "dimension", "Gauge and meter track thickness", "0.25rem"),
    id("nk-gauge-ticks", "number", "Tick marks on gauges: 1 on, 0 off", "1", { range: [0, 1] }),
    id("nk-row-indicator", "keyword", "How the active row is marked: bar, fill, outline, or sweep (1.5: no bar, the row's --nk-fill-tint sweep alone)", "bar", { values: ["bar", "fill", "outline", "sweep"] }),
    dv("surface", "color", "Floating panel surface: popover tinted by brand (\xD7 nk-surface-tint); drawn at nk-surface-opacity", "mix(popover, brand, nk-surface-tint)"),
    dv("nk-elevation-shadow", "shadow", "The box-shadow nk-elevation names, in scrim colour", "from nk-elevation"),
    dv("nk-hud-shadow", "shadow", "The text-shadow nk-hud-text-shadow names, in scrim colour", "from nk-hud-text-shadow"),
    dv("nk-row-bar", "number", "1 when nk-row-indicator is bar", "from nk-row-indicator"),
    dv("nk-row-fill", "number", "1 when nk-row-indicator is fill", "from nk-row-indicator"),
    dv("nk-row-outline", "number", "1 when nk-row-indicator is outline", "from nk-row-indicator"),
    dv("nk-clip", "keyword", "clip-path of panels: the nk-cut chamfer, or none when nk-cut is 0 (a clip-path would also clip the shadow)", "from nk-cut"),
    dv("nk-clip-sm", "keyword", "clip-path of chips, tiles and buttons: half the panel chamfer", "from nk-cut"),
    ...MOTION_TOKENS,
    ...FOUNDATION_TOKENS,
    // tokens 1.5: the motion inputs the compiler needs (the rest of 1.5 is KIT_TOKENS, kit.css defaults)
    { ...id("nk-exit-factor", "number", "Every exit is this \xD7 its enter (--nk-time-exit = base \xD7 factor)", "0.7", { range: [0.3, 1] }), since: "1.5" },
    { ...id("nk-time-reduced", "duration", "The one reduced-motion duration: under reduced motion every fade is at most this", "100ms", { range: [0, 400] }), since: "1.5" }
  ];
  var k15 = (name, type, description, fallback, extra = {}) => ({ name, type, group: "identity", description, fallback, since: "1.5", css: true, ...extra });
  var SCALE_TOKENS = [
    k15("nk-space-unit", "dimension", "The spacing step: 0.25rem \xD7 --nk-density (aliases --nk-space)", "calc(0.25rem * nk-density)"),
    ...[1, 2, 3, 4, 6, 8].map((n2) => k15(`nk-space-${n2}`, "dimension", `${n2} \xD7 the spacing step`, `${n2} \xD7 nk-space-unit`)),
    k15("nk-gap-cluster", "dimension", "Icon + text, key + label", "nk-space-2"),
    k15("nk-gap-items", "dimension", "Items in a bar", "nk-space-1"),
    k15("nk-pad-x", "dimension", "Inline padding of anything labelled", "nk-space-3"),
    k15("nk-pad-surface", "dimension", "Padding of a surface (dialog body, sheet column)", "nk-space-6"),
    k15("nk-r-key", "dimension", "Radius of keys and tiles (aliased by --nk-key-radius)", "max(0.25rem, radius \u2212 4px)"),
    k15("nk-r-chip", "dimension", "Radius of chips and badges (aliased by --nk-chip-radius)", "max(0.25rem, radius \u2212 4px)"),
    k15("nk-r-control", "dimension", "Radius of buttons, fields and rows (aliased by --nk-row-radius)", "radius \u2212 2px"),
    k15("nk-r-surface", "dimension", "Radius of panels, sheets and dialogs", "nk-material-menu-radius"),
    k15("nk-h-key", "dimension", "Height of a key / small tile", "1.25rem"),
    k15("nk-h-chip", "dimension", "Height of a chip / medium tile (aliased by --nk-chip-height)", "calc(2rem * nk-density)"),
    k15("nk-h-control", "dimension", "Height of buttons, fields and bar items / large tile", "2.25rem"),
    k15("nk-h-row", "dimension", "Height of a list row (aliased by --nk-row-height)", "calc(2.75rem * nk-density)"),
    k15("nk-icon-sm", "dimension", "Small icon", "0.75rem"),
    k15("nk-icon-md", "dimension", "Icon next to text (the default)", "1rem"),
    k15("nk-icon-lg", "dimension", "Large icon", "1.25rem"),
    k15("nk-icon-stroke", "number", "Icon stroke width", "2", { range: [0.5, 4] })
  ];
  var TYPE_ROLES = ["scan", "title", "label", "num", "body"];
  var ROLE_WHAT = { scan: "keys, buttons, tabs", title: "titles", label: "labels", num: "numbers", body: "sentences" };
  var TYPE_ROLE_TOKENS = [
    k15("nk-text-key", "dimension", "Size of the scan role (keys, buttons, tabs)", "0.8125rem"),
    k15("nk-text-body", "dimension", "Size of the body role", "nk-text-base"),
    ...TYPE_ROLES.flatMap((r) => [
      k15(`nk-type-${r}-family`, "fontFamily", `Font of the ${r} role (${ROLE_WHAT[r]})`, r === "body" ? "font-sans" : r === "scan" ? "nk-key-font" : r === "num" ? "font-numeric" : r === "title" ? "nk-heading-font" : "font-sans"),
      k15(`nk-type-${r}-style`, "keyword", `normal or italic, for the ${r} role`, r === "title" || r === "num" || r === "scan" ? "nk-display-style" : "normal", { values: ["normal", "italic"] }),
      k15(`nk-type-${r}-weight`, "number", `Weight of the ${r} role`, r === "scan" ? "nk-weight-strong" : r === "title" ? "nk-heading-weight" : r === "body" ? "nk-weight-body" : r === "label" ? "500" : "inherit", { range: [100, 900] }),
      k15(`nk-type-${r}-tracking`, "dimension", `Letter-spacing of the ${r} role`, r === "title" ? "nk-heading-tracking" : r === "num" ? "-0.02em" : "0em"),
      k15(`nk-type-${r}-case`, "keyword", `Case of the ${r} role`, r === "title" ? "nk-heading-case" : "none", { values: ["none", "uppercase"] }),
      k15(`nk-type-${r}-pad`, "dimension", `Trailing pad of the ${r} role (the italic overhang)`, "0em")
    ])
  ];
  var TILE_TOKENS = [
    k15("nk-tile-face", "color", "The tile's face (aliased by --nk-key-bg)", "muted"),
    k15("nk-tile-ink", "color", "The legend on the face (aliased by --nk-key-fg)", "popover-foreground"),
    k15("nk-tile-light", "color", "The face's top hairline", "popover-foreground at 1.5 \xD7 nk-surface-edge"),
    k15("nk-tile-shade", "color", "The face's bottom inner shade", "scrim at 0.35"),
    k15("nk-tile-rim", "color", "The face's 1px rim (aliased by --nk-key-border)", "border"),
    k15("nk-tile-rim-focus", "color", "The rim while focused", "ring"),
    k15("nk-tile-plate", "color", "The solid plate behind the face", "border"),
    k15("nk-tile-plate-dim", "color", "The plate on the HUD", "nk-tile-plate"),
    k15("nk-tile-plate-x", "dimension", "How far the plate sits right of the face (0 = no plate)", "0px; 0.1875rem under --nk-skew"),
    k15("nk-tile-plate-y", "dimension", "How far the plate sits below the face", "0px; 0.1875rem under --nk-skew"),
    k15("nk-tile-press", "dimension", "How far a held tile presses toward its plate", "1px"),
    k15("nk-tile-skew", "dimension", "The face's slant (the box stays upright); at most \xB120deg", "nk-skew"),
    k15("nk-tile-confirm-face", "color", "The face when confirmed or active", "foreground"),
    k15("nk-tile-confirm-ink", "color", "The legend when confirmed or active", "background"),
    k15("nk-tile-hold", "color", "The hold fill over the face", "foreground at 0.35"),
    k15("nk-tile-tag-delay", "duration", "The tag opens this long after the tile lands", "80ms")
  ];
  var PLATE_TOKENS = [
    k15("nk-plate", "color", "The plate colour (its channels, --nk-plate-rgb, are drawn at the context's material opacity)", "surface"),
    k15("nk-plate-hair", "color", "The plate's hairline", "nk-panel-border"),
    k15("nk-plate-drop", "shadow", "The plate's drop: hard, no blur", "nk-panel-shadow"),
    k15("nk-plate-radius", "dimension", "The plate's radius", "nk-r-surface")
  ];
  var FILL_TOKENS = [
    k15("nk-fill-color", "color", "The bar", "brand"),
    k15("nk-fill-track", "color", "The track behind the bar", "nk-meter-track"),
    k15("nk-fill-tint", "color", "The row sweep (a fill at level 1)", "accent"),
    k15("nk-fill-edge", "color", "The bar's leading 1px edge", "transparent"),
    k15("nk-fill-alert", "color", "The bar at or under the alert threshold", "destructive")
  ];
  var MOTION_15_TOKENS = [
    k15("nk-lift", "dimension", "Row slide and slot lift on focus", "0rem"),
    k15("nk-rise", "dimension", "How far things rise as they enter", "0.5rem"),
    k15("nk-land-scale", "number", "The scale a tile lands from", "1", { range: [0, 1] }),
    k15("nk-deny-x", "dimension", "The deny shake's distance (two beats of fast)", "0.3125rem")
  ];
  var HYGIENE_TOKENS = [
    k15("nk-chip-shape", "keyword", "Vital chip shape", "auto", { values: ["auto", "square", "rounded", "circle", "diamond", "hex", "chamfer"] }),
    k15("nk-label-attach", "keyword", "Where a chip's label sits", "inline", { values: ["inline", "tag", "flag", "none"] }),
    k15("nk-vital-icon", "keyword", "Vital icons: each vital's own, or one uniform glyph", "vital", { values: ["vital", "uniform"] }),
    k15("nk-vital-display", "keyword", "What a vital chip shows", "auto", { values: ["auto", "pill", "value", "icon", "expand"] }),
    k15("nk-vital-neighbours", "keyword", "What a growing chip does to its neighbours", "push", { values: ["push", "collapse", "overlay"] })
  ];
  var KIT_TOKENS = [...SCALE_TOKENS, ...TYPE_ROLE_TOKENS, ...TILE_TOKENS, ...PLATE_TOKENS, ...FILL_TOKENS, ...MOTION_15_TOKENS, ...HYGIENE_TOKENS];
  var chamferClip = (cut) => `polygon(${cut} 0, 100% 0, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, 0 100%, 0 ${cut})`;
  var ALL_TOKENS = [...TOKENS, ...IDENTITY_TOKENS, ...KIT_TOKENS];
  var ALL_TOKEN_NAMES = ALL_TOKENS.map((t) => t.name);
  var SPEC = new Map(ALL_TOKENS.map((t) => [t.name, t]));
  var NEUTRAL = {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.145 0 0)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.97 0 0)",
      "secondary-foreground": "oklch(0.205 0 0)",
      muted: "oklch(0.97 0 0)",
      "muted-foreground": "oklch(0.556 0 0)",
      accent: "oklch(0.97 0 0)",
      "accent-foreground": "oklch(0.205 0 0)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
      "chart-1": "oklch(0.87 0 0)",
      "chart-2": "oklch(0.556 0 0)",
      "chart-3": "oklch(0.439 0 0)",
      "chart-4": "oklch(0.371 0 0)",
      "chart-5": "oklch(0.269 0 0)",
      radius: "0.625rem"
    },
    dark: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.205 0 0)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.205 0 0)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.922 0 0)",
      "primary-foreground": "oklch(0.205 0 0)",
      secondary: "oklch(0.269 0 0)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.269 0 0)",
      "muted-foreground": "oklch(0.708 0 0)",
      accent: "oklch(0.269 0 0)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.556 0 0)",
      "chart-1": "oklch(0.87 0 0)",
      "chart-2": "oklch(0.556 0 0)",
      "chart-3": "oklch(0.439 0 0)",
      "chart-4": "oklch(0.371 0 0)",
      "chart-5": "oklch(0.269 0 0)"
    }
  };
  var VITALS = [
    { name: "vital-health", chart: 1, hues: [[345, 360], [0, 35]], fallback: [0.68, 0.21, 25], theme: "destructive" },
    { name: "vital-armor", chart: 2, hues: [[200, 285]], fallback: [0.68, 0.16, 250] },
    { name: "vital-hunger", chart: 3, hues: [[40, 110]], fallback: [0.78, 0.16, 70] },
    { name: "vital-thirst", chart: 4, hues: [[180, 260]], fallback: [0.76, 0.13, 215] },
    { name: "vital-stress", chart: 5, hues: [[285, 345]], fallback: [0.68, 0.2, 320] }
  ];
  var CONTRAST_PAIRS = [
    ["foreground", "background", 4.5, "text on full-screen surfaces (pause, loading, death) will be hard to read"],
    ["popover-foreground", "popover", 4.5, "text in panels will be hard to read"],
    ["card-foreground", "card", 4.5, "text on cards will be hard to read"],
    ["primary-foreground", "primary", 4.5, "text on buttons will be hard to read"],
    ["muted-foreground", "popover", 3, "secondary text in panels will be hard to read"],
    ["hud-foreground", "hud", 3, "HUD text will be hard to read over a bright sky"],
    ["destructive", "popover", 3, "errors and low values in panels won't stand out"],
    ["success-foreground", "success", 3, "text on success badges will be hard to read"],
    ["warning-foreground", "warning", 3, "text on warning badges will be hard to read"]
  ];
  var IMPORT_RE = /@import\s+(?:url\(\s*(["'])(.*?)\1\s*\)|url\(\s*([^)\s]+)\s*\)|(["'])(.*?)\4)[^;]*;/g;
  function importUrls(css) {
    var _a, _b, _c;
    const urls = [];
    for (const m of css.matchAll(IMPORT_RE)) {
      const url = ((_c = (_b = (_a = m[2]) != null ? _a : m[3]) != null ? _b : m[5]) != null ? _c : "").trim();
      if (/^https?:\/\//.test(url)) urls.push(url);
    }
    return urls;
  }
  function parseThemeCss(css) {
    const out = { light: {}, dark: {}, theme: {}, imports: [] };
    const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
    out.imports = importUrls(src);
    const body = src.replace(IMPORT_RE, "");
    const stack = [];
    let seg = "";
    const target = () => {
      if (stack.length === 0) return out.light;
      if (stack.some((s) => /^@theme\b/.test(s))) return out.theme;
      if (stack.some((s) => /\.dark\b|\[data-theme=["']?dark|\[data-mode=["']?dark|prefers-color-scheme:\s*dark/.test(s))) return out.dark;
      const last = stack[stack.length - 1];
      if (/(^|[\s,])(:root|:host|html)\b/.test(last)) return out.light;
      return null;
    };
    const decl = (text) => {
      const m = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(text);
      if (!m) return;
      const into = target();
      if (!into) return;
      const value = m[2].replace(/\s*!important$/, "").trim();
      if (into === out.theme) {
        if (/var\(/.test(value)) return;
        into[m[1].replace(/^color-/, "")] = value;
        return;
      }
      into[m[1]] = value;
    };
    let paren = 0;
    for (const ch of body) {
      if (ch === "(") paren++;
      else if (ch === ")") paren = Math.max(0, paren - 1);
      if (paren > 0) {
        seg += ch;
        continue;
      }
      if (ch === "{") {
        stack.push(seg.trim());
        seg = "";
      } else if (ch === "}") {
        decl(seg);
        seg = "";
        stack.pop();
      } else if (ch === ";") {
        decl(seg);
        seg = "";
      } else seg += ch;
    }
    decl(seg);
    return out;
  }
  function isDtcg(o) {
    if (Object.keys(o).some((k) => k.startsWith("$"))) return true;
    return Object.values(o).some((v) => v !== null && typeof v === "object" && ("$value" in v || Object.values(v).some((x) => x !== null && typeof x === "object" && "$value" in x)));
  }
  function isCompiled(o) {
    return !!o && typeof o === "object" && typeof o.version === "number" && !!o.vars && typeof o.vars === "object";
  }
  function parseDtcg(doc) {
    const flat = /* @__PURE__ */ new Map();
    const walk = (node, path, type) => {
      const t = typeof node.$type === "string" ? node.$type : type;
      if ("$value" in node) {
        flat.set(path.join("."), { value: node.$value, type: t });
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith("$") || !v || typeof v !== "object") continue;
        walk(v, [...path, k], t);
      }
    };
    walk(doc, []);
    const resolve = (value, depth = 0) => {
      var _a;
      if (typeof value === "string") {
        const ref = /^\{([^}]+)\}$/.exec(value);
        if (ref && depth < 10) return resolve((_a = flat.get(ref[1])) == null ? void 0 : _a.value, depth + 1);
      }
      return value;
    };
    const vars = {};
    for (const [path, { value, type }] of flat) {
      const parts = path.split(".");
      if (parts[0] === "color" || parts[0] === "colors" || parts[0] === "dimension") parts.shift();
      const name = parts.join("-");
      const v = dtcgValue(resolve(value), type);
      if (name && v !== null) vars[name] = v;
    }
    return vars;
  }
  function dtcgValue(value, type) {
    var _a;
    if (value === void 0 || value === null) return null;
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (Array.isArray(value) && type === "cubicBezier" && value.length === 4) return `cubic-bezier(${value.join(", ")})`;
    if (Array.isArray(value)) return value.map((f) => /[\s"']/.test(String(f)) && !/^["']/.test(String(f)) ? `"${f}"` : String(f)).join(", ");
    if (typeof value === "object") {
      const o = value;
      if ("colorSpace" in o || "components" in o || "hex" in o || type === "color") {
        const alpha = typeof o.alpha === "number" ? o.alpha : 1;
        const comps = Array.isArray(o.components) ? o.components : null;
        const space = String((_a = o.colorSpace) != null ? _a : "srgb");
        if (comps && comps.every((x) => typeof x === "number" || x === "none")) {
          const num = comps.map((x) => x === "none" ? 0 : x);
          if (space === "srgb") return formatRgba([...num.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)), alpha]);
          if (space === "oklch") return formatRgba([...oklchToRgb(num[0], num[1], num[2]).map((x) => Math.round(Math.max(0, Math.min(255, x)))), alpha]);
          if (space === "hsl") return `hsl(${num[0]} ${num[1]}% ${num[2]}% / ${alpha})`;
        }
        if (typeof o.hex === "string") return o.hex;
        return null;
      }
      if ("value" in o && "unit" in o) return `${o.value}${o.unit}`;
    }
    return null;
  }
  function compileTheme(input, opts = {}) {
    var _a, _b, _c, _d, _e, _f, _g;
    const warnings = [];
    const requested = (_a = opts.mode) != null ? _a : "dark";
    let mode = requested;
    let raw = {};
    let imports = [];
    if (typeof input === "string" && /^\s*\{/.test(input)) {
      try {
        input = JSON.parse(input);
      } catch {
        warnings.push("The theme looks like JSON but doesn't parse; it was read as CSS.");
      }
    }
    if (typeof input === "string") {
      const p = parseThemeCss(input);
      imports = p.imports;
      const hasDark = Object.keys(p.dark).length > 0;
      const hasLight = Object.keys(p.light).length > 0;
      if (requested === "dark" && !hasDark && hasLight && !opts.partial) {
        mode = "light";
        warnings.push("The theme has no dark colours (.dark block), so its light colours are used in game. Paste the full TweakCN export, including .dark.");
      }
      raw = mode === "dark" ? { ...p.theme, ...p.light, ...p.dark } : { ...p.theme, ...p.light };
      if (!hasDark && !hasLight && Object.keys(p.theme).length === 0 && !opts.partial) warnings.push("The theme has no variables; the stock theme is used.");
    } else if (isCompiled(input)) {
      raw = { ...input.vars };
      imports = (Array.isArray(input.imports) ? input.imports : Object.values((_b = input.imports) != null ? _b : {})).filter((u) => typeof u === "string");
      mode = (_c = input.mode) != null ? _c : mode;
    } else if (input && typeof input === "object" && isDtcg(input)) {
      raw = parseDtcg(input);
      const ext = (_d = input.$extensions) == null ? void 0 : _d["dev.nuikit"];
      if ((ext == null ? void 0 : ext.mode) === "light" || (ext == null ? void 0 : ext.mode) === "dark") mode = ext.mode;
      if (Array.isArray(ext == null ? void 0 : ext.imports)) imports = ext.imports.filter((u) => typeof u === "string");
    } else if (input && typeof input === "object") {
      for (const [k, v] of Object.entries(input)) if (typeof v === "string" || typeof v === "number") raw[k.replace(/^--/, "")] = String(v);
    }
    const resolved = {};
    const base = opts.partial ? raw : { ...NEUTRAL[mode], ...raw };
    const DANGLING = /^var\(\s*--([\w-]+)\s*\)$/;
    const nothing = (v) => v.trim() === "" || DANGLING.test(v.trim());
    const lookup = (name, depth) => {
      const v = base[name];
      if (v === void 0 || depth > 8) return void 0;
      const r = resolveRefs(v, depth + 1);
      return nothing(r) ? void 0 : r;
    };
    const resolveRefs = (value, depth) => value.replace(/var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, ref, fb) => {
      var _a2, _b2;
      return (_b2 = (_a2 = lookup(ref, depth)) != null ? _a2 : fb == null ? void 0 : fb.trim()) != null ? _b2 : m;
    });
    const missing = [];
    for (const t of TOKENS) if (t.group === "shadcn" && t.type === "color" && raw[t.name] === void 0 && NEUTRAL[mode][t.name] !== void 0) missing.push(t.name);
    if (!opts.partial && missing.length && missing.length < 23) {
      warnings.push(`The theme doesn't set ${missing.map((m) => `--${m}`).join(", ")}; stock shadcn values are used.`);
    }
    for (const [name, value] of Object.entries(base)) {
      const v = resolveRefs(String(value), 0);
      if (nothing(v)) {
        const stock = opts.partial ? void 0 : NEUTRAL[mode][name];
        const ref = (_e = DANGLING.exec(v.trim())) == null ? void 0 : _e[1];
        const why = v.trim() === "" ? "is empty" : `is ${v.trim()}, which ${ref !== void 0 && base[ref] !== void 0 ? "resolves to nothing" : "isn't defined"}`;
        warnings.push(`--${name} ${why}; ${stock ? "the stock value is used" : "it was left out"}.`);
        if (stock) resolved[name] = lower(stock);
        continue;
      }
      const lowered = lower(v);
      if (lowered === null) {
        const stock = opts.partial ? void 0 : NEUTRAL[mode][name];
        warnings.push(
          `--${name} uses ${/color-mix/.test(v) ? "color-mix()" : "a colour format"} that FiveM's browser can't read (${v}); ${stock ? "the stock value is used" : "it was left out"}.`
        );
        if (stock) resolved[name] = lower(stock);
        continue;
      }
      resolved[name] = lowered;
    }
    if (!opts.partial) {
      const given = new Set(Object.keys(resolved));
      derive(resolved, mode, warnings);
      deriveIdentity(resolved, warnings, given);
    } else if (resolved["nk-scale"] !== void 0 || resolved["nk-motion"] !== void 0) derive(resolved, mode, warnings, true);
    if (opts.highContrast) highContrast(resolved);
    const contrast = checkContrast(resolved);
    for (const r of contrast) {
      if (r.ok) continue;
      const reason = (_g = (_f = CONTRAST_PAIRS.find(([f, b]) => f === r.fg && b === r.bg)) == null ? void 0 : _f[3]) != null ? _g : "it will be hard to read";
      warnings.push(`${r.fg} on ${r.bg} is ${r.ratio.toFixed(1)}:1 (needs ${r.min}:1); ${reason}.`);
    }
    const vars = order(resolved);
    return { version: TOKENS_VERSION, revision: TOKENS_REVISION, mode, vars, imports, warnings, contrast, hash: hash(JSON.stringify([vars, imports])) };
  }
  function lower(value) {
    const v = value.trim();
    const whole = toRgba(v);
    if (whole) return formatRgba(whole);
    if (/color-mix\(|\b(?:lab|lch|color)\(/.test(v)) return null;
    let failed = false;
    const out = v.replace(/\b(?:oklch|oklab|hsla?|rgba?)\([^()]*\)/g, (m) => {
      const c2 = toRgba(m);
      if (!c2) failed = true;
      return c2 ? formatRgba(c2) : m;
    });
    return failed && /okl(?:ch|ab)\(/.test(out) ? null : out;
  }
  function rgba(vars, name) {
    const v = vars[name];
    return v === void 0 ? null : toRgba(v);
  }
  var fmtOklch = (L, C, H) => formatRgba([...oklchToRgb(L, C, H).map((x) => Math.round(Math.max(0, Math.min(255, x)))), 1]);
  var clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  var WHITE = [255, 255, 255, 1];
  var BLACK = [0, 0, 0, 1];
  var WORLD_SHADOW = "0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)";
  var MID_GREY = [128, 128, 128, 1];
  function bestText(vars, bg) {
    const solid = opaque(bg, vars);
    const candidates = [rgba(vars, "foreground"), rgba(vars, "background"), WHITE, BLACK].filter((x) => !!x && x[3] === 1);
    let best = candidates[0];
    let bestRatio = 0;
    for (const cand of candidates) {
      const r = contrastRatio(cand, solid);
      if (r > bestRatio + 0.5) {
        best = cand;
        bestRatio = r;
      }
    }
    return formatRgba(best);
  }
  function opaque(c2, vars, over = ["background"]) {
    if (c2[3] >= 1) return c2;
    let under = BLACK;
    for (const name of [...over].reverse()) {
      const u = rgba(vars, name);
      if (u) under = composite(u, under);
    }
    return composite(c2, under);
  }
  function inHue(h, ranges) {
    return ranges.some(([a, b]) => h >= a && h <= b);
  }
  function vitalFit(c2, ranges) {
    if (!c2 || c2[3] < 1) return false;
    const o = rgbToOklch(c2);
    return o.c >= 0.06 && o.l >= 0.45 && o.l <= 0.93 && inHue(o.h, ranges);
  }
  function derive(vars, mode, warnings, onlyNumbers = false) {
    var _a, _b;
    const scale = vars["nk-scale"] === void 0 ? 1 : parseFloat(vars["nk-scale"]);
    if (Number.isNaN(scale) || scale < 0.5 || scale > 2) {
      warnings.push(`--nk-scale must be a number between 0.5 and 2 (got ${vars["nk-scale"]}); 1 is used.`);
      vars["nk-scale"] = "1";
    } else vars["nk-scale"] = String(scale);
    const motion = vars["nk-motion"];
    if (motion !== void 0 && motion !== "0" && motion !== "1") {
      warnings.push(`--nk-motion must be 0 or 1 (got ${motion}); 1 is used.`);
      vars["nk-motion"] = "1";
    } else vars["nk-motion"] = motion != null ? motion : "1";
    if (onlyNumbers) return;
    for (const t of TOKENS) if (t.group === "shadcn" && t.type !== "color" && vars[t.name] === void 0) vars[t.name] = t.fallback;
    const destructive = (_a = rgba(vars, "destructive")) != null ? _a : toRgba(NEUTRAL[mode].destructive);
    const d = rgbToOklch(destructive);
    const L = clamp(d.l, mode === "dark" ? 0.62 : 0.5, 0.8);
    const C = clamp(d.c, 0.12, 0.2);
    if (vars["destructive-foreground"] === void 0) vars["destructive-foreground"] = bestText(vars, destructive);
    if (vars.success === void 0) vars.success = fmtOklch(L, C, 150);
    if (vars["success-foreground"] === void 0) vars["success-foreground"] = bestText(vars, toRgba(vars.success));
    if (vars.warning === void 0) vars.warning = fmtOklch(clamp(L + 0.08, 0, 0.86), C, 75);
    if (vars["warning-foreground"] === void 0) vars["warning-foreground"] = bestText(vars, toRgba(vars.warning));
    if (vars.info === void 0) vars.info = vars.primary;
    if (vars["info-foreground"] === void 0) vars["info-foreground"] = vars["primary-foreground"];
    if (vars.hud === void 0) vars.hud = "rgba(0, 0, 0, 0.45)";
    const world = (_b = rgba(vars, "world-foreground")) != null ? _b : WHITE;
    if (vars["world-foreground"] === void 0) vars["world-foreground"] = formatRgba(world);
    if (vars["world-foreground-muted"] === void 0) vars["world-foreground-muted"] = formatRgba([world[0], world[1], world[2], 0.8]);
    if (vars["world-shadow"] === void 0) vars["world-shadow"] = WORLD_SHADOW;
    for (const [world2, status] of [["world-success", "success"], ["world-destructive", "destructive"]]) {
      const c2 = vars[world2] === void 0 ? rgba(vars, status) : null;
      if (!c2) continue;
      const o = rgbToOklch(c2);
      vars[world2] = fmtOklch(Math.max(o.l, 0.7), o.c, o.h);
    }
    if (vars["hud-foreground"] === void 0) vars["hud-foreground"] = vars["world-foreground"];
    if (vars.scrim === void 0) vars.scrim = "rgb(0, 0, 0)";
    const used = /* @__PURE__ */ new Set();
    for (const v of VITALS) {
      if (vars[v.name] !== void 0) continue;
      const chart = (i) => rgba(vars, `chart-${i}`);
      let pick;
      if (vitalFit(chart(v.chart), v.hues) && !used.has(v.chart)) {
        pick = vars[`chart-${v.chart}`];
        used.add(v.chart);
      } else {
        for (let i = 1; i <= 5 && !pick; i++) {
          if (used.has(i) || !vitalFit(chart(i), v.hues)) continue;
          pick = vars[`chart-${i}`];
          used.add(i);
        }
      }
      if (!pick && "theme" in v && vitalFit(rgba(vars, v.theme), v.hues)) pick = vars[v.theme];
      vars[v.name] = pick != null ? pick : fmtOklch(v.fallback[0], v.fallback[1], v.fallback[2]);
    }
  }
  var NUM = /^-?(?:\d+\.?\d*|\.\d+)$/;
  var DIM = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)$/;
  var DUR = /^(\d+\.?\d*|\.\d+)(ms|s)$/;
  var BEZIER = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;
  var EASE_KEYWORDS = {
    linear: "cubic-bezier(0, 0, 1, 1)",
    ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    "ease-in": "cubic-bezier(0.42, 0, 1, 1)",
    "ease-out": "cubic-bezier(0, 0, 0.58, 1)",
    "ease-in-out": "cubic-bezier(0.42, 0, 0.58, 1)"
  };
  var trimNum = (n2) => String(Math.round(n2 * 1e4) / 1e4);
  function identityValue(spec, raw) {
    var _a, _b;
    const v = raw.trim();
    if (spec.name === "nk-skew" || spec.name === "nk-tile-skew") {
      if (v === "0") return "0deg";
      const m = /^(-?\d*\.?\d+)deg$/.exec(v);
      if (!m) return null;
      const n2 = parseFloat(m[1]);
      return Math.abs(n2) <= 20 ? `${trimNum(n2)}deg` : null;
    }
    switch (spec.type) {
      case "number": {
        if (!NUM.test(v)) return null;
        const n2 = parseFloat(v);
        if (spec.range && (n2 < spec.range[0] || n2 > spec.range[1])) return null;
        return trimNum(n2);
      }
      case "dimension": {
        if (v === "0") return "0px";
        const m = DIM.exec(v);
        return m ? `${trimNum(parseFloat(m[1]))}${m[2]}` : null;
      }
      case "duration": {
        const m = DUR.exec(v);
        if (!m) return null;
        const ms = parseFloat(m[1]) * (m[2] === "s" ? 1e3 : 1);
        const [lo, hi] = (_a = spec.range) != null ? _a : [0, 2e3];
        return ms >= lo && ms <= hi ? `${trimNum(ms)}ms` : null;
      }
      case "cubicBezier": {
        const k = EASE_KEYWORDS[v];
        if (k) return k;
        const m = BEZIER.exec(v);
        if (!m) return null;
        const [x1, y1, x2, y2] = m.slice(1).map(Number);
        if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
        return `cubic-bezier(${[x1, y1, x2, y2].map(trimNum).join(", ")})`;
      }
      case "keyword":
        return ((_b = spec.values) == null ? void 0 : _b.includes(v)) ? v : null;
      default:
        return v || null;
    }
  }
  var chromatic = (c2) => !!c2 && c2[3] > 0 && rgbToOklch(c2).c >= 0.06;
  function elevationShadow(level, s) {
    if (level === "none") return `0 0 0 0 rgba(${s}, 0)`;
    if (level === "hard") return `0 0.25rem 0 0 rgba(${s}, 0.5)`;
    if (level === "deep")
      return `0 0 0 1px rgba(${s}, 0.3), 0 2px 4px rgba(${s}, 0.2), 0 18px 40px -10px rgba(${s}, 0.55), 0 44px 96px -28px rgba(${s}, 0.75)`;
    return `0 0 0 1px rgba(${s}, 0.25), 0 12px 32px -16px rgba(${s}, 0.6)`;
  }
  function hudTextShadow(level, s) {
    if (level === "none") return "none";
    if (level === "strong") return `0 0 2px rgba(${s}, 0.9), 0 1px 3px rgba(${s}, 0.8)`;
    return `0 1px 2px rgba(${s}, 0.6)`;
  }
  function hudPlateOverWhite(vars) {
    var _a;
    const hud = rgba(vars, "hud");
    if (!hud) return null;
    const a = Math.max(hud[3], parseFloat((_a = vars["nk-hud-opacity"]) != null ? _a : "0") || 0);
    return composite([hud[0], hud[1], hud[2], a], WHITE);
  }
  var REF_DEFAULTS = new Set(Object.keys(MATERIAL_CONTEXTS).flatMap((c2) => [`nk-material-${c2}-opacity`, `nk-material-${c2}-radius`, `nk-material-${c2}-edge`]));
  function applyTreatment(vars, warnings) {
    const raw = vars["nk-treatment"];
    let t = "soft";
    if (raw !== void 0) {
      if (TREATMENTS.includes(raw.trim())) t = raw.trim();
      else warnings.push(`--nk-treatment must be ${TREATMENTS.join(", ")} (got ${raw}); soft is used.`);
    }
    vars["nk-treatment"] = t;
    for (const [k, v] of Object.entries(TREATMENT_PRESETS[t])) if (vars[k] === void 0) vars[k] = v;
  }
  function deriveFoundation(vars) {
    var _a, _b;
    for (const role of ROLES) {
      const name = `role-${role}`;
      if (vars[name] === void 0) {
        const d = ROLE_DEFAULTS[role];
        vars[name] = typeof d === "string" ? (_a = vars[d]) != null ? _a : vars.foreground : fmtOklch(d[0], d[1], d[2]);
      }
      const c2 = rgba(vars, name);
      if (!c2) continue;
      const { l, c: ch, h } = rgbToOklch(c2);
      if (vars[`${name}-deep`] === void 0) vars[`${name}-deep`] = fmtOklch(clamp(l - 0.12, 0.2, 1), ch * 0.9, h);
      if (vars[`${name}-light`] === void 0) vars[`${name}-light`] = fmtOklch(clamp(l + 0.1, 0, 0.95), ch * 0.85, h);
    }
    for (const ctx of Object.keys(MATERIAL_CONTEXTS)) {
      const k = (p) => `nk-material-${ctx}-${p}`;
      if (vars[k("opacity")] === void 0) vars[k("opacity")] = vars[ctx === "hud" ? "nk-hud-opacity" : "nk-surface-opacity"];
      if (vars[k("radius")] === void 0) vars[k("radius")] = (_b = vars.radius) != null ? _b : "0.625rem";
      if (vars[k("edge")] === void 0) vars[k("edge")] = vars["nk-surface-edge"];
    }
  }
  function deriveIdentity(vars, warnings, given = /* @__PURE__ */ new Set()) {
    var _a, _b, _c, _d;
    applyTreatment(vars, warnings);
    for (const spec of IDENTITY_TOKENS) {
      if (spec.type === "color" || spec.type === "fontFamily" || spec.type === "shadow" || spec.group === "derived") continue;
      const value = vars[spec.name];
      if (value === void 0) {
        if (!REF_DEFAULTS.has(spec.name)) vars[spec.name] = spec.fallback;
        continue;
      }
      const v = identityValue(spec, value);
      if (v === null) {
        const want = spec.values ? spec.values.join(", ") : spec.range ? `a number from ${spec.range[0]} to ${spec.range[1]}` : spec.type === "dimension" ? "a length in px, rem or em" : spec.type === "duration" ? "a duration up to 2000ms" : "cubic-bezier(x1, y1, x2, y2)";
        warnings.push(`--${spec.name} must be ${want} (got ${value}); ${spec.fallback} is used.`);
        if (REF_DEFAULTS.has(spec.name)) delete vars[spec.name];
        else vars[spec.name] = spec.fallback;
      } else vars[spec.name] = v;
    }
    for (const spec of KIT_TOKENS) {
      const value = vars[spec.name];
      if (value === void 0 || spec.type === "color" || spec.type === "fontFamily" || spec.type === "shadow") continue;
      if (/^(calc|var|max|min|clamp)\(/.test(value.trim())) continue;
      const v = identityValue(spec, value);
      if (v === null) {
        const want = spec.values ? spec.values.join(", ") : spec.range ? `a number from ${spec.range[0]} to ${spec.range[1]}` : spec.type === "dimension" ? "a length in px, rem or em" : spec.type === "duration" ? "a duration up to 2000ms" : "a valid value";
        warnings.push(`--${spec.name} must be ${want} (got ${value}); the kit default is used.`);
        delete vars[spec.name];
      } else vars[spec.name] = v;
    }
    if (vars.brand === void 0) {
      const primary = rgba(vars, "primary");
      vars.brand = chromatic(primary) || !vars["chart-1"] ? vars.primary : vars["chart-1"];
    }
    const brand = (_a = rgba(vars, "brand")) != null ? _a : rgba(vars, "primary");
    if (vars["brand-foreground"] === void 0) vars["brand-foreground"] = bestText(vars, brand);
    const sans = (_b = vars["font-sans"]) != null ? _b : DEFAULT_FONT_SANS;
    if (vars["font-display"] === void 0) vars["font-display"] = sans === DEFAULT_FONT_SANS ? DEFAULT_FONT_DISPLAY : sans;
    if (vars["font-numeric"] === void 0) vars["font-numeric"] = sans;
    if (vars.surface === void 0) {
      const pop = rgba(vars, "popover");
      if (pop) {
        const t = parseFloat(vars["nk-surface-tint"]);
        const m = mix(pop, [brand[0], brand[1], brand[2], pop[3]], t);
        vars.surface = formatRgba(m);
      }
    }
    const scrim = (_c = rgba(vars, "scrim")) != null ? _c : BLACK;
    const s = `${scrim[0]}, ${scrim[1]}, ${scrim[2]}`;
    if (vars["nk-elevation-shadow"] === void 0) vars["nk-elevation-shadow"] = elevationShadow(vars["nk-elevation"], s);
    if (vars["nk-hud-shadow"] === void 0) vars["nk-hud-shadow"] = hudTextShadow(vars["nk-hud-text-shadow"], s);
    const cut = parseFloat(vars["nk-cut"]);
    if (vars["nk-clip"] === void 0) vars["nk-clip"] = cut > 0 ? chamferClip("var(--nk-cut)") : "none";
    if (vars["nk-clip-sm"] === void 0) vars["nk-clip-sm"] = cut > 0 ? chamferClip("calc(var(--nk-cut) / 2)") : "none";
    const ind = vars["nk-row-indicator"];
    for (const k of ["bar", "fill", "outline"]) if (vars[`nk-row-${k}`] === void 0) vars[`nk-row-${k}`] = ind === k ? "1" : "0";
    const d = parseFloat(vars["nk-duration"]);
    const motion = motionTokens(d, vars["nk-motion-feel"], parseFloat(vars["nk-spring-bounce"]), {
      exitFactor: parseFloat((_d = vars["nk-exit-factor"]) != null ? _d : "0.7"),
      ladder: vars["nk-treatment"] === "tile"
    });
    motion["nk-ease-out"] = vars["nk-ease"];
    motion["nk-ease-in"] = "cubic-bezier(0.4, 0, 1, 1)";
    motion["nk-ease-in-out"] = "cubic-bezier(0.2, 0, 0, 1)";
    motion["nk-ease-emphasized"] = "cubic-bezier(0.05, 0.7, 0.1, 1)";
    motion["nk-ease-linear"] = "linear";
    motion["nk-ease-standard"] = motion["nk-ease-in-out"];
    motion["nk-ease-expand"] = motion["nk-ease-emphasized"];
    motion["nk-ease-retract"] = motion["nk-ease-in"];
    motion["nk-ease-spring"] = "cubic-bezier(0.34, 1.56, 0.64, 1)";
    motion["nk-ease-breathe"] = "cubic-bezier(0.37, 0, 0.63, 1)";
    for (const [k, v] of Object.entries(motion)) if (vars[k] === void 0) vars[k] = v;
    if (d > MAX_DURATION_MS) warnings.push(`--nk-duration is ${d}ms (the kit's ceiling is ${MAX_DURATION_MS}ms); panels and menus will feel slow to a player who opens them hundreds of times.`);
    deriveFoundation(vars);
    const op = parseFloat(vars["nk-surface-opacity"]);
    if (op < 0.92) warnings.push(`--nk-surface-opacity is ${op} (floor 0.92); the game will show through text in panels, and a bright sky will wash it out.`);
    const plate = hudPlateOverWhite(vars);
    const hudFg = rgba(vars, "hud-foreground");
    if (plate && hudFg) {
      const ratio = contrastRatio(composite(hudFg, plate), plate);
      if (ratio < 4.5)
        warnings.push(`hud-foreground on the HUD backplate over a white sky is ${ratio.toFixed(1)}:1 (needs 4.5:1); raise --nk-hud-opacity or darken --hud so HUD text reads over snow and midday sky.`);
    }
    for (const name of ["world-foreground", "world-foreground-muted"]) {
      if (!given.has(name)) continue;
      const c2 = rgba(vars, name);
      if (!c2) continue;
      const onGrey = composite(c2, MID_GREY);
      const ratio = contrastRatio(onGrey, MID_GREY);
      const lighter = contrastRatio(onGrey, BLACK) > contrastRatio(MID_GREY, BLACK);
      if (!lighter || ratio < 3)
        warnings.push(`--${name} is ${lighter ? `${ratio.toFixed(1)}:1 against a mid-grey frame (needs 3:1)` : "darker than a mid-grey frame"}; text drawn straight on the game (death text, unplated HUD values) will be hard to read. Keep it light, whatever the theme's mode.`);
    }
  }
  function highContrast(vars) {
    const best = (bg) => {
      const b = rgba(vars, bg);
      if (!b) return void 0;
      const solid = opaque(b, vars);
      return contrastRatio(WHITE, solid) >= contrastRatio(BLACK, solid) ? WHITE : BLACK;
    };
    for (const [fg, bg] of [
      ["foreground", "background"],
      ["popover-foreground", "popover"],
      ["card-foreground", "card"],
      ["accent-foreground", "accent"],
      ["secondary-foreground", "secondary"],
      ["primary-foreground", "primary"]
    ]) {
      const b = best(bg);
      if (b) vars[fg] = formatRgba(b);
    }
    const text = rgba(vars, "popover-foreground");
    const panel = rgba(vars, "popover");
    const muted = rgba(vars, "muted-foreground");
    if (text && panel && muted) {
      let m = muted;
      for (let t = 0.1; t <= 1 && contrastRatio(opaque(m, vars), opaque(panel, vars)) < 7; t += 0.1) m = mix(muted, text, t);
      vars["muted-foreground"] = formatRgba(m);
      vars.border = formatRgba([text[0], text[1], text[2], 0.35]);
      vars.input = formatRgba([text[0], text[1], text[2], 0.45]);
    }
    vars.hud = "rgba(0, 0, 0, 0.72)";
    vars["hud-foreground"] = "rgb(255, 255, 255)";
    vars["world-foreground"] = "rgb(255, 255, 255)";
    vars["world-foreground-muted"] = "rgba(255, 255, 255, 0.85)";
    if (vars["nk-surface-opacity"] !== void 0) vars["nk-surface-opacity"] = "1";
    if (vars["nk-hud-opacity"] !== void 0) vars["nk-hud-opacity"] = "0.72";
    return vars;
  }
  function checkContrast(vars) {
    const out = [];
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      const f = rgba(vars, fg);
      const b = rgba(vars, bg);
      if (!f || !b) continue;
      const under = bg === "hud" ? composite(b, WHITE) : opaque(b, vars, bg === "background" ? [] : ["background"]);
      const over = composite(f, under);
      const ratio = Math.round(contrastRatio(over, under) * 100) / 100;
      out.push({ fg, bg, ratio, min, ok: ratio >= min });
    }
    return out;
  }
  function order(vars) {
    const out = {};
    for (const name of ALL_TOKEN_NAMES) if (vars[name] !== void 0) out[name] = vars[name];
    for (const name of Object.keys(vars).sort()) if (!(name in out)) out[name] = vars[name];
    return out;
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  function themeChannels(vars) {
    const out = {};
    for (const [name, value] of Object.entries(vars)) {
      const c2 = toRgba(value);
      if (!c2) continue;
      out[`${name}-rgb`] = `${c2[0]}, ${c2[1]}, ${c2[2]}`;
      out[`${name}-a`] = String(c2[3]);
    }
    return out;
  }
  function themeToCss(theme, selector = ":root") {
    const vars = isCompiled(theme) ? theme.vars : theme;
    const imports = isCompiled(theme) ? theme.imports : [];
    const all = { ...vars, ...themeChannels(vars) };
    const lines = Object.entries(all).map(([k, v]) => `  --${k}: ${v};`);
    return `${imports.map((u) => `@import url("${u}");
`).join("")}${selector} {
${lines.join("\n")}
}
`;
  }
  function toDtcg(theme, description = "nuikit theme") {
    var _a, _b;
    const color = { $type: "color" };
    const doc = {
      $description: `${description} (nuikit tokens v${TOKENS_REVISION}, ${theme.mode})`,
      $extensions: { "dev.nuikit": { tokens: TOKENS_VERSION, revision: TOKENS_REVISION, mode: theme.mode, ...theme.imports.length ? { imports: theme.imports } : {} } },
      color
    };
    const font = { $type: "fontFamily" };
    const nk = {};
    const preset = (_a = TREATMENT_PRESETS[theme.vars["nk-treatment"]]) != null ? _a : {};
    for (const [name, value] of Object.entries(theme.vars)) {
      const spec = SPEC.get(name);
      if ((spec == null ? void 0 : spec.group) === "derived") continue;
      if (preset[name] === value) continue;
      const desc = spec ? { $description: spec.description } : {};
      const col = toRgba(value);
      if (col && ((_b = spec == null ? void 0 : spec.type) != null ? _b : "color") === "color") {
        const hex = `#${col.slice(0, 3).map((x) => x.toString(16).padStart(2, "0")).join("")}`;
        color[name] = {
          $value: { colorSpace: "srgb", components: col.slice(0, 3).map((x) => Math.round(x / 255 * 1e4) / 1e4), alpha: col[3], hex },
          ...desc
        };
      } else if (name === "radius") {
        const m = /^([\d.]+)(px|rem)$/.exec(value);
        if (m) doc.radius = { $type: "dimension", $value: { value: parseFloat(m[1]), unit: m[2] }, ...desc };
      } else if (name.startsWith("font-")) {
        font[name.slice(5)] = { $value: value.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")), ...desc };
      } else if (name.startsWith("nk-")) {
        nk[name.slice(3)] = dtcgNk(spec, value, desc);
      }
    }
    if (Object.keys(font).length > 1) doc.font = font;
    doc.nk = nk;
    const again = compileTheme(doc, { mode: theme.mode }).vars;
    for (const [name, value] of Object.entries(theme.vars)) {
      const spec = SPEC.get(name);
      if ((spec == null ? void 0 : spec.group) === "derived" && name.startsWith("nk-") && again[name] !== value) nk[name.slice(3)] = dtcgNk(spec, value, { $description: spec.description });
    }
    if (Object.keys(nk).length === 0) delete doc.nk;
    return doc;
  }
  function dtcgNk(spec, value, desc) {
    var _a, _b;
    const dim = DIM.exec(value);
    const dur = DUR.exec(value);
    const bez = BEZIER.exec(value);
    if (NUM.test(value) && ((_a = spec == null ? void 0 : spec.type) != null ? _a : "number") === "number") return { $type: "number", $value: Number(value), ...desc };
    if (dim) return { $type: "dimension", $value: { value: parseFloat(dim[1]), unit: dim[2] }, ...desc };
    if (dur) return { $type: "duration", $value: { value: parseFloat(dur[1]), unit: dur[2] }, ...desc };
    if (bez) return { $type: "cubicBezier", $value: bez.slice(1).map(Number), ...desc };
    return { $value: value, ...desc, $extensions: { "dev.nuikit": { type: (_b = spec == null ? void 0 : spec.type) != null ? _b : "keyword" } } };
  }

  // src/coverage.ts
  var COVERAGE_TARGETS = { qbox: 0.9, qbcore: 0.75, esx: 0.75 };

  // src/doctor.ts
  var NUIKIT_SYSTEMS = ["nuikit_chat", "nuikit_death", "nuikit_hud", "nuikit_loading", "nuikit_pause", "nuikit_stress"];
  var ADAPTER_PACKS = [
    { name: "[nuikit-ox]", library: "ox_lib", frameworks: ["any"], shipped: false },
    { name: "[nuikit-qb]", library: "qb-core", frameworks: ["qbcore", "qbox"], shipped: false },
    { name: "[nuikit-esx]", library: "es_extended", frameworks: ["esx"], shipped: false }
  ];
  var FRAMEWORKS = [
    { resource: "qbx_core", framework: "qbox" },
    { resource: "qb-core", framework: "qbcore" },
    { resource: "es_extended", framework: "esx" }
  ];
  var OVERRIDE_MARKER = /<meta\s+name=["']nuikit-handshake["']\s+content=["']off["']/i;
  function meta(r, key) {
    var _a;
    return (_a = r.metadata[key]) != null ? _a : [];
  }
  function first(r, key) {
    return meta(r, key)[0];
  }
  var started = (r) => r.state === "started" || r.state === "starting";
  var isNuikit = (r) => r.name === "nuikit";
  var isNuikitFamily = (r) => /^nuikit_/i.test(r.name);
  function pageHash(text) {
    const s = text.replace(/\r\n/g, "\n");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  function compareVersions(a, b) {
    var _a, _b;
    const pa = a.replace(/^v/, "").split(/[.-]/);
    const pb = b.replace(/^v/, "").split(/[.-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = (_a = pa[i]) != null ? _a : "0";
      const y = (_b = pb[i]) != null ? _b : "0";
      const nx = Number(x);
      const ny = Number(y);
      if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
        if (nx !== ny) return nx - ny;
      } else if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  function detectFramework(resources) {
    for (const f of FRAMEWORKS) {
      const r = resources.find((x) => x.name === f.resource && started(x));
      if (r) return { framework: f.framework, resource: r.name };
    }
    return { framework: "standalone", resource: null };
  }
  function doctor(snap) {
    var _a, _b, _c, _d, _e;
    const resources = snap.resources;
    const running = resources.filter(started);
    const byName = new Map(resources.map((r) => [r.name, r]));
    const findings = [];
    const { framework, resource: frameworkResource } = detectFramework(resources);
    const packs = ((_a = snap.packs) != null ? _a : ADAPTER_PACKS).map((p) => {
      const lib = byName.get(p.library);
      const libraryRunning = !!lib && started(lib);
      const fits = libraryRunning && (p.frameworks.includes("any") || p.frameworks.includes(framework));
      const packRunning = running.some((r) => meta(r, "nuikit_adapter").includes(p.library));
      return { name: p.name, fits, shipped: p.shipped, running: packRunning, library: p.library, libraryRunning };
    });
    const adaptedBy = /* @__PURE__ */ new Map();
    for (const r of running) for (const lib of meta(r, "nuikit_adapter")) adaptedBy.set(lib, r.name);
    const reports = [];
    const chatThemes = running.filter((r) => meta(r, "chat_theme").length > 0);
    for (const r of running) {
      const page = (_c = (_b = first(r, "ui_page")) != null ? _b : first(r, "loadscreen")) != null ? _c : null;
      const hosted = first(r, "nuikit_ui");
      const loadscreen = first(r, "ui_page") === void 0 && first(r, "loadscreen") !== void 0;
      const chatTheme = meta(r, "chat_theme").length > 0;
      if (!page && !hosted && !chatTheme && !isNuikit(r)) continue;
      const rep = { name: r.name, status: "untouched", page };
      const proto = first(r, "nuikit_protocol");
      const level = first(r, "nuikit_level");
      if (isNuikit(r)) rep.status = "runtime";
      else if (proto !== void 0) {
        rep.status = "nuikit";
        rep.protocol = Number(proto);
        if (level !== void 0) rep.level = Number(level);
      } else if (hosted) rep.status = "hosted";
      else if (isNuikitFamily(r) && loadscreen) {
        rep.status = "nuikit";
        rep.via = "loadscreen";
      } else if (isNuikitFamily(r) && chatTheme) {
        rep.status = "nuikit";
        rep.via = "theme";
      } else if (chatTheme && !page) {
        const ours = chatThemes.find((t) => t !== r && isNuikitFamily(t));
        rep.next = ours ? `a chat theme next to ${ours.name}: chat takes one of them, so \`stop ${r.name}\`` : "a chat theme; nuikit_chat replaces it";
      } else if (adaptedBy.has(r.name)) {
        rep.status = "adapted";
        rep.via = adaptedBy.get(r.name);
      } else if (page && snap.readFile) {
        const html = snap.readFile(r.name, page);
        if (html && OVERRIDE_MARKER.test(html)) {
          rep.status = "override";
          rep.via = "override page";
        }
      }
      if (rep.status === "untouched" && loadscreen) {
        rep.next = running.some((t) => t !== r && isNuikitFamily(t) && first(t, "loadscreen") !== void 0) ? `a loading screen next to nuikit_loading: the game shows one of them, so \`stop ${r.name}\`` : "a loading screen; nuikit_loading replaces it";
      } else if (rep.status === "untouched" && !rep.next) {
        const pack = packs.find((p) => p.fits && p.library === r.name);
        rep.next = pack ? pack.shipped ? `install ${pack.name} to draw ${r.name}'s UI with nuikit` : `${pack.name} will adapt it (not shipped yet)` : `its UI is its own; add nuikit_protocol to join (docs/protocol.md) or wait for an override`;
      }
      if (rep.status === "nuikit" && rep.protocol !== void 0 && rep.level === void 0) rep.next = "declare nuikit_level '<1-3>' from `nuikit check` so the doctor can show it";
      reports.push(rep);
    }
    for (const r of running) {
      for (const provided of meta(r, "provide")) {
        const real = byName.get(provided);
        if (real && real !== r && started(real)) {
          findings.push({
            code: "provide-conflict",
            severity: "error",
            resource: r.name,
            message: `${r.name} provides ${provided}, and ${provided} itself is running`,
            next: `stop one of them: \`ensure ${r.name}\` replaces ${provided}, so remove \`ensure ${provided}\` (or the other way round)`
          });
        }
      }
    }
    if (snap.overrides && snap.readFile) {
      for (const [res, o] of Object.entries(snap.overrides.overrides)) {
        const r = byName.get(res);
        if (!r || !started(r)) continue;
        const html = snap.readFile(res, o.path);
        const rep = reports.find((x) => x.name === res);
        if (!html || !OVERRIDE_MARKER.test(html)) {
          findings.push({
            code: "override-missing",
            severity: "warn",
            resource: res,
            message: `${res}: the nuikit override page isn't at ${o.path} (a library update replaced it, or it was never copied)`,
            next: `copy overrides/${res}/ from nuikit.zip over resources/${res}/ again and \`restart ${res}\``
          });
          if (rep) {
            rep.via = "override missing";
            rep.next = `copy overrides/${res}/ from nuikit.zip back over resources/${res}/`;
          }
        } else if (pageHash(html) !== o.hash) {
          findings.push({
            code: "override-drifted",
            severity: "warn",
            resource: res,
            message: `${res}: the override page at ${o.path} isn't the one nuikit ${snap.overrides.version} shipped (edited, or from another release)`,
            next: `if you didn't edit it, copy overrides/${res}/ from nuikit.zip over resources/${res}/ and \`restart ${res}\``
          });
          if (rep) rep.via = "override changed";
        }
      }
    }
    for (const rep of reports) {
      if (rep.protocol !== void 0 && rep.protocol > snap.runtime.protocol) {
        findings.push({
          code: "protocol-newer",
          severity: "error",
          resource: rep.name,
          message: `${rep.name} speaks protocol ${rep.protocol}; this nuikit speaks ${snap.runtime.protocol}`,
          next: `update nuikit (the runtime supports the previous protocol, not a newer one)`
        });
      }
    }
    for (const r of running) {
      if (isNuikit(r)) continue;
      const scripts = ["shared_script", "client_script", "server_script", "shared_scripts", "client_scripts", "server_scripts"].flatMap((k) => meta(r, k));
      const imports = scripts.some((s) => s.startsWith("@nuikit/"));
      const depends = meta(r, "dependency").includes("nuikit") || meta(r, "dependencies").includes("nuikit");
      if (imports && !depends) {
        findings.push({
          code: "missing-dependency",
          severity: "warn",
          resource: r.name,
          message: `${r.name} imports @nuikit/init.lua but doesn't declare \`dependency 'nuikit'\``,
          next: `add \`dependency 'nuikit'\` to its fxmanifest.lua so FiveM starts nuikit first`
        });
      }
      if (r.manifestChanged) {
        findings.push({
          code: "manifest-changed",
          severity: "warn",
          resource: r.name,
          message: `${r.name}: fxmanifest.lua changed on disk after it started (a new \`files\` entry isn't served until the server re-reads it)`,
          next: `\`refresh\`, then \`restart ${r.name}\``
        });
      }
      if ((imports || depends) && r.startedBeforeRuntime) {
        findings.push({
          code: "start-order",
          severity: "error",
          resource: r.name,
          message: `${r.name} started before nuikit; its @nuikit import failed on that start`,
          next: `put \`ensure nuikit\` before \`ensure ${r.name}\` in server.cfg, then \`restart ${r.name}\``
        });
      }
    }
    const idle = resources.filter((r) => NUIKIT_SYSTEMS.includes(r.name) && r.state !== "started" && r.state !== "starting" && r.state !== "missing").map((r) => r.name);
    if (idle.length) {
      const ensures = idle.map((n2) => "`ensure " + n2 + "`").join(", ");
      findings.push({
        code: "systems-stopped",
        severity: "warn",
        message: `${idle.length} [nuikit] system${idle.length > 1 ? "s are" : " is"} installed but not running: ${idle.join(", ")}`,
        next: "`exec @nuikit/nuikit.cfg` in server.cfg (it ensures each system by name), or " + ensures + "; delete a system's folder if you don't want it"
      });
    } else if (!resources.some((r) => NUIKIT_SYSTEMS.includes(r.name))) {
      findings.push({
        code: "systems-stopped",
        severity: "info",
        message: "no [nuikit] system found (nuikit_hud, nuikit_pause\u2026): only the runtime and overrides are in use",
        next: "copy the `[nuikit]` folder from the zip into resources/ (real folders, not junctions or symlinks), `refresh`, then `exec @nuikit/nuikit.cfg`"
      });
    }
    if (snap.theme) {
      const pairs = /* @__PURE__ */ new Set();
      for (const c2 of snap.theme.contrast) {
        if (c2.ok) continue;
        pairs.add(`${c2.fg} on ${c2.bg}`);
        findings.push({
          code: "theme-contrast",
          severity: "warn",
          message: `theme: ${c2.fg} on ${c2.bg} is ${c2.ratio.toFixed(2)}:1 (min ${c2.min}:1)`,
          next: `lighten or darken \`--${c2.fg}\` or \`--${c2.bg}\` in nuikit/theme.css, then \`nuikit theme reload\``
        });
      }
      for (const w of snap.theme.warnings) {
        const pair = /^([\w-]+) on ([\w-]+) is [\d.]+:1/.exec(w);
        if (pair && pairs.has(`${pair[1]} on ${pair[2]}`)) continue;
        if (/contrast/i.test(w)) continue;
        findings.push({ code: "theme-warning", severity: "info", message: `theme: ${w}`, next: `fix it in nuikit/theme.css, then \`nuikit theme reload\`` });
      }
    }
    const latest = (_d = snap.runtime.latest) != null ? _d : null;
    if (latest && compareVersions(latest, snap.runtime.version) > 0) {
      findings.push({
        code: "update-available",
        severity: "info",
        message: `nuikit ${snap.runtime.version} is running; ${latest} is out`,
        next: `download nuikit.zip from github.com/belibathan/nuikit/releases/tag/v${latest.replace(/^v/, "")} and replace [nuikit]/ and overrides/`
      });
    }
    findings.push({
      code: "framework",
      severity: "info",
      message: frameworkResource ? `${framework} detected (${frameworkResource} is running)` : "no framework detected: standalone",
      next: packs.some((p) => p.fits && !p.running) ? `adapter packs that fit: ${packs.filter((p) => p.fits && !p.running).map((p) => `${p.name}${p.shipped ? "" : " (not shipped yet)"}`).join(", ")}` : packs.some((p) => p.running) ? "every fitting adapter pack is running" : "no adapter pack fits; nuikit's own screens and overrides still apply"
    });
    const seen = /* @__PURE__ */ new Set();
    const unique = findings.filter((f) => {
      var _a2;
      const key = `${f.code}|${(_a2 = f.resource) != null ? _a2 : ""}|${f.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    findings.length = 0;
    findings.push(...unique);
    const rank = { error: 0, warn: 1, info: 2 };
    findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
    const intents = Object.entries((_e = snap.intents) != null ? _e : {}).map(([source, byIntent]) => ({ source, byIntent, total: Object.values(byIntent).reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total);
    const count = (s) => reports.filter((r) => r.status === s).length;
    const summary = {
      ui: reports.filter((r) => r.status !== "runtime").length,
      nuikit: count("nuikit") + count("hosted"),
      adapted: count("adapted"),
      override: count("override"),
      untouched: count("untouched"),
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warn").length
    };
    return { framework, frameworkResource, runtime: { version: snap.runtime.version, protocol: snap.runtime.protocol, latest }, packs, resources: reports, findings, intents, summary };
  }
  var STATUS_LABEL = {
    runtime: "runtime",
    nuikit: "on nuikit",
    hosted: "on nuikit (hosted)",
    adapted: "adapted",
    override: "override",
    untouched: "untouched"
  };
  function formatDoctor(rep) {
    const out = [];
    out.push(`nuikit ${rep.runtime.version} (protocol ${rep.runtime.protocol})${rep.runtime.latest ? `, latest ${rep.runtime.latest}` : ""}`);
    out.push(`framework: ${rep.framework}${rep.frameworkResource ? ` (${rep.frameworkResource})` : ""}`);
    out.push("adapter packs:");
    for (const p of rep.packs) {
      const state = p.running ? "running" : p.fits ? p.shipped ? "fits, not installed" : "fits, not shipped yet" : `not needed (${p.library} isn't running)`;
      out.push(`  ${p.name.padEnd(14)} ${state}`);
    }
    out.push(`resources with a UI (${rep.summary.ui}): ${rep.summary.nuikit} on nuikit, ${rep.summary.adapted} adapted, ${rep.summary.override} override, ${rep.summary.untouched} untouched`);
    for (const r of rep.resources) {
      if (r.status === "runtime") continue;
      let label = STATUS_LABEL[r.status];
      if (r.status === "nuikit" && r.protocol !== void 0) label += ` v${r.protocol}${r.level !== void 0 ? ` level ${r.level}` : ""}`;
      if (r.via) label += ` (${r.via})`;
      out.push(`  ${r.name.padEnd(24)} ${label}`);
      if (r.next) out.push(`  ${"".padEnd(24)}   \u2192 ${r.next}`);
    }
    const problems = rep.findings.filter((f) => f.code !== "framework");
    out.push(`findings: ${rep.summary.errors} error${rep.summary.errors === 1 ? "" : "s"}, ${rep.summary.warnings} warning${rep.summary.warnings === 1 ? "" : "s"}`);
    for (const f of problems) {
      out.push(`  ${f.severity.toUpperCase().padEnd(5)} ${f.message}`);
      out.push(`        \u2192 ${f.next}`);
    }
    const fw = rep.findings.find((f) => f.code === "framework");
    if (fw) out.push(`  \u2192 ${fw.next}`);
    if (rep.intents.length) {
      out.push("intents drawn since start (by source):");
      for (const i of rep.intents) {
        const parts = Object.entries(i.byIntent).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
        out.push(`  ${i.source.padEnd(24)} ${i.total}  (${parts})`);
      }
    } else out.push("intents: none counted yet (the intents runtime emits nuikit:intent; play a bit, then run again)");
    const target = COVERAGE_TARGETS[rep.framework];
    const drawn = rep.intents.reduce((a, i) => a + i.total, 0);
    out.push(`coverage: ${drawn} drawn from ${rep.intents.length} source${rep.intents.length === 1 ? "" : "s"}${target ? `; target ${Math.round(target * 100)}% on ${rep.framework}` : ""} (bench/coverage/run.mjs)`);
    return out;
  }
  return __toCommonJS(fxserver_exports);
})();
globalThis.NuikitTheme = NuikitTheme;

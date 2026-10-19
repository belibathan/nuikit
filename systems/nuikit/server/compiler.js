/* nuikit-core theme compiler (tokens v1). MIT, https://github.com/belibathan/nuikit. Generated: do not edit (pnpm sync copies it from packages/core). */
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
    TOKENS_VERSION: () => TOKENS_VERSION,
    TOKEN_NAMES: () => TOKEN_NAMES,
    checkContrast: () => checkContrast,
    compileTheme: () => compileTheme,
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
    { name: "font-sans", type: "fontFamily", group: "shadcn", description: "Text", fallback: "ui-sans-serif, system-ui, sans-serif" },
    { name: "font-mono", type: "fontFamily", group: "shadcn", description: "Codes and IDs a player might type", fallback: "ui-monospace, SFMono-Regular, Menlo, monospace" },
    n("success", "color", "Positive status: done, paid, online", "oklch(L, C, 150): green at the lightness/chroma of destructive"),
    n("success-foreground", "color", "Text on success", "foreground or background, whichever contrasts more"),
    n("warning", "color", "Caution status: low fuel, about to expire", "oklch(L + 0.08, C, 75): amber at the lightness/chroma of destructive"),
    n("warning-foreground", "color", "Text on warning", "foreground or background, whichever contrasts more"),
    n("info", "color", "Neutral status: tips, notices", "primary"),
    n("info-foreground", "color", "Text on info", "primary-foreground"),
    n("hud", "color", "Surfaces drawn straight on the game: HUD chips, hotbar, target eye", "rgba(0, 0, 0, 0.45)"),
    n("hud-foreground", "color", "Text and icons on hud", "rgb(255, 255, 255)"),
    n("vital-health", "color", "Health bar", "chart-1 if red, else another red chart-*, else destructive if red, else oklch(0.68 0.21 25)"),
    n("vital-armor", "color", "Armor bar", "chart-2 if blue, else another blue chart-*, else oklch(0.68 0.16 250)"),
    n("vital-hunger", "color", "Hunger bar", "chart-3 if orange/amber, else another one, else oklch(0.78 0.16 70)"),
    n("vital-thirst", "color", "Thirst bar", "chart-4 if cyan/blue, else another one, else oklch(0.76 0.13 215)"),
    n("vital-stress", "color", "Stress bar", "chart-5 if purple/magenta, else another one, else oklch(0.68 0.2 320)"),
    n("nk-scale", "number", "UI size multiplier (unitless). Players can scale further (0.85\u20131.25).", "1"),
    n("nk-motion", "number", "1 = animations on, 0 = off. Players can turn motion off.", "1")
  ];
  var TOKEN_NAMES = TOKENS.map((t) => t.name);
  var SPEC = new Map(TOKENS.map((t) => [t.name, t]));
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
    var _a, _b, _c, _d, _e, _f;
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
    const lookup = (name, depth) => {
      const v = base[name];
      if (v === void 0 || depth > 8) return void 0;
      return resolveRefs(v, depth + 1);
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
    if (!opts.partial) derive(resolved, mode, warnings);
    else if (resolved["nk-scale"] !== void 0 || resolved["nk-motion"] !== void 0) derive(resolved, mode, warnings, true);
    if (opts.highContrast) highContrast(resolved);
    const contrast = checkContrast(resolved);
    for (const r of contrast) {
      if (r.ok) continue;
      const reason = (_f = (_e = CONTRAST_PAIRS.find(([f, b]) => f === r.fg && b === r.bg)) == null ? void 0 : _e[3]) != null ? _f : "it will be hard to read";
      warnings.push(`${r.fg} on ${r.bg} is ${r.ratio.toFixed(1)}:1 (needs ${r.min}:1); ${reason}.`);
    }
    const vars = order(resolved);
    return { version: TOKENS_VERSION, mode, vars, imports, warnings, contrast, hash: hash(JSON.stringify([vars, imports])) };
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
    var _a;
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
    if (vars["hud-foreground"] === void 0) vars["hud-foreground"] = "rgb(255, 255, 255)";
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
    for (const name of TOKEN_NAMES) if (vars[name] !== void 0) out[name] = vars[name];
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
    var _a;
    const color = { $type: "color" };
    const doc = {
      $description: `${description} (nuikit tokens v${TOKENS_VERSION}, ${theme.mode})`,
      $extensions: { "dev.nuikit": { tokens: TOKENS_VERSION, mode: theme.mode, ...theme.imports.length ? { imports: theme.imports } : {} } },
      color
    };
    const font = { $type: "fontFamily" };
    const nk = { $type: "number" };
    for (const [name, value] of Object.entries(theme.vars)) {
      const spec = SPEC.get(name);
      const desc = spec ? { $description: spec.description } : {};
      const col = toRgba(value);
      if (col && ((_a = spec == null ? void 0 : spec.type) != null ? _a : "color") === "color") {
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
        nk[name.slice(3)] = { $value: Number(value), ...desc };
      }
    }
    if (Object.keys(font).length > 1) doc.font = font;
    if (Object.keys(nk).length > 1) doc.nk = nk;
    return doc;
  }
  return __toCommonJS(fxserver_exports);
})();
globalThis.NuikitTheme = NuikitTheme;

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
    bytesHash: () => bytesHash,
    checkContrast: () => checkContrast,
    compareVersions: () => compareVersions,
    compileTheme: () => compileTheme,
    detectFramework: () => detectFramework,
    doctor: () => doctor,
    formatDoctor: () => formatDoctor,
    formatInstall: () => formatInstall,
    overrideOutdated: () => overrideOutdated,
    pageHash: () => pageHash,
    planInstall: () => planInstall,
    planUninstall: () => planUninstall,
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
      if (h.length <= 4) h = [...h].map((c) => c + c).join("");
      const n = (i) => parseInt(h.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), h.length === 8 ? round(n(6) / 255) : 1];
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
    if (rgb.some((c) => Number.isNaN(c)) || Number.isNaN(alpha)) return null;
    return [...rgb.map((c) => Math.round(Math.max(0, Math.min(255, c)))), round(Math.max(0, Math.min(1, alpha)))];
  }
  function formatRgba(c) {
    return c[3] === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
  }
  function oklchToRgb(L, C, Hdeg) {
    return gamutMap(L, C, Hdeg * Math.PI / 180);
  }
  function rgbToOklch(c) {
    const lin = (x) => {
      const s2 = x / 255;
      return s2 <= 0.04045 ? s2 / 12.92 : ((s2 + 0.055) / 1.055) ** 2.4;
    };
    const r = lin(c[0]);
    const g = lin(c[1]);
    const b = lin(c[2]);
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
  function luminance(c) {
    const ch = (x) => {
      const s = x / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
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
    const n = parseFloat(s);
    return alwaysPercentLike && n > 1 ? n / 100 : n;
  }
  function hue(s) {
    const n = parseFloat(s);
    if (s.endsWith("rad")) return n * 180 / Math.PI;
    if (s.endsWith("turn")) return n * 360;
    return Number.isNaN(n) ? 0 : n;
  }
  function hsl(h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  function gamutMap(L, C, H) {
    const at = (c) => oklab(L, c * Math.cos(H), c * Math.sin(H));
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
  var round = (n) => Math.round(n * 1e3) / 1e3;

  // src/spec/roles.ts
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

  // src/tokens.generated.ts
  var LEVER_ROWS = [
    {
      "name": "background",
      "path": "@background",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.145 0 0)",
      "description": "Full-screen surfaces (pause, loading, death scrim)",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "foreground",
      "path": "@foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.985 0 0)",
      "description": "Text on full-screen surfaces",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "card",
      "path": "@card",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.205 0 0)",
      "description": "Raised blocks on a full-screen surface",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "card-foreground",
      "path": "@card-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.985 0 0)",
      "description": "Text on cards",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "popover",
      "path": "@popover",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.205 0 0)",
      "description": "Every floating panel",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "popover-foreground",
      "path": "@popover-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.985 0 0)",
      "description": "Text in panels",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "primary",
      "path": "@primary",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.922 0 0)",
      "description": "The one main action per surface, the keycap face, selection",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "primary-foreground",
      "path": "@primary-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.205 0 0)",
      "description": "Text on primary",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "secondary",
      "path": "@secondary",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.269 0 0)",
      "description": "Secondary buttons",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "secondary-foreground",
      "path": "@secondary-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.985 0 0)",
      "description": "Text on secondary",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "muted",
      "path": "@muted",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.269 0 0)",
      "description": "Tracks, slots and wells inside a panel",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "muted-foreground",
      "path": "@muted-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.708 0 0)",
      "description": "Secondary text",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "accent",
      "path": "@accent",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.269 0 0)",
      "description": "Hover tint",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "accent-foreground",
      "path": "@accent-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.985 0 0)",
      "description": "Text on accent",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "destructive",
      "path": "@destructive",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.704 0.191 22.216)",
      "description": "Danger, damage, low values, death",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "destructive-foreground",
      "path": "@destructive-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.985 0 0)",
      "description": "Text on destructive",
      "rule": "foreground or background, whichever contrasts more"
    },
    {
      "name": "border",
      "path": "@border",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(1 0 0 / 10%)",
      "description": "Hairlines",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "input",
      "path": "@input",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(1 0 0 / 15%)",
      "description": "Field borders",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "ring",
      "path": "@ring",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.556 0 0)",
      "description": "A text field's caret rim",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "chart-1",
      "path": "@chart-1",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.87 0 0)",
      "description": "Categorical colour 1",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "chart-2",
      "path": "@chart-2",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.556 0 0)",
      "description": "Categorical colour 2",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "chart-3",
      "path": "@chart-3",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.439 0 0)",
      "description": "Categorical colour 3",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "chart-4",
      "path": "@chart-4",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.371 0 0)",
      "description": "Categorical colour 4",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "chart-5",
      "path": "@chart-5",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.269 0 0)",
      "description": "Categorical colour 5",
      "rule": "stock shadcn neutral"
    },
    {
      "name": "radius",
      "path": "@radius",
      "tier": "identity",
      "scope": "",
      "type": "length",
      "default": "0.75rem",
      "description": "The radius scale's base: every radius step derives from it",
      "rule": "0.75rem"
    },
    {
      "name": "brand",
      "path": "@brand",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--primary)",
      "description": "The server's signature: active marks, needles, the accent's stops",
      "rule": "primary if chromatic (OKLCH C \u2265 0.06), else chart-1"
    },
    {
      "name": "brand-foreground",
      "path": "@brand-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--primary-foreground)",
      "description": "Text on brand",
      "rule": "foreground or background, whichever contrasts more"
    },
    {
      "name": "success",
      "path": "@success",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.7 0.17 150)",
      "description": "Positive status",
      "rule": "green at the lightness / chroma of destructive"
    },
    {
      "name": "success-foreground",
      "path": "@success-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--background)",
      "description": "Text on success",
      "rule": "whichever contrasts more"
    },
    {
      "name": "warning",
      "path": "@warning",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.78 0.17 75)",
      "description": "Caution status",
      "rule": "amber at the lightness / chroma of destructive"
    },
    {
      "name": "warning-foreground",
      "path": "@warning-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--background)",
      "description": "Text on warning",
      "rule": "whichever contrasts more"
    },
    {
      "name": "info",
      "path": "@info",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--primary)",
      "description": "Neutral status",
      "rule": "primary"
    },
    {
      "name": "info-foreground",
      "path": "@info-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--primary-foreground)",
      "description": "Text on info",
      "rule": "primary-foreground"
    },
    {
      "name": "hud",
      "path": "@hud",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgba(0, 0, 0, 0.45)",
      "description": "Surfaces drawn straight on the game: HUD chips, hotbar",
      "rule": "rgba(0, 0, 0, 0.45)"
    },
    {
      "name": "hud-foreground",
      "path": "@hud-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgb(255, 255, 255)",
      "description": "Text and icons on hud",
      "rule": "white"
    },
    {
      "name": "scrim",
      "path": "@scrim",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgb(0, 0, 0)",
      "description": "Darkens the game; shadows and walls; always used with opacity",
      "rule": "black"
    },
    {
      "name": "surface",
      "path": "@surface",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--popover)",
      "description": "The panel colour, tinted toward brand by surface.tint",
      "derived": true,
      "rule": "mix(popover, brand, surface.tint)"
    },
    {
      "name": "world-foreground",
      "path": "@world-foreground",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgb(255, 255, 255)",
      "description": "Text drawn straight on the game, light in every theme",
      "rule": "white"
    },
    {
      "name": "world-foreground-muted",
      "path": "@world-foreground-muted",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgba(255, 255, 255, 0.8)",
      "description": "Secondary text on the game",
      "rule": "world-foreground at 80%"
    },
    {
      "name": "world-success",
      "path": "@world-success",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--success)",
      "description": "A gain drawn on the game",
      "rule": "success, OKLCH L \u2265 0.7"
    },
    {
      "name": "world-destructive",
      "path": "@world-destructive",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--destructive)",
      "description": "A loss drawn on the game",
      "rule": "destructive, OKLCH L \u2265 0.7"
    },
    {
      "name": "vital-health",
      "path": "@vital-health",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.68 0.21 25)",
      "description": "Health",
      "rule": "chart-1 if red, else another red chart, else destructive if red, else oklch(0.68 0.21 25)"
    },
    {
      "name": "vital-armor",
      "path": "@vital-armor",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.68 0.16 250)",
      "description": "Armor",
      "rule": "a blue chart colour, else oklch(0.68 0.16 250)"
    },
    {
      "name": "vital-hunger",
      "path": "@vital-hunger",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.78 0.16 70)",
      "description": "Hunger",
      "rule": "an amber chart colour, else oklch(0.78 0.16 70)"
    },
    {
      "name": "vital-thirst",
      "path": "@vital-thirst",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.76 0.13 215)",
      "description": "Thirst",
      "rule": "a cyan chart colour, else oklch(0.76 0.13 215)"
    },
    {
      "name": "world-shadow",
      "path": "@world-shadow",
      "tier": "identity",
      "scope": "",
      "type": "shadow",
      "default": "0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)",
      "description": "Text-shadow that keeps world-foreground legible over any frame",
      "rule": "a tight dark edge plus a soft halo"
    },
    {
      "name": "pause-surface",
      "path": "@pause-surface",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgb(246, 247, 249)",
      "description": "The slash pause panel's light surface (style.pause: slash)",
      "rule": "rgb(246, 247, 249)"
    },
    {
      "name": "pause-ink",
      "path": "@pause-ink",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "rgb(14, 16, 20)",
      "description": "Text on the slash pause panel",
      "rule": "rgb(14, 16, 20)"
    },
    {
      "name": "vital-stress",
      "path": "@vital-stress",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.68 0.2 320)",
      "description": "Stress",
      "rule": "a magenta chart colour, else oklch(0.68 0.2 320)"
    },
    {
      "name": "role-health",
      "path": "@role-health",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--vital-health)",
      "description": 'Role health: the --hue-* ramp under data-hue="health"',
      "rule": "vital-health"
    },
    {
      "name": "role-health-deep",
      "path": "@role-health-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-health)",
      "description": "health, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-health, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-health-light",
      "path": "@role-health-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-health)",
      "description": "health, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-health, OKLCH L + 0.1"
    },
    {
      "name": "role-armor",
      "path": "@role-armor",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--vital-armor)",
      "description": 'Role armor: the --hue-* ramp under data-hue="armor"',
      "rule": "vital-armor"
    },
    {
      "name": "role-armor-deep",
      "path": "@role-armor-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-armor)",
      "description": "armor, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-armor, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-armor-light",
      "path": "@role-armor-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-armor)",
      "description": "armor, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-armor, OKLCH L + 0.1"
    },
    {
      "name": "role-hunger",
      "path": "@role-hunger",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--vital-hunger)",
      "description": 'Role hunger: the --hue-* ramp under data-hue="hunger"',
      "rule": "vital-hunger"
    },
    {
      "name": "role-hunger-deep",
      "path": "@role-hunger-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-hunger)",
      "description": "hunger, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-hunger, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-hunger-light",
      "path": "@role-hunger-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-hunger)",
      "description": "hunger, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-hunger, OKLCH L + 0.1"
    },
    {
      "name": "role-thirst",
      "path": "@role-thirst",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--vital-thirst)",
      "description": 'Role thirst: the --hue-* ramp under data-hue="thirst"',
      "rule": "vital-thirst"
    },
    {
      "name": "role-thirst-deep",
      "path": "@role-thirst-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-thirst)",
      "description": "thirst, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-thirst, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-thirst-light",
      "path": "@role-thirst-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-thirst)",
      "description": "thirst, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-thirst, OKLCH L + 0.1"
    },
    {
      "name": "role-stress",
      "path": "@role-stress",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--vital-stress)",
      "description": 'Role stress: the --hue-* ramp under data-hue="stress"',
      "rule": "vital-stress"
    },
    {
      "name": "role-stress-deep",
      "path": "@role-stress-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-stress)",
      "description": "stress, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-stress, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-stress-light",
      "path": "@role-stress-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-stress)",
      "description": "stress, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-stress, OKLCH L + 0.1"
    },
    {
      "name": "role-stamina",
      "path": "@role-stamina",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--success)",
      "description": 'Role stamina: the --hue-* ramp under data-hue="stamina"',
      "rule": "success"
    },
    {
      "name": "role-stamina-deep",
      "path": "@role-stamina-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-stamina)",
      "description": "stamina, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-stamina, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-stamina-light",
      "path": "@role-stamina-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-stamina)",
      "description": "stamina, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-stamina, OKLCH L + 0.1"
    },
    {
      "name": "role-oxygen",
      "path": "@role-oxygen",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--info)",
      "description": 'Role oxygen: the --hue-* ramp under data-hue="oxygen"',
      "rule": "info"
    },
    {
      "name": "role-oxygen-deep",
      "path": "@role-oxygen-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-oxygen)",
      "description": "oxygen, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-oxygen, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-oxygen-light",
      "path": "@role-oxygen-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-oxygen)",
      "description": "oxygen, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-oxygen, OKLCH L + 0.1"
    },
    {
      "name": "role-info",
      "path": "@role-info",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--info)",
      "description": 'Role info: the --hue-* ramp under data-hue="info"',
      "rule": "info"
    },
    {
      "name": "role-info-deep",
      "path": "@role-info-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-info)",
      "description": "info, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-info, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-info-light",
      "path": "@role-info-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-info)",
      "description": "info, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-info, OKLCH L + 0.1"
    },
    {
      "name": "role-success",
      "path": "@role-success",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--success)",
      "description": 'Role success: the --hue-* ramp under data-hue="success"',
      "rule": "success"
    },
    {
      "name": "role-success-deep",
      "path": "@role-success-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-success)",
      "description": "success, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-success, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-success-light",
      "path": "@role-success-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-success)",
      "description": "success, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-success, OKLCH L + 0.1"
    },
    {
      "name": "role-warning",
      "path": "@role-warning",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--warning)",
      "description": 'Role warning: the --hue-* ramp under data-hue="warning"',
      "rule": "warning"
    },
    {
      "name": "role-warning-deep",
      "path": "@role-warning-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-warning)",
      "description": "warning, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-warning, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-warning-light",
      "path": "@role-warning-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-warning)",
      "description": "warning, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-warning, OKLCH L + 0.1"
    },
    {
      "name": "role-danger",
      "path": "@role-danger",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--destructive)",
      "description": 'Role danger: the --hue-* ramp under data-hue="danger"',
      "rule": "destructive"
    },
    {
      "name": "role-danger-deep",
      "path": "@role-danger-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-danger)",
      "description": "danger, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-danger, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-danger-light",
      "path": "@role-danger-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-danger)",
      "description": "danger, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-danger, OKLCH L + 0.1"
    },
    {
      "name": "role-police",
      "path": "@role-police",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.62 0.17 255)",
      "description": 'Role police: the --hue-* ramp under data-hue="police"',
      "rule": "oklch(0.62 0.17 255)"
    },
    {
      "name": "role-police-deep",
      "path": "@role-police-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-police)",
      "description": "police, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-police, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-police-light",
      "path": "@role-police-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-police)",
      "description": "police, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-police, OKLCH L + 0.1"
    },
    {
      "name": "role-ems",
      "path": "@role-ems",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.64 0.2 25)",
      "description": 'Role ems: the --hue-* ramp under data-hue="ems"',
      "rule": "oklch(0.64 0.2 25)"
    },
    {
      "name": "role-ems-deep",
      "path": "@role-ems-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-ems)",
      "description": "ems, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-ems, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-ems-light",
      "path": "@role-ems-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-ems)",
      "description": "ems, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-ems, OKLCH L + 0.1"
    },
    {
      "name": "role-mech",
      "path": "@role-mech",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.74 0.15 60)",
      "description": 'Role mech: the --hue-* ramp under data-hue="mech"',
      "rule": "oklch(0.74 0.15 60)"
    },
    {
      "name": "role-mech-deep",
      "path": "@role-mech-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-mech)",
      "description": "mech, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-mech, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-mech-light",
      "path": "@role-mech-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-mech)",
      "description": "mech, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-mech, OKLCH L + 0.1"
    },
    {
      "name": "role-gang",
      "path": "@role-gang",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.6 0.2 305)",
      "description": 'Role gang: the --hue-* ramp under data-hue="gang"',
      "rule": "oklch(0.6 0.2 305)"
    },
    {
      "name": "role-gang-deep",
      "path": "@role-gang-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-gang)",
      "description": "gang, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-gang, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-gang-light",
      "path": "@role-gang-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-gang)",
      "description": "gang, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-gang, OKLCH L + 0.1"
    },
    {
      "name": "role-civ",
      "path": "@role-civ",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--muted-foreground)",
      "description": 'Role civ: the --hue-* ramp under data-hue="civ"',
      "rule": "muted-foreground"
    },
    {
      "name": "role-civ-deep",
      "path": "@role-civ-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-civ)",
      "description": "civ, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-civ, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-civ-light",
      "path": "@role-civ-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-civ)",
      "description": "civ, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-civ, OKLCH L + 0.1"
    },
    {
      "name": "role-staff",
      "path": "@role-staff",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--brand)",
      "description": 'Role staff: the --hue-* ramp under data-hue="staff"',
      "rule": "brand"
    },
    {
      "name": "role-staff-deep",
      "path": "@role-staff-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-staff)",
      "description": "staff, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-staff, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-staff-light",
      "path": "@role-staff-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-staff)",
      "description": "staff, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-staff, OKLCH L + 0.1"
    },
    {
      "name": "role-common",
      "path": "@role-common",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--muted-foreground)",
      "description": 'Role common: the --hue-* ramp under data-hue="common"',
      "rule": "muted-foreground"
    },
    {
      "name": "role-common-deep",
      "path": "@role-common-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-common)",
      "description": "common, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-common, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-common-light",
      "path": "@role-common-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-common)",
      "description": "common, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-common, OKLCH L + 0.1"
    },
    {
      "name": "role-uncommon",
      "path": "@role-uncommon",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.72 0.17 145)",
      "description": 'Role uncommon: the --hue-* ramp under data-hue="uncommon"',
      "rule": "oklch(0.72 0.17 145)"
    },
    {
      "name": "role-uncommon-deep",
      "path": "@role-uncommon-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-uncommon)",
      "description": "uncommon, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-uncommon, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-uncommon-light",
      "path": "@role-uncommon-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-uncommon)",
      "description": "uncommon, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-uncommon, OKLCH L + 0.1"
    },
    {
      "name": "role-rare",
      "path": "@role-rare",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.66 0.16 250)",
      "description": 'Role rare: the --hue-* ramp under data-hue="rare"',
      "rule": "oklch(0.66 0.16 250)"
    },
    {
      "name": "role-rare-deep",
      "path": "@role-rare-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-rare)",
      "description": "rare, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-rare, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-rare-light",
      "path": "@role-rare-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-rare)",
      "description": "rare, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-rare, OKLCH L + 0.1"
    },
    {
      "name": "role-epic",
      "path": "@role-epic",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.62 0.22 305)",
      "description": 'Role epic: the --hue-* ramp under data-hue="epic"',
      "rule": "oklch(0.62 0.22 305)"
    },
    {
      "name": "role-epic-deep",
      "path": "@role-epic-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-epic)",
      "description": "epic, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-epic, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-epic-light",
      "path": "@role-epic-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-epic)",
      "description": "epic, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-epic, OKLCH L + 0.1"
    },
    {
      "name": "role-legendary",
      "path": "@role-legendary",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "oklch(0.78 0.16 75)",
      "description": 'Role legendary: the --hue-* ramp under data-hue="legendary"',
      "rule": "oklch(0.78 0.16 75)"
    },
    {
      "name": "role-legendary-deep",
      "path": "@role-legendary-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-legendary)",
      "description": "legendary, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-legendary, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-legendary-light",
      "path": "@role-legendary-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-legendary)",
      "description": "legendary, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-legendary, OKLCH L + 0.1"
    },
    {
      "name": "role-brand",
      "path": "@role-brand",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--brand)",
      "description": 'Role brand: the --hue-* ramp under data-hue="brand"',
      "rule": "brand"
    },
    {
      "name": "role-brand-deep",
      "path": "@role-brand-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-brand)",
      "description": "brand, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-brand, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-brand-light",
      "path": "@role-brand-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-brand)",
      "description": "brand, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-brand, OKLCH L + 0.1"
    },
    {
      "name": "role-neutral",
      "path": "@role-neutral",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--muted-foreground)",
      "description": 'Role neutral: the --hue-* ramp under data-hue="neutral"',
      "rule": "muted-foreground"
    },
    {
      "name": "role-neutral-deep",
      "path": "@role-neutral-deep",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-neutral)",
      "description": "neutral, darker: the ramp's deep step",
      "derived": true,
      "rule": "role-neutral, OKLCH L \u2212 0.12"
    },
    {
      "name": "role-neutral-light",
      "path": "@role-neutral-light",
      "tier": "identity",
      "scope": "",
      "type": "color",
      "default": "var(--role-neutral)",
      "description": "neutral, lighter: the ramp's gradient start",
      "derived": true,
      "rule": "role-neutral, OKLCH L + 0.1"
    },
    {
      "name": "font-sans",
      "path": "font.sans",
      "tier": "identity",
      "scope": "font",
      "type": "font",
      "default": 'Geist, Inter, "Segoe UI", system-ui, sans-serif',
      "description": "Sentences (the body voice)"
    },
    {
      "name": "font-display",
      "path": "font.display",
      "tier": "identity",
      "scope": "font",
      "type": "font",
      "default": '"Barlow Condensed", "Arial Narrow", sans-serif',
      "description": "Anything scanned: keys, titles, labels, captions"
    },
    {
      "name": "font-numeric",
      "path": "font.numeric",
      "tier": "identity",
      "scope": "font",
      "type": "font",
      "default": '"Barlow Condensed", "Arial Narrow", sans-serif',
      "description": "Every number (always tabular)"
    },
    {
      "name": "font-mono",
      "path": "font.mono",
      "tier": "identity",
      "scope": "font",
      "type": "font",
      "default": '"Geist Mono", ui-monospace, monospace',
      "description": "Codes and IDs a player might type"
    },
    {
      "name": "nk-scale",
      "path": "scale",
      "tier": "identity",
      "scope": "scale",
      "type": "number",
      "default": "1",
      "description": "UI size multiplier (players scale further, 0.85\u20131.25)",
      "range": [
        0.5,
        2
      ]
    },
    {
      "name": "nk-density",
      "path": "density",
      "tier": "identity",
      "scope": "density",
      "type": "number",
      "default": "1",
      "description": "Spacing multiplier: 0.75 compact \u2026 1.3 roomy",
      "range": [
        0.75,
        1.3
      ]
    },
    {
      "name": "nk-space-1",
      "path": "space.1",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "var(--nk-space-unit)",
      "description": "1 \xD7 the step"
    },
    {
      "name": "nk-space-2",
      "path": "space.2",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 2)",
      "description": "2 \xD7 the step"
    },
    {
      "name": "nk-space-3",
      "path": "space.3",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 3)",
      "description": "3 \xD7 the step"
    },
    {
      "name": "nk-space-4",
      "path": "space.4",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 4)",
      "description": "4 \xD7 the step"
    },
    {
      "name": "nk-space-6",
      "path": "space.6",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 6)",
      "description": "6 \xD7 the step"
    },
    {
      "name": "nk-space-8",
      "path": "space.8",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 8)",
      "description": "8 \xD7 the step"
    },
    {
      "name": "nk-space-unit",
      "path": "space.unit",
      "tier": "identity",
      "scope": "space",
      "type": "length",
      "default": "calc(0.25rem * var(--nk-density))",
      "description": "The spacing step"
    },
    {
      "name": "nk-radius-key",
      "path": "radius.key",
      "tier": "identity",
      "scope": "radius",
      "type": "length",
      "default": "max(0.25rem, calc(var(--radius) - 0.5rem))",
      "description": "Keys and small tiles"
    },
    {
      "name": "nk-radius-chip",
      "path": "radius.chip",
      "tier": "identity",
      "scope": "radius",
      "type": "length",
      "default": "max(0.25rem, calc(var(--radius) - 0.375rem))",
      "description": "Chips and badges"
    },
    {
      "name": "nk-radius-control",
      "path": "radius.control",
      "tier": "identity",
      "scope": "radius",
      "type": "length",
      "default": "calc(var(--radius) - 0.25rem)",
      "description": "Buttons, fields, rows, the keycap"
    },
    {
      "name": "nk-radius-surface",
      "path": "radius.surface",
      "tier": "identity",
      "scope": "radius",
      "type": "length",
      "default": "var(--nk-material-menu-radius)",
      "description": "Panels, sheets, dialogs"
    },
    {
      "name": "nk-height-key",
      "path": "height.key",
      "tier": "identity",
      "scope": "height",
      "type": "length",
      "default": "1.5rem",
      "description": "A key / small tile"
    },
    {
      "name": "nk-height-chip",
      "path": "height.chip",
      "tier": "identity",
      "scope": "height",
      "type": "length",
      "default": "calc(1.75rem * var(--nk-density))",
      "description": "A chip / medium tile"
    },
    {
      "name": "nk-height-control",
      "path": "height.control",
      "tier": "identity",
      "scope": "height",
      "type": "length",
      "default": "2.25rem",
      "description": "Buttons and bar items / large tile"
    },
    {
      "name": "nk-height-row",
      "path": "height.row",
      "tier": "identity",
      "scope": "height",
      "type": "length",
      "default": "calc(3rem * var(--nk-density))",
      "description": "A list row"
    },
    {
      "name": "nk-height-field",
      "path": "height.field",
      "tier": "identity",
      "scope": "height",
      "type": "length",
      "default": "2.75rem",
      "description": "Text inputs, selects and dialog buttons"
    },
    {
      "name": "nk-icon-sm",
      "path": "icon.sm",
      "tier": "identity",
      "scope": "icon",
      "type": "length",
      "default": "0.75rem",
      "description": "Small icon"
    },
    {
      "name": "nk-icon-md",
      "path": "icon.md",
      "tier": "identity",
      "scope": "icon",
      "type": "length",
      "default": "1rem",
      "description": "Icon next to text (the default)"
    },
    {
      "name": "nk-icon-lg",
      "path": "icon.lg",
      "tier": "identity",
      "scope": "icon",
      "type": "length",
      "default": "1.25rem",
      "description": "Large icon"
    },
    {
      "name": "nk-icon-stroke",
      "path": "icon.stroke",
      "tier": "identity",
      "scope": "icon",
      "type": "number",
      "default": "2",
      "description": "Stroke width",
      "range": [
        0.5,
        4
      ]
    },
    {
      "name": "nk-text-base",
      "path": "text.base",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "1rem",
      "description": "Body size; every step derives from it"
    },
    {
      "name": "nk-text-key",
      "path": "text.key",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "0.8125rem",
      "description": "The scan voice (keys, buttons, tabs)"
    },
    {
      "name": "nk-text-body",
      "path": "text.body",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "var(--nk-text-base)",
      "description": "Sentences"
    },
    {
      "name": "nk-text-label",
      "path": "text.label",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "max(0.8125rem, calc(var(--nk-text-base) / var(--nk-type-ratio)))",
      "description": "Labels and captions"
    },
    {
      "name": "nk-text-title",
      "path": "text.title",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "calc(var(--nk-text-base) * (1 + (var(--nk-type-ratio) - 1) / 2))",
      "description": "Panel titles (\u2248 base \xD7 \u221Aratio)"
    },
    {
      "name": "nk-text-section",
      "path": "text.section",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "calc(var(--nk-text-base) * var(--nk-type-ratio) * var(--nk-type-ratio))",
      "description": "Section and sheet titles"
    },
    {
      "name": "nk-text-display",
      "path": "text.display",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "calc(var(--nk-text-base) * var(--nk-type-ratio) * var(--nk-type-ratio) * var(--nk-type-ratio) * var(--nk-type-ratio) * 1.1)",
      "description": "Full-screen titles"
    },
    {
      "name": "nk-text-hud",
      "path": "text.hud",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "max(1.125rem, calc(var(--nk-text-base) * var(--nk-type-ratio)))",
      "description": "HUD values read in motion"
    },
    {
      "name": "nk-text-row",
      "path": "text.row",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "1.125rem",
      "description": "A row or notice title (the label voice)"
    },
    {
      "name": "nk-text-desc",
      "path": "text.desc",
      "tier": "identity",
      "scope": "text",
      "type": "length",
      "default": "0.875rem",
      "description": "A row or notice description (the body voice)"
    },
    {
      "name": "nk-leading-tight",
      "path": "leading.tight",
      "tier": "identity",
      "scope": "leading",
      "type": "length",
      "default": "1rem",
      "description": "Small text: captions, labels, descriptions"
    },
    {
      "name": "nk-leading-normal",
      "path": "leading.normal",
      "tier": "identity",
      "scope": "leading",
      "type": "length",
      "default": "1.25rem",
      "description": "Body-size text: rows, notices, slabs"
    },
    {
      "name": "nk-shape-skew",
      "path": "shape.skew",
      "tier": "identity",
      "scope": "shape",
      "type": "angle",
      "default": "-12deg",
      "description": "The keycap's slant: tile faces, the primary button, the selection (their boxes and text stay upright); at most \xB120deg",
      "range": [
        -20,
        20
      ]
    },
    {
      "name": "nk-shape-slab",
      "path": "shape.slab",
      "tier": "identity",
      "scope": "shape",
      "type": "angle",
      "default": "0deg",
      "description": "Chips, badges and tags drawn as skewed slabs too (0deg = upright); at most \xB120deg",
      "range": [
        -20,
        20
      ],
      "attr": "skew"
    },
    {
      "name": "nk-shape-cut",
      "path": "shape.cut",
      "tier": "identity",
      "scope": "shape",
      "type": "length",
      "default": "0px",
      "description": "Chamfered corners (top left, bottom right) as clip-path; 0 = off"
    },
    {
      "name": "nk-shape-stroke",
      "path": "shape.stroke",
      "tier": "identity",
      "scope": "shape",
      "type": "length",
      "default": "1px",
      "description": "Hairline weight of plates, rims and fields"
    },
    {
      "name": "nk-type-ratio",
      "path": "type.ratio",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "1.25",
      "description": "Step between type sizes: 1.125 calm \u2026 1.333 dramatic",
      "range": [
        1,
        1.6
      ]
    },
    {
      "name": "nk-type-weight-body",
      "path": "type.weight-body",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "400",
      "description": "Sentences",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-weight-strong",
      "path": "type.weight-strong",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "500",
      "description": "Captions, chips, slabs: text that must hold its own on the game",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-weight-display",
      "path": "type.weight-display",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "700",
      "description": "Full-screen titles and big numbers",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-tracking-display",
      "path": "type.tracking-display",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "-0.02em",
      "description": "Letter-spacing of full-screen titles"
    },
    {
      "name": "nk-type-tracking-label",
      "path": "type.tracking-label",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0.06em",
      "description": "Letter-spacing of captions"
    },
    {
      "name": "nk-type-case",
      "path": "type.case",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "uppercase",
      "description": "Anything scanned (keys, titles, labels, captions) in caps or as written",
      "values": [
        "none",
        "uppercase"
      ],
      "attr": "case"
    },
    {
      "name": "nk-type-slant",
      "path": "type.slant",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "italic",
      "description": "The scanned voices upright or italic (a real italic where the face has one)",
      "values": [
        "normal",
        "italic"
      ],
      "attr": "slant"
    },
    {
      "name": "nk-type-overhang",
      "path": "type.overhang",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0.15em",
      "description": "Trailing pad of a slanted voice (the italic's overhang); 0em when upright"
    },
    {
      "name": "nk-type-scan-family",
      "path": "type.scan.family",
      "tier": "identity",
      "scope": "type",
      "type": "font",
      "default": "var(--font-display)",
      "description": "Face of the scan voice (keys, buttons, tabs)",
      "part": "scan"
    },
    {
      "name": "nk-type-scan-style",
      "path": "type.scan.style",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-slant)",
      "description": "Slant of the scan voice (keys, buttons, tabs)",
      "part": "scan",
      "values": [
        "normal",
        "italic"
      ]
    },
    {
      "name": "nk-type-scan-weight",
      "path": "type.scan.weight",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "800",
      "description": "Weight of the scan voice (keys, buttons, tabs)",
      "part": "scan",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-scan-tracking",
      "path": "type.scan.tracking",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0.02em",
      "description": "Letter-spacing of the scan voice (keys, buttons, tabs)",
      "part": "scan"
    },
    {
      "name": "nk-type-scan-case",
      "path": "type.scan.case",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-case)",
      "description": "Case of the scan voice (keys, buttons, tabs)",
      "part": "scan",
      "values": [
        "none",
        "uppercase"
      ]
    },
    {
      "name": "nk-type-scan-pad",
      "path": "type.scan.pad",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "var(--nk-type-overhang)",
      "description": "Trailing pad of the scan voice (keys, buttons, tabs) (the italic overhang)",
      "part": "scan"
    },
    {
      "name": "nk-type-title-family",
      "path": "type.title.family",
      "tier": "identity",
      "scope": "type",
      "type": "font",
      "default": "var(--font-display)",
      "description": "Face of the title voice (panel and row titles)",
      "part": "title"
    },
    {
      "name": "nk-type-title-style",
      "path": "type.title.style",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-slant)",
      "description": "Slant of the title voice (panel and row titles)",
      "part": "title",
      "values": [
        "normal",
        "italic"
      ]
    },
    {
      "name": "nk-type-title-weight",
      "path": "type.title.weight",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "800",
      "description": "Weight of the title voice (panel and row titles)",
      "part": "title",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-title-tracking",
      "path": "type.title.tracking",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0.02em",
      "description": "Letter-spacing of the title voice (panel and row titles)",
      "part": "title"
    },
    {
      "name": "nk-type-title-case",
      "path": "type.title.case",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-case)",
      "description": "Case of the title voice (panel and row titles)",
      "part": "title",
      "values": [
        "none",
        "uppercase"
      ]
    },
    {
      "name": "nk-type-title-pad",
      "path": "type.title.pad",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "var(--nk-type-overhang)",
      "description": "Trailing pad of the title voice (panel and row titles) (the italic overhang)",
      "part": "title"
    },
    {
      "name": "nk-type-label-family",
      "path": "type.label.family",
      "tier": "identity",
      "scope": "type",
      "type": "font",
      "default": "var(--font-display)",
      "description": "Face of the label voice (labels, row titles)",
      "part": "label"
    },
    {
      "name": "nk-type-label-style",
      "path": "type.label.style",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-slant)",
      "description": "Slant of the label voice (labels, row titles)",
      "part": "label",
      "values": [
        "normal",
        "italic"
      ]
    },
    {
      "name": "nk-type-label-weight",
      "path": "type.label.weight",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "700",
      "description": "Weight of the label voice (labels, row titles)",
      "part": "label",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-label-tracking",
      "path": "type.label.tracking",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0.03em",
      "description": "Letter-spacing of the label voice (labels, row titles)",
      "part": "label"
    },
    {
      "name": "nk-type-label-case",
      "path": "type.label.case",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-case)",
      "description": "Case of the label voice (labels, row titles)",
      "part": "label",
      "values": [
        "none",
        "uppercase"
      ]
    },
    {
      "name": "nk-type-label-pad",
      "path": "type.label.pad",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "var(--nk-type-overhang)",
      "description": "Trailing pad of the label voice (labels, row titles) (the italic overhang)",
      "part": "label"
    },
    {
      "name": "nk-type-num-family",
      "path": "type.num.family",
      "tier": "identity",
      "scope": "type",
      "type": "font",
      "default": "var(--font-numeric)",
      "description": "Face of the numeric voice",
      "part": "num"
    },
    {
      "name": "nk-type-num-style",
      "path": "type.num.style",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "var(--nk-type-slant)",
      "description": "Slant of the numeric voice",
      "part": "num",
      "values": [
        "normal",
        "italic"
      ]
    },
    {
      "name": "nk-type-num-weight",
      "path": "type.num.weight",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "700",
      "description": "Weight of the numeric voice",
      "part": "num",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-num-tracking",
      "path": "type.num.tracking",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0.01em",
      "description": "Letter-spacing of the numeric voice",
      "part": "num"
    },
    {
      "name": "nk-type-num-case",
      "path": "type.num.case",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "none",
      "description": "Case of the numeric voice",
      "part": "num",
      "values": [
        "none",
        "uppercase"
      ]
    },
    {
      "name": "nk-type-num-pad",
      "path": "type.num.pad",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "var(--nk-type-overhang)",
      "description": "Trailing pad of the numeric voice (the italic overhang)",
      "part": "num"
    },
    {
      "name": "nk-type-body-family",
      "path": "type.body.family",
      "tier": "identity",
      "scope": "type",
      "type": "font",
      "default": "var(--font-sans)",
      "description": "Face of the body voice (sentences)",
      "part": "body"
    },
    {
      "name": "nk-type-body-style",
      "path": "type.body.style",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "normal",
      "description": "Slant of the body voice (sentences)",
      "part": "body",
      "values": [
        "normal",
        "italic"
      ]
    },
    {
      "name": "nk-type-body-weight",
      "path": "type.body.weight",
      "tier": "identity",
      "scope": "type",
      "type": "number",
      "default": "var(--nk-type-weight-body)",
      "description": "Weight of the body voice (sentences)",
      "part": "body",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-type-body-tracking",
      "path": "type.body.tracking",
      "tier": "identity",
      "scope": "type",
      "type": "length",
      "default": "0em",
      "description": "Letter-spacing of the body voice (sentences)",
      "part": "body"
    },
    {
      "name": "nk-type-body-case",
      "path": "type.body.case",
      "tier": "identity",
      "scope": "type",
      "type": "keyword",
      "default": "none",
      "description": "Case of the body voice (sentences)",
      "part": "body",
      "values": [
        "none",
        "uppercase"
      ]
    },
    {
      "name": "nk-surface-tint",
      "path": "surface.tint",
      "tier": "identity",
      "scope": "surface",
      "type": "number",
      "default": "0",
      "description": "How much brand tints neutral surfaces",
      "range": [
        0,
        0.12
      ]
    },
    {
      "name": "nk-surface-gradient",
      "path": "surface.gradient",
      "tier": "identity",
      "scope": "surface",
      "type": "number",
      "default": "0",
      "description": "Top-to-bottom light falloff (0 = flat)",
      "range": [
        0,
        0.2
      ]
    },
    {
      "name": "nk-surface-elevation",
      "path": "surface.elevation",
      "tier": "identity",
      "scope": "surface",
      "type": "keyword",
      "default": "hard",
      "description": "Shadow recipe: hard is a solid offset drop, no blur",
      "values": [
        "none",
        "soft",
        "deep",
        "hard"
      ],
      "attr": "elevation"
    },
    {
      "name": "nk-surface-glow",
      "path": "surface.glow",
      "tier": "identity",
      "scope": "surface",
      "type": "number",
      "default": "0",
      "description": "Brand glow on active parts (alpha, 0 = off)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-surface-glow-budget",
      "path": "surface.glow-budget",
      "tier": "identity",
      "scope": "surface",
      "type": "number",
      "default": "1",
      "description": "How many parts may glow at once (0 = no limit)",
      "range": [
        0,
        8
      ]
    },
    {
      "name": "nk-surface-backdrop",
      "path": "surface.backdrop",
      "tier": "identity",
      "scope": "surface",
      "type": "keyword",
      "default": "off",
      "description": "Backdrop blur (FiveM draws it as a black box: off)",
      "values": [
        "on",
        "off"
      ],
      "attr": "backdrop"
    },
    {
      "name": "nk-surface-legibility",
      "path": "surface.legibility",
      "tier": "identity",
      "scope": "surface",
      "type": "keyword",
      "default": "auto",
      "description": "day lifts surfaces for a bright sky; auto follows the game clock",
      "values": [
        "auto",
        "night",
        "day"
      ],
      "attr": "legibility"
    },
    {
      "name": "nk-surface-legibility-lift",
      "path": "surface.legibility-lift",
      "tier": "identity",
      "scope": "surface",
      "type": "number",
      "default": "0.5",
      "description": "How far day closes the gap to opaque",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-surface-slash",
      "path": "surface.slash",
      "tier": "identity",
      "scope": "surface",
      "type": "keyword",
      "default": "none",
      "description": "A decorative diagonal cut on menus",
      "values": [
        "none",
        "cut"
      ],
      "attr": "slash"
    },
    {
      "name": "nk-material-hud-opacity",
      "path": "material.hud.opacity",
      "tier": "identity",
      "scope": "material",
      "type": "number",
      "default": "0.8",
      "description": "Opacity of the hud material",
      "part": "hud",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-material-hud-texture",
      "path": "material.hud.texture",
      "tier": "identity",
      "scope": "material",
      "type": "keyword",
      "default": "none",
      "description": "Texture over the hud material",
      "part": "hud",
      "values": [
        "none",
        "scanlines"
      ],
      "attr": "texture-hud"
    },
    {
      "name": "nk-material-menu-opacity",
      "path": "material.menu.opacity",
      "tier": "identity",
      "scope": "material",
      "type": "number",
      "default": "0.94",
      "description": "Opacity of the menu material (floor 0.92 for text)",
      "part": "menu",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-material-menu-blur",
      "path": "material.menu.blur",
      "tier": "identity",
      "scope": "material",
      "type": "length",
      "default": "0px",
      "description": "Backdrop blur behind menus (with surface.backdrop on)",
      "part": "menu"
    },
    {
      "name": "nk-material-menu-radius",
      "path": "material.menu.radius",
      "tier": "identity",
      "scope": "material",
      "type": "length",
      "default": "var(--radius)",
      "description": "Corner radius of menus, sheets and dialogs",
      "part": "menu"
    },
    {
      "name": "nk-material-menu-edge",
      "path": "material.menu.edge",
      "tier": "identity",
      "scope": "material",
      "type": "number",
      "default": "0",
      "description": "The machined top edge of menus (alpha)",
      "part": "menu",
      "range": [
        0,
        0.3
      ]
    },
    {
      "name": "nk-material-menu-texture",
      "path": "material.menu.texture",
      "tier": "identity",
      "scope": "material",
      "type": "keyword",
      "default": "none",
      "description": "Texture over the menu material",
      "part": "menu",
      "values": [
        "none",
        "scanlines"
      ],
      "attr": "texture-menu"
    },
    {
      "name": "nk-hud-text",
      "path": "hud.text",
      "tier": "identity",
      "scope": "hud",
      "type": "keyword",
      "default": "soft",
      "description": "Shadow under text drawn on the game (semantic depth.text draws it)",
      "values": [
        "none",
        "soft",
        "strong"
      ]
    },
    {
      "name": "nk-motion",
      "path": "motion",
      "tier": "identity",
      "scope": "motion",
      "type": "number",
      "default": "1",
      "description": "1 = animations on, 0 = off (painted 0 under the player's reduced-motion pref)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-motion-duration",
      "path": "motion.duration",
      "tier": "identity",
      "scope": "motion",
      "type": "time",
      "default": "180ms",
      "description": "Base duration d: the ladder is snap 0.5d, fast 0.667d, base d, slow 1.556d, fill 2.333d",
      "range": [
        0,
        2e3
      ]
    },
    {
      "name": "nk-motion-ease",
      "path": "motion.ease",
      "tier": "identity",
      "scope": "motion",
      "type": "ease",
      "default": "cubic-bezier(0.2, 0, 0, 1)",
      "description": "The curve of anything arriving"
    },
    {
      "name": "nk-motion-feel",
      "path": "motion.feel",
      "tier": "identity",
      "scope": "motion",
      "type": "keyword",
      "default": "crisp",
      "description": "How it moves: crisp, snap (flash instead of press scale), smooth (longer springs), stepped",
      "values": [
        "crisp",
        "snap",
        "smooth",
        "stepped"
      ],
      "attr": "feel"
    },
    {
      "name": "nk-motion-bounce",
      "path": "motion.bounce",
      "tier": "identity",
      "scope": "motion",
      "type": "number",
      "default": "0",
      "description": "Bounce folded into the snap, move and soft springs",
      "range": [
        0,
        0.3
      ]
    },
    {
      "name": "nk-motion-exit-factor",
      "path": "motion.exit-factor",
      "tier": "identity",
      "scope": "motion",
      "type": "number",
      "default": "0.7",
      "description": "Every exit is this \xD7 its enter",
      "range": [
        0.3,
        1
      ]
    },
    {
      "name": "nk-motion-reduced",
      "path": "motion.reduced",
      "tier": "identity",
      "scope": "motion",
      "type": "time",
      "default": "100ms",
      "description": "Under reduced motion every fade is at most this",
      "range": [
        0,
        400
      ]
    },
    {
      "name": "nk-motion-profile",
      "path": "motion.profile",
      "tier": "identity",
      "scope": "motion",
      "type": "keyword",
      "default": "full",
      "description": "full: as designed; reduced: no movement, short fades; instant: nothing animates",
      "values": [
        "full",
        "reduced",
        "instant"
      ],
      "attr": "profile"
    },
    {
      "name": "nk-style-fill",
      "path": "style.fill",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "solid",
      "description": "Fills, the selection face and levels: solid (flat, vivid) or soft (a tint)",
      "values": [
        "solid",
        "soft"
      ],
      "attr": "fill"
    },
    {
      "name": "nk-style-level",
      "path": "style.level",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "liquid",
      "description": "How a level (0\u20131) is drawn by vitals, meters, holds",
      "values": [
        "bar",
        "ring",
        "liquid",
        "slab",
        "pips"
      ],
      "attr": "level"
    },
    {
      "name": "nk-style-hold",
      "path": "style.hold",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "fill",
      "description": "How a press-and-hold shows its progress",
      "values": [
        "bar",
        "ring",
        "fill"
      ],
      "attr": "hold"
    },
    {
      "name": "nk-style-gauge",
      "path": "style.gauge",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "digital",
      "description": "How gauges are drawn",
      "values": [
        "arc",
        "bar",
        "digital"
      ],
      "attr": "gauge"
    },
    {
      "name": "nk-style-focus",
      "path": "style.focus",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "halo",
      "description": "Focus on parts that are not rows (rows and buttons light like hover)",
      "values": [
        "ring",
        "halo",
        "tint",
        "fill",
        "invert",
        "bar"
      ],
      "attr": "focus"
    },
    {
      "name": "nk-style-vital",
      "path": "style.vital",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "expand",
      "description": "What a vital chip shows (expand: the tag opens on a change)",
      "values": [
        "auto",
        "pill",
        "value",
        "icon",
        "expand"
      ]
    },
    {
      "name": "nk-style-vital-icon",
      "path": "style.vital-icon",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "uniform",
      "description": "Vital icons: each vital's own colour, or the chip's ink",
      "values": [
        "vital",
        "uniform"
      ]
    },
    {
      "name": "nk-style-vital-neighbours",
      "path": "style.vital-neighbours",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "push",
      "description": "What a growing vital chip does to its neighbours",
      "values": [
        "push",
        "collapse",
        "overlay"
      ]
    },
    {
      "name": "nk-style-pause",
      "path": "style.pause",
      "tier": "identity",
      "scope": "style",
      "type": "keyword",
      "default": "sheet",
      "description": "The pause menu: a full-height sheet, or a light slash panel",
      "values": [
        "sheet",
        "slash"
      ],
      "attr": "pause"
    },
    {
      "name": "nk-behavior-alert",
      "path": "behavior.alert",
      "tier": "identity",
      "scope": "behavior",
      "type": "number",
      "default": "0.2",
      "description": "A level at or under this is an alert (vitals, durability)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-behavior-rest",
      "path": "behavior.rest",
      "tier": "identity",
      "scope": "behavior",
      "type": "time",
      "default": "3000ms",
      "description": "How long a changed HUD part stays open before it retracts (0 = never)",
      "range": [
        0,
        6e4
      ]
    },
    {
      "name": "nk-behavior-notify-info",
      "path": "behavior.notify.info",
      "tier": "identity",
      "scope": "behavior",
      "type": "time",
      "default": "4000ms",
      "description": "How long an info notice stays",
      "part": "notify",
      "range": [
        0,
        6e4
      ]
    },
    {
      "name": "nk-behavior-notify-success",
      "path": "behavior.notify.success",
      "tier": "identity",
      "scope": "behavior",
      "type": "time",
      "default": "4000ms",
      "description": "How long a success notice stays",
      "part": "notify",
      "range": [
        0,
        6e4
      ]
    },
    {
      "name": "nk-behavior-notify-warning",
      "path": "behavior.notify.warning",
      "tier": "identity",
      "scope": "behavior",
      "type": "time",
      "default": "5000ms",
      "description": "How long a warning stays",
      "part": "notify",
      "range": [
        0,
        6e4
      ]
    },
    {
      "name": "nk-behavior-notify-danger",
      "path": "behavior.notify.danger",
      "tier": "identity",
      "scope": "behavior",
      "type": "time",
      "default": "7000ms",
      "description": "How long a danger notice stays",
      "part": "notify",
      "range": [
        0,
        6e4
      ]
    },
    {
      "name": "nk-hue-line",
      "path": "hue.line",
      "tier": "identity",
      "scope": "hue",
      "type": "number",
      "default": "0.5",
      "description": "A role's line (borders, tracks)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-hue-tint",
      "path": "hue.tint",
      "tier": "identity",
      "scope": "hue",
      "type": "number",
      "default": "0.1",
      "description": "A role's tint (fills behind text)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-hue-glow",
      "path": "hue.glow",
      "tier": "identity",
      "scope": "hue",
      "type": "number",
      "default": "0.25",
      "description": "A role's glow (under the glow budget)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-hue-alert",
      "path": "hue.alert",
      "tier": "identity",
      "scope": "hue",
      "type": "number",
      "default": "0.8",
      "description": "A role's alert wash",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-layer-dim",
      "path": "layer.dim",
      "tier": "identity",
      "scope": "layer",
      "type": "number",
      "default": "50",
      "description": "Stacking layer: dim (a modal is the current surface + dim + dialog)",
      "range": [
        0,
        1e5
      ]
    },
    {
      "name": "nk-layer-dialog",
      "path": "layer.dialog",
      "tier": "identity",
      "scope": "layer",
      "type": "number",
      "default": "60",
      "description": "Stacking layer: dialog (a modal is the current surface + dim + dialog)",
      "range": [
        0,
        1e5
      ]
    },
    {
      "name": "nk-time-snap",
      "path": "time.snap",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "90ms",
      "description": "A press, a rim switching state (0.5d)",
      "derived": true,
      "rule": "0.5 \xD7 motion.duration"
    },
    {
      "name": "nk-time-fast",
      "path": "time.fast",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "120ms",
      "description": "Hover, a face rising, a deny beat (0.667d)",
      "derived": true,
      "rule": "0.667 \xD7 motion.duration"
    },
    {
      "name": "nk-time-base",
      "path": "time.base",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "180ms",
      "description": "Panel enter, the selection tile, tab switch (d)",
      "derived": true,
      "rule": "motion.duration"
    },
    {
      "name": "nk-time-slow",
      "path": "time.slow",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "280ms",
      "description": "Sheets, dialogs, a tile landing, toasts, a confirm pop (1.556d)",
      "derived": true,
      "rule": "1.556 \xD7 motion.duration"
    },
    {
      "name": "nk-time-fill",
      "path": "time.fill",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "420ms",
      "description": "A level filling or draining; HUD show-on-change (2.333d)",
      "derived": true,
      "rule": "2.333 \xD7 motion.duration"
    },
    {
      "name": "nk-time-exit",
      "path": "time.exit",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "126ms",
      "description": "Every exit (d \xD7 exit-factor)",
      "derived": true,
      "rule": "motion.duration \xD7 motion.exit-factor"
    },
    {
      "name": "nk-time-pulse",
      "path": "time.pulse",
      "tier": "semantic",
      "scope": "time",
      "type": "time",
      "default": "1000ms",
      "description": "One alert pulse",
      "derived": true,
      "rule": "1000ms (prefs clamp it)"
    },
    {
      "name": "nk-ease-enter",
      "path": "ease.enter",
      "tier": "semantic",
      "scope": "ease",
      "type": "ease",
      "default": "var(--nk-motion-ease)",
      "description": "Anything arriving: enter, hover"
    },
    {
      "name": "nk-ease-exit",
      "path": "ease.exit",
      "tier": "semantic",
      "scope": "ease",
      "type": "ease",
      "default": "cubic-bezier(0.4, 0, 1, 1)",
      "description": "Exits and things tucking away (speeds up as it leaves)"
    },
    {
      "name": "nk-ease-move",
      "path": "ease.move",
      "tier": "semantic",
      "scope": "ease",
      "type": "ease",
      "default": "var(--nk-motion-ease)",
      "description": "On-screen moves: the selection tile, FLIP, a tab underline"
    },
    {
      "name": "nk-ease-expand",
      "path": "ease.expand",
      "tier": "semantic",
      "scope": "ease",
      "type": "ease",
      "default": "cubic-bezier(0.16, 1, 0.3, 1)",
      "description": "Things opening and growing; full-screen enter"
    },
    {
      "name": "nk-ease-spring",
      "path": "ease.spring",
      "tier": "semantic",
      "scope": "ease",
      "type": "ease",
      "default": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "description": "An overshoot without a spring (confirm pops, press release)"
    },
    {
      "name": "nk-ease-breathe",
      "path": "ease.breathe",
      "tier": "semantic",
      "scope": "ease",
      "type": "ease",
      "default": "cubic-bezier(0.45, 0, 0.55, 1)",
      "description": "Loops: alert pulses"
    },
    {
      "name": "nk-spring-snap",
      "path": "spring.snap",
      "tier": "semantic",
      "scope": "spring",
      "type": "string",
      "default": "0ms 0",
      "description": "Spring: selection, tab underline, needle catch-up",
      "derived": true
    },
    {
      "name": "nk-spring-move",
      "path": "spring.move",
      "tier": "semantic",
      "scope": "spring",
      "type": "string",
      "default": "0ms 0",
      "description": "Spring: toasts in, FLIP reflow, drawers, digit roll",
      "derived": true
    },
    {
      "name": "nk-spring-soft",
      "path": "spring.soft",
      "tier": "semantic",
      "scope": "spring",
      "type": "string",
      "default": "0ms 0",
      "description": "Spring: full-screen content, large frame changes",
      "derived": true
    },
    {
      "name": "nk-spring-pop",
      "path": "spring.pop",
      "tier": "semantic",
      "scope": "spring",
      "type": "string",
      "default": "0ms 0",
      "description": "Spring: rewards only",
      "derived": true
    },
    {
      "name": "nk-stagger",
      "path": "stagger",
      "tier": "semantic",
      "scope": "stagger",
      "type": "time",
      "default": "40ms",
      "description": "Delay per item",
      "range": [
        0,
        200
      ],
      "derived": true,
      "rule": "40ms (prefs clamp it)"
    },
    {
      "name": "nk-stagger-max",
      "path": "stagger.max",
      "tier": "semantic",
      "scope": "stagger",
      "type": "time",
      "default": "100ms",
      "description": "Total cap: items past the cap enter together",
      "derived": true,
      "rule": "100ms"
    },
    {
      "name": "nk-gesture-lift",
      "path": "gesture.lift",
      "tier": "semantic",
      "scope": "gesture",
      "type": "length",
      "default": "0.5rem",
      "description": "A row's content and a slot sliding in on focus"
    },
    {
      "name": "nk-gesture-rise",
      "path": "gesture.rise",
      "tier": "semantic",
      "scope": "gesture",
      "type": "length",
      "default": "0.5rem",
      "description": "How far things rise as they enter"
    },
    {
      "name": "nk-gesture-land",
      "path": "gesture.land",
      "tier": "semantic",
      "scope": "gesture",
      "type": "number",
      "default": "0.6",
      "description": "The scale a tile lands from",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-gesture-deny",
      "path": "gesture.deny",
      "tier": "semantic",
      "scope": "gesture",
      "type": "length",
      "default": "0.3125rem",
      "description": "The deny shake's distance"
    },
    {
      "name": "nk-gesture-press",
      "path": "gesture.press",
      "tier": "semantic",
      "scope": "gesture",
      "type": "number",
      "default": "0.97",
      "description": "The scale of a pressed row or button",
      "range": [
        0.8,
        1
      ]
    },
    {
      "name": "nk-gesture-confirm",
      "path": "gesture.confirm",
      "tier": "semantic",
      "scope": "gesture",
      "type": "number",
      "default": "1.08",
      "description": "The short pop of a confirm",
      "range": [
        1,
        1.2
      ]
    },
    {
      "name": "nk-plate-color",
      "path": "plate.color",
      "tier": "semantic",
      "scope": "plate",
      "type": "color",
      "default": "var(--surface)",
      "description": "The plate colour (drawn at its material's opacity through its channels)"
    },
    {
      "name": "nk-plate-hair",
      "path": "plate.hair",
      "tier": "semantic",
      "scope": "plate",
      "type": "color",
      "default": "var(--border)",
      "description": "The plate's hairline"
    },
    {
      "name": "nk-plate-drop",
      "path": "plate.drop",
      "tier": "semantic",
      "scope": "plate",
      "type": "shadow",
      "default": "0 0.125rem 0 rgba(var(--scrim-rgb), 0.6)",
      "description": "The plate's drop: hard, no blur"
    },
    {
      "name": "nk-plate-bg",
      "path": "plate.bg",
      "tier": "semantic",
      "scope": "plate",
      "type": "color",
      "default": "rgba(var(--nk-plate-color-rgb, var(--surface-rgb)), var(--nk-alpha-menu))",
      "description": "The plate as drawn: its colour at the menu material's alpha"
    },
    {
      "name": "nk-plate-radius",
      "path": "plate.radius",
      "tier": "semantic",
      "scope": "plate",
      "type": "length",
      "default": "var(--nk-radius-surface)",
      "description": "The plate's radius"
    },
    {
      "name": "nk-fill-color",
      "path": "fill.color",
      "tier": "semantic",
      "scope": "fill",
      "type": "color",
      "default": "var(--foreground)",
      "description": "The bar"
    },
    {
      "name": "nk-fill-track",
      "path": "fill.track",
      "tier": "semantic",
      "scope": "fill",
      "type": "color",
      "default": "rgba(var(--foreground-rgb), 0.12)",
      "description": "The track behind it"
    },
    {
      "name": "nk-fill-tint",
      "path": "fill.tint",
      "tier": "semantic",
      "scope": "fill",
      "type": "color",
      "default": "rgba(var(--foreground-rgb), 0.12)",
      "description": "The soft tint: an outline button's hover, a row sweep"
    },
    {
      "name": "nk-fill-edge",
      "path": "fill.edge",
      "tier": "semantic",
      "scope": "fill",
      "type": "color",
      "default": "rgba(var(--foreground-rgb), 0.4)",
      "description": "The bar's leading 1px edge"
    },
    {
      "name": "nk-fill-alert",
      "path": "fill.alert",
      "tier": "semantic",
      "scope": "fill",
      "type": "color",
      "default": "var(--destructive)",
      "description": "The bar at or under behavior.alert"
    },
    {
      "name": "nk-fill-height",
      "path": "fill.height",
      "tier": "semantic",
      "scope": "fill",
      "type": "length",
      "default": "0.25rem",
      "description": "A level bar's thickness: fills, meters, gauge tracks"
    },
    {
      "name": "nk-accent-paint",
      "path": "accent.paint",
      "tier": "semantic",
      "scope": "accent",
      "type": "paint",
      "default": "var(--brand)",
      "description": "An active tile's face, the speedometer's level, the compass N (a colour or a gradient)"
    },
    {
      "name": "nk-accent-from",
      "path": "accent.from",
      "tier": "semantic",
      "scope": "accent",
      "type": "color",
      "default": "var(--brand)",
      "description": "First stop (SVG strokes)"
    },
    {
      "name": "nk-accent-via",
      "path": "accent.via",
      "tier": "semantic",
      "scope": "accent",
      "type": "color",
      "default": "var(--nk-accent-from)",
      "description": "Middle stop"
    },
    {
      "name": "nk-accent-to",
      "path": "accent.to",
      "tier": "semantic",
      "scope": "accent",
      "type": "color",
      "default": "var(--nk-accent-from)",
      "description": "Last stop"
    },
    {
      "name": "nk-gap-cluster",
      "path": "gap.cluster",
      "tier": "semantic",
      "scope": "gap",
      "type": "length",
      "default": "var(--nk-space-2)",
      "description": "Icon + text, key + label"
    },
    {
      "name": "nk-gap-items",
      "path": "gap.items",
      "tier": "semantic",
      "scope": "gap",
      "type": "length",
      "default": "var(--nk-space-1)",
      "description": "Items in a bar"
    },
    {
      "name": "nk-gap-pad-x",
      "path": "gap.pad-x",
      "tier": "semantic",
      "scope": "gap",
      "type": "length",
      "default": "var(--nk-space-3)",
      "description": "Inline padding of anything labelled"
    },
    {
      "name": "nk-gap-surface",
      "path": "gap.surface",
      "tier": "semantic",
      "scope": "gap",
      "type": "length",
      "default": "var(--nk-space-6)",
      "description": "Padding of a surface (dialog body, sheet column)"
    },
    {
      "name": "nk-line-width",
      "path": "line.width",
      "tier": "semantic",
      "scope": "line",
      "type": "length",
      "default": "var(--nk-shape-stroke)",
      "description": "Every hairline"
    },
    {
      "name": "nk-line-focus",
      "path": "line.focus",
      "tier": "semantic",
      "scope": "line",
      "type": "color",
      "default": "var(--ring)",
      "description": "A text field's caret rim (and a checkbox's or switch's lit rim): the only focus line"
    },
    {
      "name": "nk-line-clip",
      "path": "line.clip",
      "tier": "semantic",
      "scope": "line",
      "type": "string",
      "default": "none",
      "description": "clip-path of panels: the shape.cut chamfer, or none",
      "derived": true
    },
    {
      "name": "nk-line-clip-sm",
      "path": "line.clip-sm",
      "tier": "semantic",
      "scope": "line",
      "type": "string",
      "default": "none",
      "description": "clip-path of chips, tiles and buttons: half the chamfer",
      "derived": true
    },
    {
      "name": "nk-line-glow",
      "path": "line.glow",
      "tier": "semantic",
      "scope": "line",
      "type": "length",
      "default": "1rem",
      "description": "Blur radius of a row's glow (a chip's is 0.75 of it, a meter's 0.625)"
    },
    {
      "name": "nk-depth-elevation",
      "path": "depth.elevation",
      "tier": "semantic",
      "scope": "depth",
      "type": "shadow",
      "default": "0 0.25rem 0 0 rgba(var(--scrim-rgb), 0.5)",
      "description": "The box-shadow surface.elevation names (compileTheme writes the recipe)",
      "derived": true,
      "rule": "from surface.elevation"
    },
    {
      "name": "nk-depth-text",
      "path": "depth.text",
      "tier": "semantic",
      "scope": "depth",
      "type": "shadow",
      "default": "0 1px 2px rgba(var(--scrim-rgb), 0.6)",
      "description": "The text-shadow hud.text names (compileTheme writes the recipe)",
      "derived": true,
      "rule": "from hud.text"
    },
    {
      "name": "nk-alpha-day",
      "path": "alpha.day",
      "tier": "semantic",
      "scope": "alpha",
      "type": "number",
      "default": "0",
      "description": "1 while day legibility applies (set by kit.css rules)",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-alpha-hud",
      "path": "alpha.hud",
      "tier": "semantic",
      "scope": "alpha",
      "type": "number",
      "default": "calc(var(--nk-material-hud-opacity) + (1 - var(--nk-material-hud-opacity)) * var(--nk-surface-legibility-lift) * var(--nk-alpha-day))",
      "description": "The HUD's alpha"
    },
    {
      "name": "nk-alpha-menu",
      "path": "alpha.menu",
      "tier": "semantic",
      "scope": "alpha",
      "type": "number",
      "default": "calc(var(--nk-material-menu-opacity) + (1 - var(--nk-material-menu-opacity)) * var(--nk-surface-legibility-lift) * var(--nk-alpha-day))",
      "description": "Menus', sheets' and dialogs' alpha"
    },
    {
      "name": "nk-restore-muted-foreground",
      "path": "restore.muted-foreground",
      "tier": "semantic",
      "scope": "restore",
      "type": "color",
      "default": "var(--muted-foreground)",
      "description": "muted-foreground, as the theme set it"
    },
    {
      "name": "nk-restore-muted-foreground-rgb",
      "path": "restore.muted-foreground-rgb",
      "tier": "semantic",
      "scope": "restore",
      "type": "string",
      "default": "var(--muted-foreground-rgb)",
      "description": "Its channels"
    },
    {
      "name": "nk-restore-muted-foreground-a",
      "path": "restore.muted-foreground-a",
      "tier": "semantic",
      "scope": "restore",
      "type": "string",
      "default": "var(--muted-foreground-a)",
      "description": "Its alpha"
    },
    {
      "name": "nk-restore-background",
      "path": "restore.background",
      "tier": "semantic",
      "scope": "restore",
      "type": "color",
      "default": "var(--background)",
      "description": "background, as the theme set it"
    },
    {
      "name": "nk-restore-background-rgb",
      "path": "restore.background-rgb",
      "tier": "semantic",
      "scope": "restore",
      "type": "string",
      "default": "var(--background-rgb)",
      "description": "Its channels"
    },
    {
      "name": "nk-restore-background-a",
      "path": "restore.background-a",
      "tier": "semantic",
      "scope": "restore",
      "type": "string",
      "default": "var(--background-a)",
      "description": "Its alpha"
    },
    {
      "name": "nk-screen-ratio",
      "path": "screen.ratio",
      "tier": "component",
      "scope": "screen",
      "type": "number",
      "default": "1.7778",
      "description": "The content box's width / height (wider screens keep it, centred)",
      "range": [
        1,
        4
      ]
    },
    {
      "name": "nk-screen-max",
      "path": "screen.max",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "calc(100vh * var(--nk-screen-ratio))",
      "description": "The content box's width"
    },
    {
      "name": "nk-screen-edge",
      "path": "screen.edge",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "1.5rem",
      "description": "A zone's distance from the safe area (1rem at 4:3, 1.25rem at 16:10)"
    },
    {
      "name": "nk-screen-scale-min",
      "path": "screen.scale-min",
      "tier": "component",
      "scope": "screen",
      "type": "number",
      "default": "0.75",
      "description": "The rem floor as a fraction of the 1080p rem (720p and 4:3 stay readable)",
      "range": [
        0.5,
        1
      ]
    },
    {
      "name": "nk-screen-area-l",
      "path": "screen.area.l",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "max(0px, calc((100vw - var(--nk-screen-max)) / 2))",
      "description": "The box's left inset from the screen",
      "part": "area"
    },
    {
      "name": "nk-screen-area-r",
      "path": "screen.area.r",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "max(0px, calc((100vw - var(--nk-screen-max)) / 2))",
      "description": "The box's right inset",
      "part": "area"
    },
    {
      "name": "nk-screen-area-t",
      "path": "screen.area.t",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "0px",
      "description": "The box's top inset",
      "part": "area"
    },
    {
      "name": "nk-screen-area-b",
      "path": "screen.area.b",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "0px",
      "description": "The box's bottom inset",
      "part": "area"
    },
    {
      "name": "nk-screen-safe-x",
      "path": "screen.safe.x",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "0rem",
      "description": "A safe area inside the box, inline (TV overscan, a bezel)",
      "part": "safe"
    },
    {
      "name": "nk-screen-safe-y",
      "path": "screen.safe.y",
      "tier": "component",
      "scope": "screen",
      "type": "length",
      "default": "0rem",
      "description": "A safe area inside the box, block",
      "part": "safe"
    },
    {
      "name": "nk-zone-gap",
      "path": "zone.gap",
      "tier": "component",
      "scope": "zone",
      "type": "length",
      "default": "var(--nk-space-3)",
      "description": "Between what a zone stacks"
    },
    {
      "name": "nk-region-max",
      "path": "region.max",
      "tier": "component",
      "scope": "region",
      "type": "length",
      "default": "28rem",
      "description": "Its maximum width"
    },
    {
      "name": "nk-region-pad",
      "path": "region.pad",
      "tier": "component",
      "scope": "region",
      "type": "length",
      "default": "var(--nk-gap-surface)",
      "description": "Its padding"
    },
    {
      "name": "nk-grid-cell",
      "path": "grid.cell",
      "tier": "component",
      "scope": "grid",
      "type": "length",
      "default": "5.5rem",
      "description": "A cell's size"
    },
    {
      "name": "nk-grid-gap",
      "path": "grid.gap",
      "tier": "component",
      "scope": "grid",
      "type": "length",
      "default": "var(--nk-space-2)",
      "description": "Between cells"
    },
    {
      "name": "nk-tile-plate-color",
      "path": "tile.plate.color",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--border)",
      "description": "The solid plate behind the face",
      "part": "plate"
    },
    {
      "name": "nk-tile-plate-dim",
      "path": "tile.plate.dim",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--nk-tile-plate-color)",
      "description": "The plate on the HUD",
      "part": "plate"
    },
    {
      "name": "nk-tile-plate-x",
      "path": "tile.plate.x",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "0px",
      "description": "How far the plate sits right of the face (0 = none)",
      "part": "plate"
    },
    {
      "name": "nk-tile-plate-y",
      "path": "tile.plate.y",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "2px",
      "description": "How far the plate sits below the face",
      "part": "plate"
    },
    {
      "name": "nk-tile-plate-press",
      "path": "tile.plate.press",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "1px",
      "description": "How far a held tile presses toward its plate",
      "part": "plate"
    },
    {
      "name": "nk-tile-wall-height",
      "path": "tile.wall.height",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "0.1875rem",
      "description": "How far the face sits above its wall (the primary button, the selection)",
      "part": "wall"
    },
    {
      "name": "nk-tile-wall-shade",
      "path": "tile.wall.shade",
      "tier": "component",
      "scope": "tile",
      "type": "number",
      "default": "0.45",
      "description": "How dark the wall is (the scrim over the face colour)",
      "part": "wall",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-tile-face-color",
      "path": "tile.face.color",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--muted)",
      "description": "The face",
      "part": "face"
    },
    {
      "name": "nk-tile-face-ink",
      "path": "tile.face.ink",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--popover-foreground)",
      "description": "The legend's colour on the face",
      "part": "face"
    },
    {
      "name": "nk-tile-face-light",
      "path": "tile.face.light",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "rgba(var(--popover-foreground-rgb), 0.16)",
      "description": "The face's top hairline",
      "part": "face"
    },
    {
      "name": "nk-tile-face-shade",
      "path": "tile.face.shade",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "rgba(var(--scrim-rgb), 0)",
      "description": "The face's bottom inner shade",
      "part": "face"
    },
    {
      "name": "nk-tile-face-rim",
      "path": "tile.face.rim",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "rgba(var(--foreground-rgb), 0.32)",
      "description": "The face's rim",
      "part": "face"
    },
    {
      "name": "nk-tile-face-rim-focus",
      "path": "tile.face.rim-focus",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "rgba(var(--foreground-rgb), 0.4)",
      "description": "The rim while lit",
      "part": "face"
    },
    {
      "name": "nk-tile-face-radius",
      "path": "tile.face.radius",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "var(--nk-radius-key)",
      "description": "The face's radius",
      "part": "face"
    },
    {
      "name": "nk-tile-face-skew",
      "path": "tile.face.skew",
      "tier": "component",
      "scope": "tile",
      "type": "angle",
      "default": "var(--nk-shape-skew)",
      "description": "The face's slant (the box stays upright)",
      "part": "face"
    },
    {
      "name": "nk-tile-face-shadow",
      "path": "tile.face.shadow",
      "tier": "component",
      "scope": "tile",
      "type": "shadow",
      "default": "inset 0 -1px 0 0 var(--nk-tile-face-shade), inset 0 1px 0 0 var(--nk-tile-face-light)",
      "description": "The face's inner light and shade",
      "part": "face"
    },
    {
      "name": "nk-tile-face-clip",
      "path": "tile.face.clip",
      "tier": "component",
      "scope": "tile",
      "type": "string",
      "default": "var(--nk-line-clip-sm)",
      "description": "The face's clip-path (the chamfer)",
      "part": "face"
    },
    {
      "name": "nk-tile-face-confirm",
      "path": "tile.face.confirm",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--foreground)",
      "description": "The face when confirmed",
      "part": "face"
    },
    {
      "name": "nk-tile-face-confirm-ink",
      "path": "tile.face.confirm-ink",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--background)",
      "description": "The legend when confirmed",
      "part": "face"
    },
    {
      "name": "nk-tile-face-active",
      "path": "tile.face.active",
      "tier": "component",
      "scope": "tile",
      "type": "paint",
      "default": "var(--nk-accent-paint)",
      "description": "The face of an active tile (the mic while talking, N on the compass, a checked box)",
      "part": "face"
    },
    {
      "name": "nk-tile-face-hold",
      "path": "tile.face.hold",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "rgba(var(--foreground-rgb), 0.35)",
      "description": "The hold fill over the face",
      "part": "face"
    },
    {
      "name": "nk-tile-legend-font",
      "path": "tile.legend.font",
      "tier": "component",
      "scope": "tile",
      "type": "font",
      "default": "var(--nk-type-scan-family)",
      "description": "The legend's face",
      "part": "legend"
    },
    {
      "name": "nk-tile-legend-weight",
      "path": "tile.legend.weight",
      "tier": "component",
      "scope": "tile",
      "type": "number",
      "default": "var(--nk-type-scan-weight)",
      "description": "The legend's weight",
      "part": "legend",
      "range": [
        100,
        900
      ]
    },
    {
      "name": "nk-tile-legend-pad",
      "path": "tile.legend.pad",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "calc(var(--nk-type-scan-pad) / 2)",
      "description": "The italic overhang split to both sides",
      "part": "legend"
    },
    {
      "name": "nk-tile-legend-shift",
      "path": "tile.legend.shift",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "0em",
      "description": "A nudge for a leaning face",
      "part": "legend"
    },
    {
      "name": "nk-tile-legend-gap",
      "path": "tile.legend.gap",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "var(--nk-space-1)",
      "description": "Between a tile's glyphs",
      "part": "legend"
    },
    {
      "name": "nk-tile-legend-inset",
      "path": "tile.legend.inset",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "var(--nk-space-1)",
      "description": "The legend's inline padding",
      "part": "legend"
    },
    {
      "name": "nk-tile-tag-delay",
      "path": "tile.tag.delay",
      "tier": "component",
      "scope": "tile",
      "type": "time",
      "default": "80ms",
      "description": "The tag opens this long after the tile lands",
      "part": "tag"
    },
    {
      "name": "nk-tile-key-color",
      "path": "tile.key.color",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--primary)",
      "description": "The keycap face under style.fill solid (the primary button, the lit row, the active tab)",
      "part": "key"
    },
    {
      "name": "nk-tile-key-ink",
      "path": "tile.key.ink",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "var(--primary-foreground)",
      "description": "Text on the keycap face",
      "part": "key"
    },
    {
      "name": "nk-tile-key-rim",
      "path": "tile.key.rim",
      "tier": "component",
      "scope": "tile",
      "type": "color",
      "default": "transparent",
      "description": "The keycap face's rim (transparent = none)",
      "part": "key"
    },
    {
      "name": "nk-tile-key-radius",
      "path": "tile.key.radius",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "var(--nk-radius-control)",
      "description": "The keycap's radius",
      "part": "key"
    },
    {
      "name": "nk-tile-key-tint",
      "path": "tile.key.tint",
      "tier": "component",
      "scope": "tile",
      "type": "number",
      "default": "0.16",
      "description": "The face's opacity under style.fill soft",
      "part": "key",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-tile-key-inset",
      "path": "tile.key.inset",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "0.375rem",
      "description": "How far a selection tile sits in from its item's sides (room for the skew)",
      "part": "key"
    },
    {
      "name": "nk-tile-key-lift",
      "path": "tile.key.lift",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "1px",
      "description": "How far the face rises on hover and focus",
      "part": "key"
    },
    {
      "name": "nk-tile-key-press",
      "path": "tile.key.press",
      "tier": "component",
      "scope": "tile",
      "type": "number",
      "default": "0.67",
      "description": "How far a pressed keycap sinks, as a fraction of its wall",
      "part": "key",
      "range": [
        0,
        1.5
      ]
    },
    {
      "name": "nk-tile-key-overhang",
      "path": "tile.key.overhang",
      "tier": "component",
      "scope": "tile",
      "type": "length",
      "default": "0.25rem",
      "description": "How far a row's selection tile reaches past its text",
      "part": "key"
    },
    {
      "name": "nk-panel-bg",
      "path": "panel.bg",
      "tier": "component",
      "scope": "panel",
      "type": "color",
      "default": "rgba(var(--surface-rgb), calc(var(--surface-a) * var(--nk-alpha-menu)))",
      "description": "The panel's fill: the surface at the menu material's alpha"
    },
    {
      "name": "nk-panel-fg",
      "path": "panel.fg",
      "tier": "component",
      "scope": "panel",
      "type": "color",
      "default": "var(--popover-foreground)",
      "description": "Text in the panel"
    },
    {
      "name": "nk-panel-border",
      "path": "panel.border",
      "tier": "component",
      "scope": "panel",
      "type": "color",
      "default": "var(--nk-plate-hair)",
      "description": "The panel's hairline"
    },
    {
      "name": "nk-panel-radius",
      "path": "panel.radius",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "var(--nk-radius-surface)",
      "description": "The panel's radius"
    },
    {
      "name": "nk-panel-blur",
      "path": "panel.blur",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "var(--nk-material-menu-blur)",
      "description": "Backdrop blur (with surface.backdrop on)"
    },
    {
      "name": "nk-panel-cut",
      "path": "panel.cut",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "var(--nk-shape-cut)",
      "description": "The chamfer's size"
    },
    {
      "name": "nk-panel-clip",
      "path": "panel.clip",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "var(--nk-line-clip)",
      "description": "The panel's clip-path"
    },
    {
      "name": "nk-panel-gradient",
      "path": "panel.gradient",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "linear-gradient(180deg, rgba(var(--popover-foreground-rgb), var(--nk-surface-gradient)), rgba(var(--popover-foreground-rgb), 0) 60%)",
      "description": "The light falloff"
    },
    {
      "name": "nk-panel-edge",
      "path": "panel.edge",
      "tier": "component",
      "scope": "panel",
      "type": "shadow",
      "default": "inset 0 1px 0 0 rgba(var(--popover-foreground-rgb), var(--nk-material-menu-edge))",
      "description": "The machined top edge"
    },
    {
      "name": "nk-panel-shadow",
      "path": "panel.shadow",
      "tier": "component",
      "scope": "panel",
      "type": "shadow",
      "default": "var(--nk-depth-elevation)",
      "description": "The panel's drop: the elevation recipe"
    },
    {
      "name": "nk-panel-divider",
      "path": "panel.divider",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "var(--nk-line-width) solid var(--nk-panel-border)",
      "description": "The one hairline under a header"
    },
    {
      "name": "nk-panel-width",
      "path": "panel.width",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "20rem",
      "description": "Width (md)"
    },
    {
      "name": "nk-panel-width-sm",
      "path": "panel.width-sm",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "18rem",
      "description": "Width (sm)"
    },
    {
      "name": "nk-panel-width-lg",
      "path": "panel.width-lg",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "24rem",
      "description": "Width (lg)"
    },
    {
      "name": "nk-panel-header-height",
      "path": "panel.header.height",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "calc(3.25rem * var(--nk-density))",
      "description": "A header's minimum height",
      "part": "header"
    },
    {
      "name": "nk-panel-header-padding",
      "path": "panel.header.padding",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "var(--nk-gap-surface) var(--nk-gap-surface) var(--nk-space-4)",
      "description": "Surface padding; the title a step off its hairline",
      "part": "header"
    },
    {
      "name": "nk-panel-title-size",
      "path": "panel.title.size",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "var(--nk-text-title)",
      "description": "A panel title's size",
      "part": "title"
    },
    {
      "name": "nk-panel-body-padding",
      "path": "panel.body.padding",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "var(--nk-space-3)",
      "description": "The body's padding",
      "part": "body"
    },
    {
      "name": "nk-panel-footer-padding",
      "path": "panel.footer.padding",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "var(--nk-space-4) var(--nk-gap-surface) var(--nk-gap-surface)",
      "description": "On the panel itself, no rule above it",
      "part": "footer"
    },
    {
      "name": "nk-panel-footer-rule",
      "path": "panel.footer.rule",
      "tier": "component",
      "scope": "panel",
      "type": "string",
      "default": "none",
      "description": "A rule above the footer (none: spacing separates it)",
      "part": "footer"
    },
    {
      "name": "nk-panel-actions-bracket",
      "path": "panel.actions.bracket",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "0px",
      "description": "L-shaped corner marks (0 = off)",
      "part": "actions"
    },
    {
      "name": "nk-panel-actions-bracket-width",
      "path": "panel.actions.bracket-width",
      "tier": "component",
      "scope": "panel",
      "type": "length",
      "default": "calc(var(--nk-line-width) * 2)",
      "description": "The marks' weight",
      "part": "actions"
    },
    {
      "name": "nk-panel-actions-bracket-color",
      "path": "panel.actions.bracket-color",
      "tier": "component",
      "scope": "panel",
      "type": "color",
      "default": "var(--brand)",
      "description": "The marks' colour",
      "part": "actions"
    },
    {
      "name": "nk-display-size",
      "path": "display.size",
      "tier": "component",
      "scope": "display",
      "type": "length",
      "default": "var(--nk-text-display)",
      "description": "Size"
    },
    {
      "name": "nk-display-weight",
      "path": "display.weight",
      "tier": "component",
      "scope": "display",
      "type": "string",
      "default": "var(--nk-type-weight-display)",
      "description": "Weight"
    },
    {
      "name": "nk-display-tracking",
      "path": "display.tracking",
      "tier": "component",
      "scope": "display",
      "type": "length",
      "default": "var(--nk-type-tracking-display)",
      "description": "Letter-spacing"
    },
    {
      "name": "nk-display-case",
      "path": "display.case",
      "tier": "component",
      "scope": "display",
      "type": "string",
      "default": "var(--nk-type-case)",
      "description": "Case"
    },
    {
      "name": "nk-caption-font",
      "path": "caption.font",
      "tier": "component",
      "scope": "caption",
      "type": "string",
      "default": "var(--nk-type-label-family)",
      "description": "Face"
    },
    {
      "name": "nk-caption-size",
      "path": "caption.size",
      "tier": "component",
      "scope": "caption",
      "type": "length",
      "default": "var(--nk-text-label)",
      "description": "Size"
    },
    {
      "name": "nk-caption-weight",
      "path": "caption.weight",
      "tier": "component",
      "scope": "caption",
      "type": "string",
      "default": "var(--nk-type-weight-strong)",
      "description": "Weight"
    },
    {
      "name": "nk-caption-case",
      "path": "caption.case",
      "tier": "component",
      "scope": "caption",
      "type": "string",
      "default": "var(--nk-type-case)",
      "description": "Case"
    },
    {
      "name": "nk-caption-tracking",
      "path": "caption.tracking",
      "tier": "component",
      "scope": "caption",
      "type": "length",
      "default": "var(--nk-type-tracking-label)",
      "description": "Letter-spacing"
    },
    {
      "name": "nk-row-height",
      "path": "row.height",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "var(--nk-height-row)",
      "description": "A single-line row's minimum height"
    },
    {
      "name": "nk-row-radius",
      "path": "row.radius",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "var(--nk-radius-control)",
      "description": "The row's radius"
    },
    {
      "name": "nk-row-clip",
      "path": "row.clip",
      "tier": "component",
      "scope": "row",
      "type": "string",
      "default": "var(--nk-line-clip-sm)",
      "description": "The row's clip-path"
    },
    {
      "name": "nk-row-pad-y",
      "path": "row.pad-y",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "var(--nk-space-2)",
      "description": "Block padding"
    },
    {
      "name": "nk-row-pad-x",
      "path": "row.pad-x",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "var(--nk-space-3)",
      "description": "Inline padding"
    },
    {
      "name": "nk-row-padding",
      "path": "row.padding",
      "tier": "component",
      "scope": "row",
      "type": "string",
      "default": "var(--nk-row-pad-y) var(--nk-row-pad-x)",
      "description": "Both paddings"
    },
    {
      "name": "nk-row-gap",
      "path": "row.gap",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "var(--nk-space-4)",
      "description": "Between the icon tile, the text and the trail"
    },
    {
      "name": "nk-row-font-size",
      "path": "row.font-size",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "var(--nk-text-base)",
      "description": "The row's text size"
    },
    {
      "name": "nk-row-accent",
      "path": "row.accent",
      "tier": "component",
      "scope": "row",
      "type": "color",
      "default": "var(--brand)",
      "description": "The colour that marks the active row or slot (an outline, a hold ring)"
    },
    {
      "name": "nk-row-icon-box",
      "path": "row.icon.box",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "2rem",
      "description": "The icon tile beside the title (the icon inside is icon.md)",
      "part": "icon"
    },
    {
      "name": "nk-row-bar-width",
      "path": "row.bar.width",
      "tier": "component",
      "scope": "row",
      "type": "length",
      "default": "0.1875rem",
      "description": "The focus bar's width (style.focus: bar)",
      "part": "bar"
    },
    {
      "name": "nk-list-gap",
      "path": "list.gap",
      "tier": "component",
      "scope": "list",
      "type": "length",
      "default": "calc(var(--nk-tile-wall-height) + var(--nk-space-1))",
      "description": "Between items: the wall plus breathing room"
    },
    {
      "name": "nk-list-pad-x",
      "path": "list.pad-x",
      "tier": "component",
      "scope": "list",
      "type": "length",
      "default": "calc(var(--nk-tile-key-inset) + var(--nk-tile-key-overhang))",
      "description": "Inline padding: room for the tile's inset and skew"
    },
    {
      "name": "nk-menu-row-gap",
      "path": "menu-row.gap",
      "tier": "component",
      "scope": "menu-row",
      "type": "length",
      "default": "var(--nk-space-1)",
      "description": "Between a trail's controls"
    },
    {
      "name": "nk-menu-row-image-size",
      "path": "menu-row.image.size",
      "tier": "component",
      "scope": "menu-row",
      "type": "length",
      "default": "2rem",
      "description": "An image's box",
      "part": "image"
    },
    {
      "name": "nk-menu-row-progress-height",
      "path": "menu-row.progress.height",
      "tier": "component",
      "scope": "menu-row",
      "type": "length",
      "default": "0.25rem",
      "description": "The progress bar's height",
      "part": "progress"
    },
    {
      "name": "nk-menu-row-value-width",
      "path": "menu-row.value.width",
      "tier": "component",
      "scope": "menu-row",
      "type": "length",
      "default": "3rem",
      "description": "The value column's minimum width",
      "part": "value"
    },
    {
      "name": "nk-selection-time",
      "path": "selection.time",
      "tier": "component",
      "scope": "selection",
      "type": "time",
      "default": "var(--nk-time-base)",
      "description": "How long the tile glides"
    },
    {
      "name": "nk-selection-ease",
      "path": "selection.ease",
      "tier": "component",
      "scope": "selection",
      "type": "string",
      "default": "var(--nk-ease-move)",
      "description": "The glide's curve"
    },
    {
      "name": "nk-field-caret-width",
      "path": "field.caret.width",
      "tier": "component",
      "scope": "field",
      "type": "length",
      "default": "0.125rem",
      "description": "The drawn caret's width",
      "part": "caret"
    },
    {
      "name": "nk-field-caret-time",
      "path": "field.caret.time",
      "tier": "component",
      "scope": "field",
      "type": "time",
      "default": "var(--nk-time-base)",
      "description": "The caret's glide",
      "part": "caret"
    },
    {
      "name": "nk-field-caret-ease",
      "path": "field.caret.ease",
      "tier": "component",
      "scope": "field",
      "type": "string",
      "default": "var(--nk-ease-move)",
      "description": "The caret's curve",
      "part": "caret"
    },
    {
      "name": "nk-field-mirror-rise",
      "path": "field.mirror.rise",
      "tier": "component",
      "scope": "field",
      "type": "length",
      "default": "0.45em",
      "description": "How far a typed character rises in",
      "part": "mirror"
    },
    {
      "name": "nk-field-mirror-in",
      "path": "field.mirror.in",
      "tier": "component",
      "scope": "field",
      "type": "time",
      "default": "var(--nk-time-slow)",
      "description": "A typed character's entrance",
      "part": "mirror"
    },
    {
      "name": "nk-field-mirror-out",
      "path": "field.mirror.out",
      "tier": "component",
      "scope": "field",
      "type": "time",
      "default": "var(--nk-time-exit)",
      "description": "A deleted character's exit",
      "part": "mirror"
    },
    {
      "name": "nk-stepper-delay",
      "path": "stepper.delay",
      "tier": "component",
      "scope": "stepper",
      "type": "time",
      "default": "350ms",
      "description": "The first repeat of a held keycap"
    },
    {
      "name": "nk-stepper-rate",
      "path": "stepper.rate",
      "tier": "component",
      "scope": "stepper",
      "type": "time",
      "default": "70ms",
      "description": "Then one repeat every"
    },
    {
      "name": "nk-text-key-scale",
      "path": "text.key.scale",
      "tier": "component",
      "scope": "text",
      "type": "number",
      "default": "1",
      "description": "The inline keycap's size, \xD7 height.key",
      "part": "key",
      "range": [
        0.5,
        2
      ]
    },
    {
      "name": "nk-notice-width",
      "path": "notice.width",
      "tier": "component",
      "scope": "notice",
      "type": "length",
      "default": "20rem",
      "description": "Width (md)"
    },
    {
      "name": "nk-notice-width-sm",
      "path": "notice.width-sm",
      "tier": "component",
      "scope": "notice",
      "type": "length",
      "default": "18rem",
      "description": "Width (sm)"
    },
    {
      "name": "nk-notice-width-lg",
      "path": "notice.width-lg",
      "tier": "component",
      "scope": "notice",
      "type": "length",
      "default": "24rem",
      "description": "Width (lg)"
    },
    {
      "name": "nk-confirm-width",
      "path": "confirm.width",
      "tier": "component",
      "scope": "confirm",
      "type": "length",
      "default": "24rem",
      "description": "Width (md)"
    },
    {
      "name": "nk-confirm-width-sm",
      "path": "confirm.width-sm",
      "tier": "component",
      "scope": "confirm",
      "type": "length",
      "default": "20rem",
      "description": "Width (sm)"
    },
    {
      "name": "nk-edge-sheet-header-height",
      "path": "edge-sheet.header.height",
      "tier": "component",
      "scope": "edge-sheet",
      "type": "length",
      "default": "2rem",
      "description": "The header's minimum height",
      "part": "header"
    },
    {
      "name": "nk-chip-height",
      "path": "chip.height",
      "tier": "component",
      "scope": "chip",
      "type": "length",
      "default": "var(--nk-height-chip)",
      "description": "Height"
    },
    {
      "name": "nk-chip-padding",
      "path": "chip.padding",
      "tier": "component",
      "scope": "chip",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 2.5)",
      "description": "Inline padding"
    },
    {
      "name": "nk-chip-radius",
      "path": "chip.radius",
      "tier": "component",
      "scope": "chip",
      "type": "length",
      "default": "var(--nk-radius-chip)",
      "description": "Radius"
    },
    {
      "name": "nk-chip-hud-radius",
      "path": "chip.hud-radius",
      "tier": "component",
      "scope": "chip",
      "type": "length",
      "default": "max(0.25rem, calc(var(--radius) - 0.125rem))",
      "description": "A square HUD tile's radius (hotbar, target eye)"
    },
    {
      "name": "nk-chip-bg",
      "path": "chip.bg",
      "tier": "component",
      "scope": "chip",
      "type": "color",
      "default": "rgba(var(--hud-rgb), max(var(--hud-a), var(--nk-alpha-hud)))",
      "description": "The plate on the game"
    },
    {
      "name": "nk-chip-fg",
      "path": "chip.fg",
      "tier": "component",
      "scope": "chip",
      "type": "color",
      "default": "var(--hud-foreground)",
      "description": "Text and icons"
    },
    {
      "name": "nk-chip-font-size",
      "path": "chip.font-size",
      "tier": "component",
      "scope": "chip",
      "type": "length",
      "default": "0.875rem",
      "description": "Text size"
    },
    {
      "name": "nk-chip-weight",
      "path": "chip.weight",
      "tier": "component",
      "scope": "chip",
      "type": "string",
      "default": "var(--nk-type-weight-strong)",
      "description": "Text weight"
    },
    {
      "name": "nk-chip-active-bg",
      "path": "chip.active-bg",
      "tier": "component",
      "scope": "chip",
      "type": "color",
      "default": "var(--brand)",
      "description": "An active chip's fill (rises from the bottom)"
    },
    {
      "name": "nk-chip-active-fg",
      "path": "chip.active-fg",
      "tier": "component",
      "scope": "chip",
      "type": "color",
      "default": "var(--brand-foreground)",
      "description": "An active chip's ink"
    },
    {
      "name": "nk-chip-glow",
      "path": "chip.glow",
      "tier": "component",
      "scope": "chip",
      "type": "shadow",
      "default": "0 0 calc(var(--nk-line-glow) * 0.75) rgba(var(--brand-rgb), var(--nk-surface-glow))",
      "description": "An active chip's glow"
    },
    {
      "name": "nk-chip-clip",
      "path": "chip.clip",
      "tier": "component",
      "scope": "chip",
      "type": "string",
      "default": "var(--nk-line-clip-sm)",
      "description": "The chip's clip-path"
    },
    {
      "name": "nk-chip-text-shadow",
      "path": "chip.text-shadow",
      "tier": "component",
      "scope": "chip",
      "type": "shadow",
      "default": "var(--nk-depth-text)",
      "description": "Text drawn on the game"
    },
    {
      "name": "nk-vital-chip-size",
      "path": "vital-chip.size",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "2.125rem",
      "description": "The chip's box"
    },
    {
      "name": "nk-vital-chip-size-sm",
      "path": "vital-chip.size-sm",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "1.625rem",
      "description": "A small chip's box (telltales, compass marks)"
    },
    {
      "name": "nk-vital-chip-tile-ratio",
      "path": "vital-chip.tile.ratio",
      "tier": "component",
      "scope": "vital-chip",
      "type": "number",
      "default": "0.94",
      "description": "The face as a fraction of the box",
      "part": "tile",
      "range": [
        0.5,
        1
      ]
    },
    {
      "name": "nk-vital-chip-icon-ratio",
      "path": "vital-chip.icon.ratio",
      "tier": "component",
      "scope": "vital-chip",
      "type": "number",
      "default": "0.52",
      "description": "The icon as a fraction of the face",
      "part": "icon",
      "range": [
        0.2,
        1
      ]
    },
    {
      "name": "nk-vital-chip-label-size",
      "path": "vital-chip.label.size",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "0.9375rem",
      "description": "The tag's text size",
      "part": "label"
    },
    {
      "name": "nk-vital-chip-label-gap",
      "path": "vital-chip.label.gap",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "1rem",
      "description": "Between the face and the tag's text",
      "part": "label"
    },
    {
      "name": "nk-vital-chip-line-width",
      "path": "vital-chip.line.width",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "0.125rem",
      "description": "The level line's thickness",
      "part": "line"
    },
    {
      "name": "nk-vital-chip-plate-drop",
      "path": "vital-chip.plate.drop",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "0.25rem",
      "description": "How far the wall drops straight below the face",
      "part": "plate"
    },
    {
      "name": "nk-vital-chip-plate-x",
      "path": "vital-chip.plate.x",
      "tier": "component",
      "scope": "vital-chip",
      "type": "length",
      "default": "0rem",
      "description": "The wall's sideways step",
      "part": "plate"
    },
    {
      "name": "nk-meter-radius",
      "path": "meter.radius",
      "tier": "component",
      "scope": "meter",
      "type": "length",
      "default": "0.125rem",
      "description": "The bar's radius"
    },
    {
      "name": "nk-meter-glow",
      "path": "meter.glow",
      "tier": "component",
      "scope": "meter",
      "type": "shadow",
      "default": "0 0 calc(var(--nk-line-glow) * 0.625) rgba(var(--brand-rgb), var(--nk-surface-glow))",
      "description": "The fill's glow"
    },
    {
      "name": "nk-meter-segments",
      "path": "meter.segments",
      "tier": "component",
      "scope": "meter",
      "type": "number",
      "default": "0",
      "description": "1 = segmented, 0 = a continuous fill",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-meter-track-color",
      "path": "meter.track.color",
      "tier": "component",
      "scope": "meter",
      "type": "color",
      "default": "rgba(var(--scrim-rgb), 0.35)",
      "description": "The track behind the bar",
      "part": "track"
    },
    {
      "name": "nk-meter-segment-size",
      "path": "meter.segment.size",
      "tier": "component",
      "scope": "meter",
      "type": "length",
      "default": "0.5rem",
      "description": "One segment's length",
      "part": "segment"
    },
    {
      "name": "nk-meter-segment-gap",
      "path": "meter.segment.gap",
      "tier": "component",
      "scope": "meter",
      "type": "length",
      "default": "0.125rem",
      "description": "The gap between segments",
      "part": "segment"
    },
    {
      "name": "nk-meter-segment-color",
      "path": "meter.segment.color",
      "tier": "component",
      "scope": "meter",
      "type": "color",
      "default": "rgba(var(--popover-rgb), calc(0.85 * var(--nk-meter-segments)))",
      "description": "The gap's colour (the panel showing through)",
      "part": "segment"
    },
    {
      "name": "nk-gauge-width",
      "path": "gauge.width",
      "tier": "component",
      "scope": "gauge",
      "type": "length",
      "default": "var(--nk-fill-height)",
      "description": "The arc's thickness"
    },
    {
      "name": "nk-gauge-ticks",
      "path": "gauge.ticks",
      "tier": "component",
      "scope": "gauge",
      "type": "number",
      "default": "0",
      "description": "Tick marks: 1 on, 0 off",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-gauge-font",
      "path": "gauge.font",
      "tier": "component",
      "scope": "gauge",
      "type": "string",
      "default": "var(--nk-type-num-family)",
      "description": "The readout's face"
    },
    {
      "name": "nk-gauge-track-color",
      "path": "gauge.track.color",
      "tier": "component",
      "scope": "gauge",
      "type": "color",
      "default": "rgba(var(--hud-foreground-rgb), 0.16)",
      "description": "The unlit arc",
      "part": "track"
    },
    {
      "name": "nk-gauge-fill-color",
      "path": "gauge.fill.color",
      "tier": "component",
      "scope": "gauge",
      "type": "color",
      "default": "var(--brand)",
      "description": "The lit arc",
      "part": "fill"
    },
    {
      "name": "nk-gauge-needle-color",
      "path": "gauge.needle.color",
      "tier": "component",
      "scope": "gauge",
      "type": "color",
      "default": "var(--brand)",
      "description": "The needle",
      "part": "needle"
    },
    {
      "name": "nk-gauge-redline-color",
      "path": "gauge.redline.color",
      "tier": "component",
      "scope": "gauge",
      "type": "color",
      "default": "var(--destructive)",
      "description": "The redline",
      "part": "redline"
    },
    {
      "name": "nk-gauge-tick-color",
      "path": "gauge.tick.color",
      "tier": "component",
      "scope": "gauge",
      "type": "color",
      "default": "rgba(var(--hud-foreground-rgb), calc(0.55 * var(--nk-gauge-ticks)))",
      "description": "A minor tick",
      "part": "tick"
    },
    {
      "name": "nk-gauge-tick-major",
      "path": "gauge.tick.major",
      "tier": "component",
      "scope": "gauge",
      "type": "color",
      "default": "rgba(var(--hud-foreground-rgb), calc(0.9 * var(--nk-gauge-ticks)))",
      "description": "A major tick",
      "part": "tick"
    },
    {
      "name": "nk-dial-disc-opacity",
      "path": "dial.disc.opacity",
      "tier": "component",
      "scope": "dial",
      "type": "number",
      "default": "var(--nk-alpha-hud)",
      "description": "The disc's opacity under the arc",
      "part": "disc",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-ring-segments",
      "path": "ring.segments",
      "tier": "component",
      "scope": "ring",
      "type": "number",
      "default": "24",
      "description": "Segments in the ring",
      "range": [
        6,
        60
      ]
    },
    {
      "name": "nk-ring-gap",
      "path": "ring.gap",
      "tier": "component",
      "scope": "ring",
      "type": "number",
      "default": "4",
      "description": "Degrees between segments",
      "range": [
        0,
        12
      ]
    },
    {
      "name": "nk-speedometer-digit-dim",
      "path": "speedometer.digit.dim",
      "tier": "component",
      "scope": "speedometer",
      "type": "number",
      "default": "0.26",
      "description": "A leading zero's opacity",
      "part": "digit",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-speedometer-digit-tracking",
      "path": "speedometer.digit.tracking",
      "tier": "component",
      "scope": "speedometer",
      "type": "length",
      "default": "0.01em",
      "description": "The digits' letter-spacing",
      "part": "digit"
    },
    {
      "name": "nk-level-pip-size",
      "path": "level.pip.size",
      "tier": "component",
      "scope": "level",
      "type": "length",
      "default": "10%",
      "description": "One pip's width (10% = ten pips)",
      "part": "pip"
    },
    {
      "name": "nk-level-pip-gap",
      "path": "level.pip.gap",
      "tier": "component",
      "scope": "level",
      "type": "length",
      "default": "2px",
      "description": "Between pips",
      "part": "pip"
    },
    {
      "name": "nk-level-hold-pad",
      "path": "level.hold.pad",
      "tier": "component",
      "scope": "level",
      "type": "length",
      "default": "2px",
      "description": "The hold ring's thickness around a key",
      "part": "hold"
    },
    {
      "name": "nk-level-fill-ink",
      "path": "level.fill.ink",
      "tier": "component",
      "scope": "level",
      "type": "color",
      "default": "var(--nk-tile-face-confirm-ink)",
      "description": "An icon's copy over a solid fill (vital chips, HUD keys): dark on the fill",
      "part": "fill"
    },
    {
      "name": "nk-slab-height",
      "path": "slab.height",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "calc(2.5rem * var(--nk-density))",
      "description": "Height"
    },
    {
      "name": "nk-slab-padding",
      "path": "slab.padding",
      "tier": "component",
      "scope": "slab",
      "type": "string",
      "default": "0 calc(var(--nk-space-unit) * 3)",
      "description": "Padding"
    },
    {
      "name": "nk-slab-gap",
      "path": "slab.gap",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 2.5)",
      "description": "Between its parts"
    },
    {
      "name": "nk-slab-radius",
      "path": "slab.radius",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "var(--nk-chip-radius)",
      "description": "Radius"
    },
    {
      "name": "nk-slab-clip",
      "path": "slab.clip",
      "tier": "component",
      "scope": "slab",
      "type": "string",
      "default": "var(--nk-chip-clip)",
      "description": "clip-path"
    },
    {
      "name": "nk-slab-bg",
      "path": "slab.bg",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "var(--nk-chip-bg)",
      "description": "The plate"
    },
    {
      "name": "nk-slab-fg",
      "path": "slab.fg",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "var(--nk-chip-fg)",
      "description": "Text"
    },
    {
      "name": "nk-slab-border",
      "path": "slab.border",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "rgba(var(--hud-foreground-rgb), 0.08)",
      "description": "The rim"
    },
    {
      "name": "nk-slab-font-size",
      "path": "slab.font-size",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "var(--nk-text-base)",
      "description": "Text size"
    },
    {
      "name": "nk-slab-weight",
      "path": "slab.weight",
      "tier": "component",
      "scope": "slab",
      "type": "string",
      "default": "var(--nk-type-weight-strong)",
      "description": "Text weight"
    },
    {
      "name": "nk-slab-text-shadow",
      "path": "slab.text-shadow",
      "tier": "component",
      "scope": "slab",
      "type": "shadow",
      "default": "none",
      "description": "Text shadow on the plate"
    },
    {
      "name": "nk-slab-tone",
      "path": "slab.tone",
      "tier": "component",
      "scope": "slab",
      "type": "string",
      "default": "var(--brand-rgb)",
      "description": "The accent's channels (a screen sets it per state on any ancestor)"
    },
    {
      "name": "nk-slab-tile-size",
      "path": "slab.tile.size",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "calc(var(--nk-slab-height) - var(--nk-space-unit) * 2)",
      "description": "The icon tile's size",
      "part": "tile"
    },
    {
      "name": "nk-slab-tile-bg",
      "path": "slab.tile.bg",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "rgba(var(--hud-foreground-rgb), 0.1)",
      "description": "The icon tile",
      "part": "tile"
    },
    {
      "name": "nk-slab-tile-fg",
      "path": "slab.tile.fg",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "var(--nk-slab-fg)",
      "description": "The icon",
      "part": "tile"
    },
    {
      "name": "nk-slab-tile-radius",
      "path": "slab.tile.radius",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "max(0.125rem, calc(var(--nk-slab-radius) - var(--nk-space-unit)))",
      "description": "The icon tile's radius",
      "part": "tile"
    },
    {
      "name": "nk-slab-delta-font",
      "path": "slab.delta.font",
      "tier": "component",
      "scope": "slab",
      "type": "string",
      "default": "var(--nk-type-num-family)",
      "description": "A delta's face",
      "part": "delta"
    },
    {
      "name": "nk-slab-delta-up",
      "path": "slab.delta.up",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "var(--world-success)",
      "description": "A gain",
      "part": "delta"
    },
    {
      "name": "nk-slab-delta-down",
      "path": "slab.delta.down",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "var(--world-destructive)",
      "description": "A loss",
      "part": "delta"
    },
    {
      "name": "nk-slab-key-size",
      "path": "slab.key.size",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "1.5rem",
      "description": "A key chip's size",
      "part": "key"
    },
    {
      "name": "nk-slab-key-font-size",
      "path": "slab.key.font-size",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "0.8125rem",
      "description": "A key chip's text",
      "part": "key"
    },
    {
      "name": "nk-slab-line-height",
      "path": "slab.line.height",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "0.1875rem",
      "description": "The progress line's thickness",
      "part": "line"
    },
    {
      "name": "nk-slab-line-radius",
      "path": "slab.line.radius",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "var(--nk-meter-radius)",
      "description": "Its radius",
      "part": "line"
    },
    {
      "name": "nk-slab-line-track",
      "path": "slab.line.track",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "rgba(var(--hud-foreground-rgb), 0.18)",
      "description": "Its track",
      "part": "line"
    },
    {
      "name": "nk-slab-stack-width",
      "path": "slab.stack.width",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "20rem",
      "description": "The progress stack's width",
      "part": "stack"
    },
    {
      "name": "nk-slab-stack-gap",
      "path": "slab.stack.gap",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "calc(var(--nk-space-unit) * 2)",
      "description": "Between its rows",
      "part": "stack"
    },
    {
      "name": "nk-slab-band-padding",
      "path": "slab.band.padding",
      "tier": "component",
      "scope": "slab",
      "type": "string",
      "default": "calc(var(--nk-space-unit) * 3) calc(var(--nk-space-unit) * 6)",
      "description": "The band's padding",
      "part": "band"
    },
    {
      "name": "nk-slab-band-gap",
      "path": "slab.band.gap",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "var(--nk-space-unit)",
      "description": "Between its lines",
      "part": "band"
    },
    {
      "name": "nk-slab-band-bg",
      "path": "slab.band.bg",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "rgba(var(--scrim-rgb), 0.62)",
      "description": "The game, darkened",
      "part": "band"
    },
    {
      "name": "nk-slab-band-tint",
      "path": "slab.band.tint",
      "tier": "component",
      "scope": "slab",
      "type": "number",
      "default": "0.3",
      "description": "The tone's alpha over the band",
      "part": "band",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-slab-band-edge",
      "path": "slab.band.edge",
      "tier": "component",
      "scope": "slab",
      "type": "number",
      "default": "0.6",
      "description": "The tone's alpha on its edges",
      "part": "band",
      "range": [
        0,
        1
      ]
    },
    {
      "name": "nk-slab-band-fg",
      "path": "slab.band.fg",
      "tier": "component",
      "scope": "slab",
      "type": "color",
      "default": "var(--hud-foreground)",
      "description": "Text",
      "part": "band"
    },
    {
      "name": "nk-slab-band-title-size",
      "path": "slab.band-title.size",
      "tier": "component",
      "scope": "slab",
      "type": "length",
      "default": "var(--nk-text-section)",
      "description": "The band's line",
      "part": "band-title"
    },
    {
      "name": "nk-item-slot-width",
      "path": "item-slot.width",
      "tier": "component",
      "scope": "item-slot",
      "type": "length",
      "default": "5rem",
      "description": "Width (md)"
    },
    {
      "name": "nk-item-slot-width-sm",
      "path": "item-slot.width-sm",
      "tier": "component",
      "scope": "item-slot",
      "type": "length",
      "default": "3.5rem",
      "description": "Width (sm)"
    },
    {
      "name": "nk-item-slot-width-lg",
      "path": "item-slot.width-lg",
      "tier": "component",
      "scope": "item-slot",
      "type": "length",
      "default": "6rem",
      "description": "Width (lg)"
    },
    {
      "name": "nk-item-slot-gap",
      "path": "item-slot.gap",
      "tier": "component",
      "scope": "item-slot",
      "type": "length",
      "default": "0.25rem",
      "description": "Between its lines"
    },
    {
      "name": "nk-item-slot-top-height",
      "path": "item-slot.top.height",
      "tier": "component",
      "scope": "item-slot",
      "type": "length",
      "default": "0.75rem",
      "description": "The meta line's height",
      "part": "top"
    },
    {
      "name": "nk-item-slot-corner-lock",
      "path": "item-slot.corner.lock",
      "tier": "component",
      "scope": "item-slot",
      "type": "length",
      "default": "0.875rem",
      "description": "The lock icon",
      "part": "corner"
    },
    {
      "name": "nk-key-prompt-gap",
      "path": "key-prompt.gap",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "0.25rem",
      "description": "Between its parts"
    },
    {
      "name": "nk-key-prompt-min-height",
      "path": "key-prompt.min-height",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "2.5rem",
      "description": "Minimum height (md)"
    },
    {
      "name": "nk-key-prompt-min-height-sm",
      "path": "key-prompt.min-height-sm",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "2rem",
      "description": "Minimum height (sm)"
    },
    {
      "name": "nk-key-prompt-pad-left",
      "path": "key-prompt.pad-left",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "0.5rem",
      "description": "Leading padding"
    },
    {
      "name": "nk-key-prompt-pad-right",
      "path": "key-prompt.pad-right",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "0.75rem",
      "description": "Trailing padding"
    },
    {
      "name": "nk-key-prompt-pad-y",
      "path": "key-prompt.pad-y",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "0.25rem",
      "description": "Block padding"
    },
    {
      "name": "nk-key-prompt-key-height",
      "path": "key-prompt.key.height",
      "tier": "component",
      "scope": "key-prompt",
      "type": "length",
      "default": "1.5rem",
      "description": "A key cap's height",
      "part": "key"
    },
    {
      "name": "nk-skill-check-size",
      "path": "skill-check.size",
      "tier": "component",
      "scope": "skill-check",
      "type": "length",
      "default": "10rem",
      "description": "Size (md)"
    },
    {
      "name": "nk-skill-check-size-sm",
      "path": "skill-check.size-sm",
      "tier": "component",
      "scope": "skill-check",
      "type": "length",
      "default": "7rem",
      "description": "Size (sm)"
    },
    {
      "name": "nk-skill-check-size-lg",
      "path": "skill-check.size-lg",
      "tier": "component",
      "scope": "skill-check",
      "type": "length",
      "default": "13rem",
      "description": "Size (lg)"
    },
    {
      "name": "nk-skill-check-key-height",
      "path": "skill-check.key.height",
      "tier": "component",
      "scope": "skill-check",
      "type": "length",
      "default": "2rem",
      "description": "The key's height",
      "part": "key"
    },
    {
      "name": "nk-skill-check-key-pad",
      "path": "skill-check.key.pad",
      "tier": "component",
      "scope": "skill-check",
      "type": "length",
      "default": "0.5rem",
      "description": "The key's padding",
      "part": "key"
    },
    {
      "name": "nk-countdown-line-width",
      "path": "countdown.line.width",
      "tier": "component",
      "scope": "countdown",
      "type": "length",
      "default": "10rem",
      "description": "The line (md)",
      "part": "line"
    },
    {
      "name": "nk-countdown-line-width-sm",
      "path": "countdown.line.width-sm",
      "tier": "component",
      "scope": "countdown",
      "type": "length",
      "default": "6rem",
      "description": "The line (sm)",
      "part": "line"
    },
    {
      "name": "nk-countdown-line-width-hero",
      "path": "countdown.line.width-hero",
      "tier": "component",
      "scope": "countdown",
      "type": "length",
      "default": "20rem",
      "description": "The line (hero)",
      "part": "line"
    },
    {
      "name": "nk-stat-gap",
      "path": "stat.gap",
      "tier": "component",
      "scope": "stat",
      "type": "length",
      "default": "0.25rem",
      "description": "Between its parts"
    },
    {
      "name": "nk-stat-label-icon",
      "path": "stat.label.icon",
      "tier": "component",
      "scope": "stat",
      "type": "length",
      "default": "0.875rem",
      "description": "The label's icon",
      "part": "label"
    },
    {
      "name": "nk-nui-image-icon-max",
      "path": "nui-image.icon.max",
      "tier": "component",
      "scope": "nui-image",
      "type": "length",
      "default": "1.5rem",
      "description": "The fallback glyph's maximum size",
      "part": "icon"
    }
  ];

  // src/tokens.ts
  var TOKENS_VERSION = 2;
  var TOKENS_REVISION = "2.0";
  var spec = (r) => {
    var _a;
    return {
      ...r,
      group: r.derived ? "derived" : r.scope === "" || r.scope === "font" ? "palette" : r.tier,
      fallback: (_a = r.rule) != null ? _a : r.default
    };
  };
  var ALL_TOKENS = LEVER_ROWS.map(spec);
  var ALL_TOKEN_NAMES = ALL_TOKENS.map((t) => t.name);
  var SPEC = new Map(ALL_TOKENS.map((t) => [t.name, t]));
  var TOKENS = ALL_TOKENS.filter((t) => t.group === "palette" || t.scope === "" && t.derived);
  var TOKEN_NAMES = TOKENS.map((t) => t.name);
  var IDENTITY_TOKENS = ALL_TOKENS.filter((t) => t.scope !== "" && t.scope !== "font" && (t.tier === "identity" || t.derived));
  var KEYWORD_ATTRS = ALL_TOKENS.filter((t) => t.attr).map((t) => [`data-nk-${t.attr}`, t.name]);
  var face = (n) => SPEC.get(n).default;
  var DEFAULT_FONT_SANS = face("font-sans");
  var DEFAULT_FONT_DISPLAY = face("font-display");
  var DEFAULT_FONT_MONO = face("font-mono");
  var MOTION_FEELS = SPEC.get("nk-motion-feel").values;
  var SPRING_PRESETS = ["snap", "move", "soft", "pop"];
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
      "nk-time-snap": ms(d * 0.5),
      "nk-time-fast": ms(d * 0.667),
      "nk-time-base": ms(d),
      "nk-time-slow": ms(d * 1.556),
      "nk-time-fill": ms(d * 2.333),
      "nk-time-exit": ms(d * exit),
      // written by the compiler (not left to kit.css) so the player's prefs can clamp them
      "nk-time-pulse": "1000ms",
      "nk-stagger": "40ms",
      "nk-stagger-max": "100ms"
    };
    SPRING_PRESETS.forEach((name, i) => {
      const t = Math.min(SPRING_MAX[i], Math.round(d * r[i] / 10) * 10);
      out[`nk-spring-${name}`] = `${t}ms ${Math.round(bounces[i] * 1e3) / 1e3}`;
    });
    return out;
  }
  var chamferClip = (cut) => `polygon(${cut} 0, 100% 0, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, 0 100%, 0 ${cut})`;
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
    for (const name of Object.keys(NEUTRAL[mode])) if (name !== "radius" && raw[name] === void 0) missing.push(name);
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
      deriveLevers(resolved, warnings, given);
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
      const c = toRgba(m);
      if (!c) failed = true;
      return c ? formatRgba(c) : m;
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
  function opaque(c, vars, over = ["background"]) {
    if (c[3] >= 1) return c;
    let under = BLACK;
    for (const name of [...over].reverse()) {
      const u = rgba(vars, name);
      if (u) under = composite(u, under);
    }
    return composite(c, under);
  }
  function inHue(h, ranges) {
    return ranges.some(([a, b]) => h >= a && h <= b);
  }
  function vitalFit(c, ranges) {
    if (!c || c[3] < 1) return false;
    const o = rgbToOklch(c);
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
    if (vars.radius === void 0) vars.radius = SPEC.get("radius").default;
    const sans = vars["font-sans"];
    if (sans === void 0) vars["font-sans"] = DEFAULT_FONT_SANS;
    if (vars["font-display"] === void 0) vars["font-display"] = sans === void 0 ? DEFAULT_FONT_DISPLAY : sans;
    if (vars["font-numeric"] === void 0) vars["font-numeric"] = sans === void 0 ? face("font-numeric") : sans;
    if (vars["font-mono"] === void 0) vars["font-mono"] = DEFAULT_FONT_MONO;
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
    for (const [w, status] of [["world-success", "success"], ["world-destructive", "destructive"]]) {
      const c = vars[w] === void 0 ? rgba(vars, status) : null;
      if (!c) continue;
      const o = rgbToOklch(c);
      vars[w] = fmtOklch(Math.max(o.l, 0.7), o.c, o.h);
    }
    if (vars["hud-foreground"] === void 0) vars["hud-foreground"] = vars["world-foreground"];
    if (vars.scrim === void 0) vars.scrim = "rgb(0, 0, 0)";
    for (const k of ["pause-surface", "pause-ink"]) if (vars[k] === void 0) vars[k] = lower(SPEC.get(k).default);
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
  var DIM = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%)$/;
  var DUR = /^(\d+\.?\d*|\.\d+)(ms|s)$/;
  var BEZIER = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;
  var EASE_KEYWORDS = {
    linear: "cubic-bezier(0, 0, 1, 1)",
    ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    "ease-in": "cubic-bezier(0.42, 0, 1, 1)",
    "ease-out": "cubic-bezier(0, 0, 0.58, 1)",
    "ease-in-out": "cubic-bezier(0.42, 0, 0.58, 1)"
  };
  var trimNum = (n) => String(Math.round(n * 1e4) / 1e4);
  function leverValue(spec2, raw) {
    var _a, _b, _c;
    const v = raw.trim();
    switch (spec2.type) {
      case "angle": {
        if (v === "0") return "0deg";
        const m = /^(-?\d*\.?\d+)deg$/.exec(v);
        if (!m) return null;
        const n = parseFloat(m[1]);
        const [lo, hi] = (_a = spec2.range) != null ? _a : [-360, 360];
        return n >= lo && n <= hi ? `${trimNum(n)}deg` : null;
      }
      case "number": {
        if (!NUM.test(v)) return null;
        const n = parseFloat(v);
        if (spec2.range && (n < spec2.range[0] || n > spec2.range[1])) return null;
        return trimNum(n);
      }
      case "length": {
        if (v === "0") return "0px";
        const m = DIM.exec(v);
        return m ? `${trimNum(parseFloat(m[1]))}${m[2]}` : null;
      }
      case "time": {
        const m = DUR.exec(v);
        if (!m) return null;
        const ms = parseFloat(m[1]) * (m[2] === "s" ? 1e3 : 1);
        const [lo, hi] = (_b = spec2.range) != null ? _b : [0, 2e3];
        return ms >= lo && ms <= hi ? `${trimNum(ms)}ms` : null;
      }
      case "ease": {
        const k = EASE_KEYWORDS[v];
        if (k) return k;
        const m = BEZIER.exec(v);
        if (!m) return null;
        const [x1, y1, x2, y2] = m.slice(1).map(Number);
        if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
        return `cubic-bezier(${[x1, y1, x2, y2].map(trimNum).join(", ")})`;
      }
      case "keyword":
        return ((_c = spec2.values) == null ? void 0 : _c.includes(v)) ? v : null;
      default:
        return v || null;
    }
  }
  var want = (spec2) => spec2.values ? spec2.values.join(", ") : spec2.range ? `a number from ${spec2.range[0]} to ${spec2.range[1]}` : spec2.type === "length" ? "a length in px, rem, em or %" : spec2.type === "time" ? "a duration up to 2000ms" : spec2.type === "angle" ? "an angle in deg" : spec2.type === "ease" ? "cubic-bezier(x1, y1, x2, y2)" : "a valid value";
  var chromatic = (c) => !!c && c[3] > 0 && rgbToOklch(c).c >= 0.06;
  function elevationShadow(level, s) {
    if (level === "none") return `0 0 0 0 rgba(${s}, 0)`;
    if (level === "hard") return `0 0.25rem 0 0 rgba(${s}, 0.5)`;
    if (level === "deep") return `0 0 0 1px rgba(${s}, 0.3), 0 2px 4px rgba(${s}, 0.2), 0 18px 40px -10px rgba(${s}, 0.55), 0 44px 96px -28px rgba(${s}, 0.75)`;
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
    const a = Math.max(hud[3], parseFloat((_a = vars["nk-material-hud-opacity"]) != null ? _a : "0") || 0);
    return composite([hud[0], hud[1], hud[2], a], WHITE);
  }
  function deriveRoles(vars) {
    var _a;
    for (const role of ROLES) {
      const name = `role-${role}`;
      if (vars[name] === void 0) {
        const d = ROLE_DEFAULTS[role];
        vars[name] = typeof d === "string" ? (_a = vars[d]) != null ? _a : vars.foreground : fmtOklch(d[0], d[1], d[2]);
      }
      const c = rgba(vars, name);
      if (!c) continue;
      const { l, c: ch, h } = rgbToOklch(c);
      if (vars[`${name}-deep`] === void 0) vars[`${name}-deep`] = fmtOklch(clamp(l - 0.12, 0.2, 1), ch * 0.9, h);
      if (vars[`${name}-light`] === void 0) vars[`${name}-light`] = fmtOklch(clamp(l + 0.1, 0, 0.95), ch * 0.85, h);
    }
  }
  function deriveLevers(vars, warnings, given = /* @__PURE__ */ new Set()) {
    var _a, _b;
    for (const spec2 of ALL_TOKENS) {
      if (spec2.group === "palette" || spec2.scope === "") continue;
      const value = vars[spec2.name];
      const literal = spec2.tier === "identity" && !spec2.derived && !/var\(|calc\(/.test(spec2.default);
      if (value === void 0) {
        if (literal && spec2.type !== "color" && spec2.type !== "font" && spec2.type !== "shadow" && spec2.type !== "paint") vars[spec2.name] = spec2.default;
        continue;
      }
      if (spec2.type === "color" || spec2.type === "font" || spec2.type === "shadow" || spec2.type === "paint" || spec2.type === "string") continue;
      if (/^(calc|var|max|min|clamp)\(/.test(value.trim())) continue;
      const v = leverValue(spec2, value);
      if (v === null) {
        warnings.push(`--${spec2.name} must be ${want(spec2)} (got ${value}); ${literal ? spec2.default : "the kit default"} is used.`);
        if (literal) vars[spec2.name] = spec2.default;
        else delete vars[spec2.name];
      } else vars[spec2.name] = v;
    }
    if (vars.brand === void 0) {
      const primary = rgba(vars, "primary");
      vars.brand = chromatic(primary) || !vars["chart-1"] ? vars.primary : vars["chart-1"];
    }
    const brand = (_a = rgba(vars, "brand")) != null ? _a : rgba(vars, "primary");
    if (vars["brand-foreground"] === void 0) vars["brand-foreground"] = bestText(vars, brand);
    if (vars.surface === void 0) {
      const pop = rgba(vars, "popover");
      if (pop) vars.surface = formatRgba(mix(pop, [brand[0], brand[1], brand[2], pop[3]], parseFloat(vars["nk-surface-tint"])));
    }
    const scrim = (_b = rgba(vars, "scrim")) != null ? _b : BLACK;
    const s = `${scrim[0]}, ${scrim[1]}, ${scrim[2]}`;
    if (vars["nk-depth-elevation"] === void 0) vars["nk-depth-elevation"] = elevationShadow(vars["nk-surface-elevation"], s);
    if (vars["nk-depth-text"] === void 0) vars["nk-depth-text"] = hudTextShadow(vars["nk-hud-text"], s);
    const cut = parseFloat(vars["nk-shape-cut"]);
    if (vars["nk-line-clip"] === void 0) vars["nk-line-clip"] = cut > 0 ? chamferClip("var(--nk-shape-cut)") : "none";
    if (vars["nk-line-clip-sm"] === void 0) vars["nk-line-clip-sm"] = cut > 0 ? chamferClip("calc(var(--nk-shape-cut) / 2)") : "none";
    const d = parseFloat(vars["nk-motion-duration"]);
    const motion = motionTokens(d, vars["nk-motion-feel"], parseFloat(vars["nk-motion-bounce"]), { exitFactor: parseFloat(vars["nk-motion-exit-factor"]) });
    for (const [k, v] of Object.entries(motion)) if (vars[k] === void 0) vars[k] = v;
    if (d > MAX_DURATION_MS) warnings.push(`--nk-motion-duration is ${d}ms (the kit's ceiling is ${MAX_DURATION_MS}ms); panels and menus will feel slow to a player who opens them hundreds of times.`);
    deriveRoles(vars);
    const op = parseFloat(vars["nk-material-menu-opacity"]);
    if (op < 0.92) warnings.push(`--nk-material-menu-opacity is ${op} (floor 0.92); the game will show through text in panels, and a bright sky will wash it out.`);
    const plate = hudPlateOverWhite(vars);
    const hudFg = rgba(vars, "hud-foreground");
    if (plate && hudFg) {
      const ratio = contrastRatio(composite(hudFg, plate), plate);
      if (ratio < 4.5)
        warnings.push(`hud-foreground on the HUD backplate over a white sky is ${ratio.toFixed(1)}:1 (needs 4.5:1); raise --nk-material-hud-opacity or darken --hud so HUD text reads over snow and midday sky.`);
    }
    for (const name of ["world-foreground", "world-foreground-muted"]) {
      if (!given.has(name)) continue;
      const c = rgba(vars, name);
      if (!c) continue;
      const onGrey = composite(c, MID_GREY);
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
    if (vars["nk-material-menu-opacity"] !== void 0) vars["nk-material-menu-opacity"] = "1";
    if (vars["nk-material-hud-opacity"] !== void 0) vars["nk-material-hud-opacity"] = "0.72";
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
      const c = toRgba(value);
      if (!c) continue;
      out[`${name}-rgb`] = `${c[0]}, ${c[1]}, ${c[2]}`;
      out[`${name}-a`] = String(c[3]);
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
      $description: `${description} (nuikit tokens v${TOKENS_REVISION}, ${theme.mode})`,
      $extensions: { "dev.nuikit": { tokens: TOKENS_VERSION, revision: TOKENS_REVISION, mode: theme.mode, ...theme.imports.length ? { imports: theme.imports } : {} } },
      color
    };
    const font = { $type: "fontFamily" };
    const nk = {};
    for (const [name, value] of Object.entries(theme.vars)) {
      const spec2 = SPEC.get(name);
      if ((spec2 == null ? void 0 : spec2.group) === "derived") continue;
      const desc = spec2 ? { $description: spec2.description } : {};
      const col = toRgba(value);
      if (col && ((_a = spec2 == null ? void 0 : spec2.type) != null ? _a : "color") === "color") {
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
        nk[name.slice(3)] = dtcgNk(spec2, value, desc);
      }
    }
    if (Object.keys(font).length > 1) doc.font = font;
    doc.nk = nk;
    const again = compileTheme(doc, { mode: theme.mode }).vars;
    for (const [name, value] of Object.entries(theme.vars)) {
      const spec2 = SPEC.get(name);
      if ((spec2 == null ? void 0 : spec2.group) === "derived" && name.startsWith("nk-") && again[name] !== value) nk[name.slice(3)] = dtcgNk(spec2, value, { $description: spec2.description });
    }
    if (Object.keys(nk).length === 0) delete doc.nk;
    return doc;
  }
  function dtcgNk(spec2, value, desc) {
    var _a, _b;
    const dim = DIM.exec(value);
    const dur = DUR.exec(value);
    const bez = BEZIER.exec(value);
    if (NUM.test(value) && ((_a = spec2 == null ? void 0 : spec2.type) != null ? _a : "number") === "number") return { $type: "number", $value: Number(value), ...desc };
    if (dim) return { $type: "dimension", $value: { value: parseFloat(dim[1]), unit: dim[2] }, ...desc };
    if (dur) return { $type: "duration", $value: { value: parseFloat(dur[1]), unit: dur[2] }, ...desc };
    if (bez) return { $type: "cubicBezier", $value: bez.slice(1).map(Number), ...desc };
    return { $value: value, ...desc, $extensions: { "dev.nuikit": { type: (_b = spec2 == null ? void 0 : spec2.type) != null ? _b : "keyword" } } };
  }

  // src/coverage.ts
  var COVERAGE_TARGETS = { qbox: 0.9, qbcore: 0.75, esx: 0.75 };

  // src/doctor.ts
  var NUIKIT_SYSTEMS = ["nuikit_chat", "nuikit_death", "nuikit_hud", "nuikit_loading", "nuikit_pause", "nuikit_stress", "nuikit_voice"];
  var ADAPTER_PACKS = [
    // ox_lib has no pack, ever: its override (overrides/ox_lib) already routes it to the intents.
    { name: "[nuikit-qb]", library: "qb-core", frameworks: ["qbcore", "qbox"], shipped: true },
    { name: "[nuikit-esx]", library: "es_extended", frameworks: ["esx"], shipped: true }
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
    const [ca, pa = ""] = splitVersion(a);
    const [cb, pb = ""] = splitVersion(b);
    const na = ca.split(".");
    const nb = cb.split(".");
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const d = (Number((_a = na[i]) != null ? _a : 0) || 0) - (Number((_b = nb[i]) != null ? _b : 0) || 0);
      if (d !== 0) return d;
    }
    if (pa === pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    const ia = pa.split(".");
    const ib = pb.split(".");
    for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
      if (ia[i] === void 0) return -1;
      if (ib[i] === void 0) return 1;
      const x = ia[i];
      const y = ib[i];
      const xn = /^\d+$/.test(x);
      const yn = /^\d+$/.test(y);
      if (xn && yn) {
        if (Number(x) !== Number(y)) return Number(x) - Number(y);
      } else if (xn !== yn) return xn ? -1 : 1;
      else if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  function splitVersion(v) {
    const s = v.trim().replace(/^v/i, "").split("+")[0];
    const dash = s.indexOf("-");
    return dash < 0 ? [s, ""] : [s.slice(0, dash), s.slice(dash + 1)];
  }
  function detectFramework(resources) {
    for (const f of FRAMEWORKS) {
      const r = resources.find((x) => x.name === f.resource && started(x));
      if (r) return { framework: f.framework, resource: r.name };
    }
    return { framework: "standalone", resource: null };
  }
  function doctor(snap) {
    var _a, _b, _c, _d, _e, _f, _g;
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
          rep.via = "nuikit";
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
      const shippedVersion = snap.overrides.version;
      for (const [res, o] of Object.entries(snap.overrides.overrides)) {
        const r = byName.get(res);
        if (!r || !started(r)) continue;
        const html = snap.readFile(res, o.path);
        const rep = reports.find((x) => x.name === res);
        const installed = (_e = (_d = snap.installed) == null ? void 0 : _d[res]) != null ? _e : null;
        if (!html || !OVERRIDE_MARKER.test(html)) {
          findings.push({
            code: "override-missing",
            severity: "warn",
            resource: res,
            message: `${res}: the nuikit override page isn't at ${o.path} (a library update replaced it, or it was never installed)`,
            next: `\`nuikit install ${res}\` in the server console, then \`restart ${res}\``
          });
          if (rep) {
            rep.via = "override missing";
            rep.next = `\`nuikit install ${res}\``;
          }
          continue;
        }
        if (installed && compareVersions(shippedVersion, installed.version) > 0) {
          findings.push({
            code: "override-outdated",
            severity: "warn",
            resource: res,
            message: `${res}: the override is from nuikit ${installed.version}; this zip ships ${shippedVersion}`,
            next: `\`nuikit upgrade ${res}\` (or \`nuikit upgrade\` for all), then \`restart ${res}\``
          });
          if (rep) rep.via = `override ${installed.version}, outdated`;
          continue;
        }
        const editedByOwner = !!installed && !!snap.fileHash && Object.entries(installed.files).some(([rel, h]) => {
          const d = snap.fileHash(res, rel);
          return d !== null && d !== h;
        });
        if (editedByOwner) {
          findings.push({
            code: "override-edited",
            severity: "info",
            resource: res,
            message: `${res}: the override was edited since nuikit ${installed.version} installed it`,
            next: `keep it, or \`nuikit install ${res} --force\` to put the shipped files back (your edits are saved under ${res}/.nuikit-backup/)`
          });
          if (rep) rep.via = "override edited";
        } else if (pageHash(html) !== o.hash) {
          findings.push({
            code: "override-drifted",
            severity: "warn",
            resource: res,
            message: `${res}: the override page at ${o.path} isn't the one nuikit ${shippedVersion} shipped (edited, or from another release)`,
            next: `if you didn't edit it, \`nuikit install ${res}\` and \`restart ${res}\``
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
      const ensures = idle.map((n) => "`ensure " + n + "`").join(", ");
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
      for (const c of snap.theme.contrast) {
        if (c.ok) continue;
        pairs.add(`${c.fg} on ${c.bg}`);
        findings.push({
          code: "theme-contrast",
          severity: "warn",
          message: `theme: ${c.fg} on ${c.bg} is ${c.ratio.toFixed(2)}:1 (min ${c.min}:1)`,
          next: `lighten or darken \`--${c.fg}\` or \`--${c.bg}\` in nuikit/theme.css, then \`nuikit theme reload\``
        });
      }
      for (const w of snap.theme.warnings) {
        const pair = /^([\w-]+) on ([\w-]+) is [\d.]+:1/.exec(w);
        if (pair && pairs.has(`${pair[1]} on ${pair[2]}`)) continue;
        if (/contrast/i.test(w)) continue;
        findings.push({ code: "theme-warning", severity: "info", message: `theme: ${w}`, next: `fix it in nuikit/theme.css, then \`nuikit theme reload\`` });
      }
    }
    const latest = (_f = snap.runtime.latest) != null ? _f : null;
    if (latest && compareVersions(latest, snap.runtime.version) > 0) {
      findings.push({
        code: "update-available",
        severity: "info",
        message: `nuikit ${snap.runtime.version} is running; ${latest} is out`,
        next: `download nuikit.zip from github.com/belibathan/nuikit/releases/tag/v${latest.replace(/^v/, "")}, replace [nuikit]/, then \`nuikit upgrade\` (docs/install.md)`
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
    const intents = Object.entries((_g = snap.intents) != null ? _g : {}).map(([source, byIntent]) => ({ source, byIntent, total: Object.values(byIntent).reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total);
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

  // src/install.ts
  function bytesHash(bytes) {
    let h = 2166136261;
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  function planInstall(input) {
    var _a, _b, _c, _d, _e, _f;
    const { version, shipped, installed, disk, force = false } = input;
    const ours = (_a = installed == null ? void 0 : installed.files) != null ? _a : {};
    const actions = [];
    const edited = [];
    const files = {};
    const rels = Object.keys(shipped).sort();
    for (const rel of rels) {
      const want2 = shipped[rel];
      const have = (_b = disk[rel]) != null ? _b : null;
      const was = ours[rel];
      if (have === null) {
        actions.push({ rel, op: "add" });
        files[rel] = want2;
      } else if (have === want2) {
        actions.push({ rel, op: "keep" });
        files[rel] = want2;
      } else if (was === void 0) {
        actions.push({ rel, op: "replace", backup: true });
        files[rel] = want2;
      } else if (have === was) {
        actions.push({ rel, op: "update" });
        files[rel] = want2;
      } else if (force) {
        actions.push({ rel, op: "force-edited", backup: true });
        files[rel] = want2;
      } else {
        actions.push({ rel, op: "skip-edited" });
        edited.push(rel);
        files[rel] = was;
      }
    }
    for (const rel of Object.keys(ours).sort()) {
      if (rel in shipped) continue;
      const have = (_c = disk[rel]) != null ? _c : null;
      if (have === null) continue;
      if (have !== ours[rel] && !force) {
        actions.push({ rel, op: "skip-edited" });
        edited.push(rel);
        files[rel] = ours[rel];
        continue;
      }
      actions.push({ rel, op: ((_d = input.hasBackup) == null ? void 0 : _d.call(input, rel)) ? "restore" : "remove" });
    }
    const changes = actions.filter((a) => a.op !== "keep" && a.op !== "skip-edited").length;
    return {
      actions,
      manifest: { version, backup: (_e = installed == null ? void 0 : installed.backup) != null ? _e : version, files, installedAt: (_f = input.now) != null ? _f : (/* @__PURE__ */ new Date()).toISOString() },
      edited,
      changes
    };
  }
  function planUninstall(input) {
    var _a;
    const actions = [];
    const edited = [];
    for (const rel of Object.keys(input.installed.files).sort()) {
      const have = (_a = input.disk[rel]) != null ? _a : null;
      if (have !== null && have !== input.installed.files[rel]) edited.push(rel);
      if (input.hasBackup(rel)) actions.push({ rel, op: "restore" });
      else if (have !== null) actions.push({ rel, op: "remove" });
    }
    return { actions, edited };
  }
  function overrideOutdated(installed, shippedVersion) {
    return !!installed && compareVersions(shippedVersion, installed.version) > 0;
  }
  var VERB = {
    add: "added",
    replace: "replaced (stock backed up)",
    update: "updated",
    keep: "unchanged",
    "skip-edited": "kept: you edited it (use --force to overwrite)",
    "force-edited": "overwritten (your edit saved to .nuikit-backup)",
    restore: "restored from backup",
    remove: "removed"
  };
  function formatInstall(outcomes, opts) {
    var _a;
    const out = [];
    const head = opts.uninstall ? "nuikit uninstall" : `nuikit install ${opts.version}`;
    out.push(`${head}${opts.dryRun ? " (dry run: nothing written)" : ""}`);
    const restart = [];
    for (const o of outcomes) {
      if (o.state === "missing") {
        out.push(`  ${o.resource.padEnd(24)} not on this server; skipped`);
        continue;
      }
      if (o.state === "no-files") {
        out.push(`  ${o.resource.padEnd(24)} no override files packaged here (a pre-0.9 zip or a dev checkout); install from the release zip, or copy nuikit/overrides/${o.resource}/ by hand`);
        continue;
      }
      if (o.state === "not-installed") {
        out.push(`  ${o.resource.padEnd(24)} nothing installed by nuikit; skipped`);
        continue;
      }
      const plan = o.plan;
      const counts = {};
      for (const a of plan.actions) counts[a.op] = ((_a = counts[a.op]) != null ? _a : 0) + 1;
      const parts = Object.keys(counts).map((op) => `${counts[op]} ${VERB[op]}`);
      const changes = "changes" in plan ? plan.changes : plan.actions.length;
      out.push(`  ${o.resource.padEnd(24)} ${parts.length ? parts.join(", ") : "nothing to do"}`);
      for (const rel of plan.edited) out.push(`    ${opts.uninstall ? "edited since install, restored anyway" : "edited"}: ${rel}`);
      if (changes > 0) restart.push(o.resource);
    }
    if (!opts.dryRun && restart.length) out.push(`  \u2192 \`refresh\`, then ${restart.map((r) => `\`restart ${r}\``).join(", ")}`);
    if (opts.dryRun && restart.length) out.push(`  \u2192 run it without --dry-run to write, then \`refresh\` and restart ${restart.join(", ")}`);
    return out;
  }
  return __toCommonJS(fxserver_exports);
})();
globalThis.NuikitTheme = NuikitTheme;

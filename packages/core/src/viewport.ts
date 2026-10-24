// Resolution adapters (docs/design/layout.md): one table of the screen shapes a FiveM player runs, what each
// one defaults to (the safe area, the edge inset, the scale floor), and the maths every layout reads.
//
// Chromium 103 has no @container, so the page itself is the only container that matters: the screen. kit.css
// mirrors VIEWPORTS as aspect media queries (@layer nk.layout, so the levers hold before any script runs);
// watchViewport() paints `data-nk-aspect` on <html> for JS and theme rules; useViewport() (react) reads it.
//
// The model: the UI is designed on a 16:9 box at 1080p (1rem = 16px). On a wider screen the box stays 16:9
// and centred (--nk-screen-max = 100vh × --nk-screen-ratio); zones sit at its edges unless they bleed. On a
// narrower one the box is the full width and rem follows the width too (min(1.4815vh, 0.8333vw)), floored at
// 16px × --nk-screen-scale-min so nothing becomes unreadable at 1280×720 or 1024×768.

/** The aspect classes, narrowest first. */
export type AspectId = "4-3" | "16-10" | "16-9" | "21-9" | "32-9";

export interface ViewportSpec {
  id: AspectId;
  /** The nominal width / height. */
  ratio: number;
  /** The lowest width / height that counts as this aspect (kit.css: `min-aspect-ratio: <min>`). */
  min: [number, number];
  /** Safe area inset in rem, from the 16:9 box's edges (TV overscan, a bezel). */
  safe: { x: number; y: number };
  /** Distance in rem from the safe area to a zone's content (--nk-screen-edge). */
  edge: number;
  /** rem never drops below 16px × this (--nk-screen-scale-min). */
  scaleMin: number;
  /** A size a player actually runs, for the devtools picker and `pnpm look --viewport`. */
  sample: [number, number];
}

/** Every aspect nuikit adapts to. kit.css mirrors it (a test keeps them equal). */
export const VIEWPORTS: readonly ViewportSpec[] = [
  { id: "4-3", ratio: 4 / 3, min: [0, 1], safe: { x: 0, y: 0 }, edge: 1, scaleMin: 0.75, sample: [1024, 768] },
  { id: "16-10", ratio: 16 / 10, min: [3, 2], safe: { x: 0, y: 0 }, edge: 1.25, scaleMin: 0.75, sample: [1680, 1050] },
  { id: "16-9", ratio: 16 / 9, min: [17, 10], safe: { x: 0, y: 0 }, edge: 1.5, scaleMin: 0.75, sample: [1920, 1080] },
  { id: "21-9", ratio: 21 / 9, min: [11, 5], safe: { x: 0, y: 0 }, edge: 1.5, scaleMin: 0.75, sample: [3440, 1440] },
  { id: "32-9", ratio: 32 / 9, min: [3, 1], safe: { x: 0, y: 0 }, edge: 1.5, scaleMin: 0.75, sample: [5120, 1440] },
];

/** The sizes the devtools picker and `pnpm look --viewport` offer. */
export const VIEWPORT_SAMPLES: readonly [number, number][] = [
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
  [1024, 768],
];

/** The design: 1rem = 16px at 1080p, the content box 16:9. */
export const DESIGN = { rem: 16, height: 1080, width: 1920, ratio: 16 / 9, remMax: 32 } as const;

/** The aspect class of a w × h screen. */
export function aspectOf(w: number, h: number): ViewportSpec {
  const r = h > 0 ? w / h : DESIGN.ratio;
  let out = VIEWPORTS[0]!;
  for (const v of VIEWPORTS) if (r >= v.min[0] / v.min[1]) out = v;
  return out;
}

export interface ViewportOptions {
  /** The theme × player UI size (--nk-scale). Default 1. */
  scale?: number;
  /** Override the aspect's floor (--nk-screen-scale-min). */
  scaleMin?: number;
  /** The content box's ratio (--nk-screen-ratio). Default 16/9; Infinity is full bleed. */
  ratio?: number;
  /** Override the safe area (rem). */
  safe?: { x: number; y: number };
}

export interface Viewport {
  w: number;
  h: number;
  aspect: AspectId;
  /** w / h. */
  ratio: number;
  /** One rem in px on this screen (the NUI scale, the floor and --nk-scale applied). */
  rem: number;
  /** rem / 16: how large the UI draws compared with the 1080p design. */
  scale: number;
  /** True when the floor decided rem (the screen alone would have drawn it smaller). */
  floored: boolean;
  /** The safe area inset in px. */
  safe: { x: number; y: number };
  /** The edge inset in px (--nk-screen-edge). */
  edge: number;
  /** The content box in px: 16:9 and centred on a wider screen, the whole screen otherwise. */
  box: { x: number; y: number; w: number; h: number };
}

/**
 * The layout of a w × h screen, as kit.css draws it: rem = clamp(16px × floor, min(1.4815vh, 0.8333vw), 32px) ×
 * scale; the box is the 16:9 of the height, centred, never wider than the screen.
 */
export function viewportOf(w: number, h: number, opts: ViewportOptions = {}): Viewport {
  const spec = aspectOf(w, h);
  const scale = opts.scale ?? 1;
  const floor = DESIGN.rem * (opts.scaleMin ?? spec.scaleMin);
  const natural = Math.min((h * DESIGN.rem) / DESIGN.height, (w * DESIGN.rem) / DESIGN.width);
  const rem = Math.min(Math.max(natural, floor), DESIGN.remMax) * scale;
  const ratio = opts.ratio ?? DESIGN.ratio;
  const boxW = Math.min(w, Number.isFinite(ratio) ? h * ratio : w);
  const safe = opts.safe ?? spec.safe;
  return {
    w,
    h,
    aspect: spec.id,
    ratio: h > 0 ? w / h : DESIGN.ratio,
    rem,
    scale: rem / DESIGN.rem,
    floored: natural < floor,
    safe: { x: safe.x * rem, y: safe.y * rem },
    edge: spec.edge * rem,
    box: { x: (w - boxW) / 2, y: 0, w: boxW, h },
  };
}

/** Parse "1920x1080" (or 1920×1080) into [w, h]; null when it isn't one. */
export function parseViewport(s: string | null | undefined): [number, number] | null {
  const m = String(s ?? "").match(/^(\d{3,5})\s*[x×]\s*(\d{3,5})$/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// ─────────────────────────────────────────── live: <html data-nk-aspect>

let current: Viewport | null = null;
const listeners = new Set<() => void>();
let watching = false;

function read(): Viewport {
  const el = document.documentElement;
  const cs = getComputedStyle(el);
  const num = (n: string) => {
    const v = parseFloat(cs.getPropertyValue(n));
    return Number.isFinite(v) ? v : undefined;
  };
  const v = viewportOf(window.innerWidth, window.innerHeight, { scale: num("--nk-scale"), scaleMin: num("--nk-screen-scale-min"), ratio: num("--nk-screen-ratio") });
  // the page's real rem wins over the model (a theme can set font-size its own way)
  const rem = parseFloat(cs.fontSize);
  if (Number.isFinite(rem) && rem > 0) {
    const k = rem / v.rem;
    v.rem = rem;
    v.scale = rem / DESIGN.rem;
    v.safe = { x: v.safe.x * k, y: v.safe.y * k };
    v.edge *= k;
  }
  return v;
}

function update() {
  const next = read();
  const same = current && current.w === next.w && current.h === next.h && current.rem === next.rem && current.aspect === next.aspect;
  current = next;
  if (document.documentElement.dataset.nkAspect !== next.aspect) document.documentElement.dataset.nkAspect = next.aspect;
  if (!same) listeners.forEach((l) => l());
}

/**
 * Start following the screen: `data-nk-aspect` on <html>, and every onViewport listener on a change. Idempotent;
 * useViewport and Screen call it, any page may.
 */
export function watchViewport(): void {
  if (watching || typeof window === "undefined" || typeof document === "undefined") return;
  watching = true;
  update();
  window.addEventListener("resize", update);
  // the theme (--nk-scale) or a player's UI size changes rem without a resize
  if (typeof ResizeObserver !== "undefined") {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;width:1rem;height:1rem;visibility:hidden;pointer-events:none";
    (document.body ?? document.documentElement).appendChild(probe);
    new ResizeObserver(update).observe(probe);
  }
}

/** The current viewport (starts watching). */
export function getViewport(): Viewport {
  watchViewport();
  return current ?? viewportOf(typeof window === "undefined" ? DESIGN.width : window.innerWidth, typeof window === "undefined" ? DESIGN.height : window.innerHeight);
}

/** Called on every change; returns the unsubscribe. */
export function onViewport(fn: () => void): () => void {
  watchViewport();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

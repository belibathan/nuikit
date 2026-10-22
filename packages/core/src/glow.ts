// The glow budget (tokens 1.4, docs/tokens.md#attention): at most --nk-glow-budget parts glow at once.
// A part that may glow carries data-nk-glow (a number ranks it: higher first); this marks the winners
// data-nk-glow-on and kit.css zeroes the glow of the rest. Focused parts win (data-state="focus",
// data-focused, :focus-visible), then rank, then the later in the document (on top). Budget 0: no limit.

const FOCUSED = '[data-state="focus"], [data-focused], [data-focused="true"], :focus-visible';

let budget = 1;
let observer: MutationObserver | null = null;
let queued = false;

function focused(el: Element): boolean {
  try {
    return el.matches(FOCUSED) || !!el.querySelector(FOCUSED);
  } catch {
    // :focus-visible unknown to an old engine
    return el.matches('[data-state="focus"], [data-focused]');
  }
}

/** Mark the parts that may glow now. Runs on its own after startGlowBudget; exported for tests. */
export function applyGlowBudget(root: ParentNode = document): void {
  const parts = [...root.querySelectorAll<HTMLElement>("[data-nk-glow]")];
  const ranked = parts
    .map((el, i) => ({ el, i, f: focused(el) ? 1 : 0, r: parseFloat(el.getAttribute("data-nk-glow") || "0") || 0 }))
    .sort((a, b) => b.f - a.f || b.r - a.r || b.i - a.i);
  const on = new Set((budget > 0 ? ranked.slice(0, budget) : ranked).map((p) => p.el));
  for (const el of parts) {
    if (on.has(el)) {
      if (!el.hasAttribute("data-nk-glow-on")) el.setAttribute("data-nk-glow-on", "");
    } else if (el.hasAttribute("data-nk-glow-on")) el.removeAttribute("data-nk-glow-on");
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    // the page (or a test's DOM) may be gone by the time the microtask runs
    if (typeof document !== "undefined") applyGlowBudget();
  });
}

/** Set the budget (the theme's --nk-glow-budget) and keep it applied as the page changes. Idempotent. */
export function startGlowBudget(n?: number | string): void {
  if (n !== undefined) {
    const v = typeof n === "number" ? n : parseFloat(n);
    budget = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 1;
  }
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (!observer) {
    observer = new MutationObserver((records) => {
      // our own data-nk-glow-on writes don't count
      if (records.every((r) => r.type === "attributes" && r.attributeName === "data-nk-glow-on")) return;
      schedule();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-nk-glow", "data-state", "data-focused"],
    });
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
  }
  schedule();
}

/** Tests: stop observing and reset the budget. */
export function __resetGlowBudget(): void {
  observer?.disconnect();
  observer = null;
  budget = 1;
  if (typeof document !== "undefined") {
    document.removeEventListener("focusin", schedule);
    document.removeEventListener("focusout", schedule);
  }
}

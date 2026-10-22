/**
 * nuikit check: audit a FiveM resource against the nuikit protocol's conformance levels
 * (docs/protocol.md §10). Regex and tokenizer level only, so it runs in milliseconds on any
 * resource and needs nothing installed.
 */
import fs from "node:fs";
import path from "node:path";
import { COLOR_PROPS, NAMED, colorLiterals, isNeutralShadow, paletteClasses, tokenRefs } from "./colors";
import { lexCss, lexHtml, lexJs, lexLua, locator, luaBlocks, type Span } from "./lex";
import { isTokenDefinition, TOKEN_NAMES } from "./tokens";

export type Level = 0 | 1 | 2 | 3;
export type Severity = "error" | "warning";

export interface Finding {
  rule: RuleId;
  /** The conformance level this finding blocks; 0 = advisory (performance), never gates a level. */
  level: Level;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  message: string;
  /** In a file synced from packages/create-nuikit/index.css.tpl: fix it there, not here. */
  inherited?: boolean;
}

export type RuleId =
  | "color/hardcoded"
  | "color/palette-class"
  | "tokens/none"
  | "manifest/protocol"
  | "surfaces/none"
  | "focus/direct"
  | "focus/no-release"
  | "escape/adhoc"
  | "native/runtime"
  | "native/components"
  | "perf/remote-asset"
  | "perf/frame-send"
  | "attention/glow";

export const RULES: Record<RuleId, { level: Level; description: string }> = {
  "color/hardcoded": { level: 1, description: "Hex, rgb(), hsl(), oklch()… or named colour literal instead of a theme token" },
  "color/palette-class": { level: 1, description: "Tailwind palette class (bg-emerald-500) instead of a token class (bg-primary)" },
  "tokens/none": { level: 1, description: "The UI never reads a theme token" },
  "manifest/protocol": { level: 2, description: "ui_page without nuikit_protocol metadata in fxmanifest" },
  "surfaces/none": { level: 2, description: "The resource has a ui_page but registers no surface" },
  "focus/direct": { level: 2, description: "SetNuiFocus / SetNuiFocusKeepInput called outside nuikit.lua" },
  "focus/no-release": { level: 2, description: "Focus taken directly and never released when the resource stops" },
  "escape/adhoc": { level: 2, description: "Escape handled with a keydown listener that posts a close callback, not through surfaces" },
  "native/runtime": { level: 3, description: "Doesn't use the nuikit runtime (@nuikit/init.lua or nuikit.lua, + nuikit-core)" },
  "native/components": { level: 3, description: "Doesn't build on shadcn/ui or nuikit registry components" },
  "perf/remote-asset": { level: 0, description: "Font or asset loaded from the network instead of the resource" },
  "perf/frame-send": { level: 0, description: "NUI message sent from a Wait(0) loop (every frame)" },
  "attention/glow": { level: 0, description: "More than one part marked data-nk-glow: the runtime lets --nk-glow-budget (1) glow, so rank them or drop the extra marks" },
};

export const LEVEL_NAMES: Record<Level, string> = { 0: "not conformant", 1: "themed", 2: "well-behaved", 3: "native" };

export type Kind = "resource" | "override" | "web";

export interface CheckResult {
  /** Folder that was checked (as given, joined). */
  root: string;
  name: string;
  kind: Kind;
  /** ui_page / loadscreen from fxmanifest. */
  page?: { type: "ui_page" | "loadscreen"; path: string };
  /** nuikit_protocol from fxmanifest. */
  protocol?: string;
  /** Highest level reached; null when the resource has no UI at all (nothing to grade). */
  level: Level | null;
  findings: Finding[];
  /** Rules that don't apply to this kind of folder. */
  skipped: RuleId[];
  stats: { files: number; uiFiles: number; luaFiles: number; tokenRefs: number };
}

export interface CheckOptions {
  /** Treat files under dist/ and build/ as the UI even when sources exist. */
  includeBuilt?: boolean;
}

const IGNORED_DIRS = new Set(["node_modules", ".git", ".turbo", ".vite", "coverage", ".next", ".cache"]);
const BUILT_DIRS = new Set(["dist", "build", "out"]);
const UI_EXT = /\.(css|scss|sass|less|html?|tsx|jsx|ts|js|mjs|cjs|vue|svelte)$/i;
const SKIP_FILE = /(\.d\.ts|\.test\.[jt]sx?|\.spec\.[jt]sx?|\.stories\.[jt]sx?|\.min\.js|\.map)$|(^|\/)(dev\.[jt]sx?|vite\.config\.[jt]s|tailwind\.config\.[jt]s|postcss\.config\.[cm]?js|vitest\.config\.[jt]s|tsup\.config\.[jt]s|eslint\.config\.[cm]?js)$/i;
// test code, and server-side scripts (never part of a page); and theme sources (the nuikit resource's
// theme.css and the identities in themes/): they define the colours every page reads, so a colour there
// is the theme itself, not a page bypassing it
const SKIP_DIR_IN_PATH = /(^|\/)(test|tests|__tests__|__mocks__|fixtures)\/|^server\/|^themes\/[^/]+\.css$|^theme\.css$/;

function walk(dir: string, rel = "", out: { rel: string; built: boolean }[] = [], built = false): typeof out {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORED_DIRS.has(e.name) || e.name.startsWith(".")) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r, out, built || BUILT_DIRS.has(e.name));
    else if (e.isFile()) out.push({ rel: r, built });
  }
  return out;
}

/** Is a finding at `line` silenced by a `nuikit-ignore` comment (same line) or `nuikit-ignore-next-line` (line above)? */
function ignored(lines: string[], line: number, rule: RuleId): boolean {
  const test = (text: string | undefined, directive: RegExp) => {
    if (!text) return false;
    const m = directive.exec(text);
    if (!m) return false;
    const rules = (m[1] ?? "").split(/[\s,]+/).filter((r) => r.includes("/"));
    return rules.length === 0 || rules.some((r) => rule === r || rule.startsWith(r.replace(/\*$/, "")));
  };
  // nuikit-ignore-start [rules] … nuikit-ignore-end: a block of data the theme can't know
  for (let i = line - 1; i >= 0; i--) {
    if (/nuikit-ignore-end/.test(lines[i]!) && i !== line - 1) break;
    if (test(lines[i], /nuikit-ignore-start(?:\s+([\w/*,\s-]+))?/)) return true;
  }
  const above = lines[line - 2];
  const aboveIsComment = !!above && /^\s*(\/\/|\/\*|\*|--|<!--|\{\/\*)/.test(above);
  return (
    test(lines[line - 1], /nuikit-ignore(?!-next-line|-start|-end)(?:\s+([\w/*,\s-]+))?/) ||
    test(above, /nuikit-ignore-next-line(?:\s+([\w/*,\s-]+))?/) ||
    (aboveIsComment && test(above, /nuikit-ignore(?!-next-line|-start|-end)(?:\s+([\w/*,\s-]+))?/))
  );
}

class Collector {
  findings: Finding[] = [];
  constructor(private root: string) {}
  file(rel: string, src: string) {
    const loc = locator(src);
    const lines = src.split("\n");
    const inherited = /nuikit kit layer/.test(src) && /(^|\/)index\.css$/.test(rel);
    return (rule: RuleId, offset: number, message: string, severity: Severity = "error", levelOverride?: Level) => {
      const { line, column } = loc(offset);
      if (ignored(lines, line, rule)) return;
      const level = levelOverride ?? RULES[rule].level;
      this.findings.push({ rule, level, severity: level === 0 ? "warning" : severity, file: rel, line, column, message, ...(inherited ? { inherited } : {}) });
    };
  }
}

type Report = ReturnType<Collector["file"]>;

// ───────────────────────────────── CSS

const THEME_SELECTOR = /(^|[\s,])(:root|\.dark|html|:host|@theme\b|\[data-theme|\.theme-)/;
const SHADOW_PROPS = /^(box-shadow|-webkit-box-shadow|text-shadow|filter|-webkit-filter|drop-shadow)$/i;
/** Masks use colour only as alpha. */
const MASK_PROPS = /^(-webkit-)?mask(-image|-border|-border-source)?$/i;

/** Blank `var(--token, fallback)` fallbacks for known tokens: a fallback for a token is a default, not a hard-code. */
function blankTokenFallbacks(value: string): string {
  const re = /var\(\s*--([\w-]+)\s*,/g;
  let out = value;
  for (const m of value.matchAll(re)) {
    if (!TOKEN_NAMES.has(m[1]!) && !/^nk-/.test(m[1]!)) continue;
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (i < value.length && depth > 0) {
      if (value[i] === "(") depth++;
      else if (value[i] === ")") depth--;
      i++;
    }
    out = out.slice(0, start) + " ".repeat(i - 1 - start) + out.slice(i - 1);
  }
  return out;
}

function scanCss(css: string, base: number, report: Report, ctx: FileContext) {
  const src = lexCss(css);
  ctx.tokenRefs += tokenRefs(src);
  const selectors: string[] = [];
  let buf = "";
  let bufStart = 0;
  let quote: string | null = null;
  let paren = 0;

  const statement = (text: string, at: number) => {
    const t = text.trim();
    if (!t) return;
    const lead = at + text.indexOf(t);
    if (t.startsWith("@")) {
      if (/^@import\b/i.test(t)) remoteInCss(t, base + lead, report);
      if (/^@apply\b/i.test(t)) for (const h of paletteClasses(t)) report("color/palette-class", base + lead + h.index, `${h.text} is a fixed palette colour; use a token class (bg-primary, text-muted-foreground…)`);
      return;
    }
    const colon = t.indexOf(":");
    if (colon <= 0) return;
    const prop = t.slice(0, colon).trim();
    const valueOffset = lead + colon + 1;
    const value = t.slice(colon + 1);
    remoteInCss(value, base + valueOffset, report);
    const inTheme = selectors.some((s) => THEME_SELECTOR.test(s));
    if (prop.startsWith("--")) {
      const name = prop.slice(2);
      if (inTheme && isTokenDefinition(name)) {
        ctx.tokenRefs++; // a token definition (a theme, or a theme default)
        return;
      }
      for (const h of colorLiterals(blankTokenFallbacks(value)))
        report("color/hardcoded", base + valueOffset + h.index, `--${name} hard-codes ${h.text}; a local colour variable bypasses the theme, use a token`);
      return;
    }
    if (MASK_PROPS.test(prop)) return;
    const shadow = SHADOW_PROPS.test(prop) || /drop-shadow\(/i.test(value);
    for (const h of colorLiterals(blankTokenFallbacks(value))) {
      if (shadow && isNeutralShadow(h.text)) continue;
      report("color/hardcoded", base + valueOffset + h.index, `${prop}: ${h.text} is a fixed colour; use a theme token (var(--…))`);
    }
    if (COLOR_PROPS.test(prop)) {
      for (const m of value.matchAll(/(?<![\w-])([a-z]+)(?![\w-(])/gi)) {
        if (NAMED.has(m[1]!.toLowerCase())) report("color/hardcoded", base + valueOffset + m.index!, `${prop}: ${m[1]} is a fixed colour; use a theme token`);
      }
    }
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "(") paren++;
    if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren === 0 && ch === "{") {
      selectors.push(buf.trim());
      buf = "";
      bufStart = i + 1;
      continue;
    }
    if (paren === 0 && (ch === ";" || ch === "}")) {
      statement(buf, bufStart);
      buf = "";
      bufStart = i + 1;
      if (ch === "}") selectors.pop();
      continue;
    }
    if (!buf) bufStart = i;
    buf += ch;
  }
  statement(buf, bufStart);
}

const REMOTE_HOST_OK = /^https?:\/\/(cfx-nui-|nui-img|localhost|127\.0\.0\.1)/i;

function remoteInCss(text: string, base: number, report: Report) {
  for (const m of text.matchAll(/(?:@import\s+(?:url\()?|url\()\s*["']?(https?:\/\/[^"')\s]+)/gi)) {
    const url = m[1]!;
    if (REMOTE_HOST_OK.test(url)) continue;
    report("perf/remote-asset", base + m.index!, `${url} is fetched from the network by every client; ship it in the resource`);
  }
}

// ───────────────────────────────── markup and scripts

interface FileContext {
  tokenRefs: number;
  importsCore: boolean;
  usesComponents: boolean;
  handshakeOff: boolean;
  hasScript: boolean;
  /** data-nk-glow marks seen across the resource's UI files (tokens 1.4 glow budget). */
  glowMarks: number;
}

const GLOW_MARK = /\bdata-nk-glow(?![-\w])/g;
/** The glow budget: a page whose source marks more than one part as glowing gets one warning. */
function scanGlow(text: string, base: number, report: Report, ctx: FileContext) {
  for (const m of text.matchAll(GLOW_MARK)) {
    if (++ctx.glowMarks === 2) report("attention/glow", base + m.index!, "a second part is marked data-nk-glow; only --nk-glow-budget (1) glows at a time, the focused one first: give each a rank (data-nk-glow=\"2\") or keep one");
  }
}

const REMOTE_EXT = /^https?:\/\/[^\s"'`]+\.(woff2?|ttf|otf|eot|css|png|jpe?g|webp|gif|svg|mp3|ogg|wav|mp4|webm|js)(\?[^\s"'`]*)?$/i;
const REMOTE_HOST = /^https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|cdn\.|cdnjs\.|unpkg\.com)/i;
const isRemoteAsset = (url: string) => (REMOTE_EXT.test(url) || REMOTE_HOST.test(url)) && !REMOTE_HOST_OK.test(url) && !url.includes("${");

function scanStrings(src: string, strings: Span[], report: Report, ctx: FileContext) {
  for (const s of strings) {
    const text = src.slice(s.start, s.end);
    if (!text) continue;
    ctx.tokenRefs += tokenRefs(text);
    const before = src.slice(Math.max(0, s.start - 24), s.start - 1);
    const isLinkish = /(?:href|to|id|xlinkHref|xlink:href|htmlFor|selector)\s*=\s*\{?\s*$/.test(before);
    const shadowProp = /shadow\w*["']?\s*:\s*$/i.test(before);
    for (const h of colorLiterals(text)) {
      if (h.text.startsWith("#") && isLinkish) continue;
      // [text-shadow:0_1px_2px_rgb(0_0_0/0.6)], drop-shadow-[…], boxShadow: "…": black/white shadows are fine
      const token = text.slice(text.lastIndexOf(" ", h.index) + 1, h.index);
      if ((shadowProp || /shadow/i.test(token)) && isNeutralShadow(h.text)) continue;
      report("color/hardcoded", s.start + h.index, `${h.text} is a fixed colour; use a theme token (var(--…) or a token class)`);
    }
    for (const h of paletteClasses(text)) report("color/palette-class", s.start + h.index, `${h.text} is a fixed palette colour; use a token class (bg-primary, text-muted-foreground…)`);
    const url = text.trim();
    if (isRemoteAsset(url)) {
      report("perf/remote-asset", s.start, `${url} is fetched from the network by every client; ship it in the resource`);
    }
  }
}

const ESCAPE_TOKEN = /(["'`])Esc(?:ape)?\1|\bkeyCode\s*={2,3}\s*27\b|\bwhich\s*={2,3}\s*27\b/g;
const KEY_LISTENER = /\b(keydown|keyup|keypress|onKeyDown|onKeyUp|onkeydown|onkeyup|useKeyPress|useHotkeys|useKeyboard)\b/;
const POST = /(?<![.\w])(fetchNui|fetchNUI|nuiFetch|fetch|closeNui|closeUI|\$\.post|axios\.post|sendNui|sendNUI|nuiCallback|postNui|callNui|post|send|nuiPost)\s*\(\s*(.{0,80})/g;

/** Local helpers an Escape handler typically calls to close; flagged when the same file posts to Lua. */
const CLOSER = /\b((?:handle|on|do)?(?:close|exit|hide|release|finish|dismiss|cancel)(?:Menu|Ui|UI|Nui|NUI|Panel|Dialog)?)\s*\(/gi;

function scanEscape(code: string, report: Report, ctx: FileContext, severity: Severity) {
  if (!KEY_LISTENER.test(code)) return;
  const filePosts = [...code.matchAll(POST)].some((p) => !/nuikit:escape/.test(p[2] ?? ""));
  const level = severity === "warning" ? 0 : undefined;
  const why = ctx.handshakeOff
    ? "fine when the overridden resource's protocol requires it, otherwise route it through surfaces"
    : "declare the surface's escape mode and let nuikit handle it (protocol §3.5)";
  const seen = new Set<number>();
  for (const m of code.matchAll(ESCAPE_TOKEN)) {
    // the handler body that follows: up to 15 lines
    const tail = code.slice(m.index!, m.index! + 1200).split("\n").slice(0, 15).join("\n");
    if (/nuikit:escape/.test(tail)) continue; // routed through the protocol
    let hit: string | null = null;
    for (const p of tail.matchAll(POST)) {
      const args = p[2] ?? "";
      const at = m.index! + p.index!;
      if (seen.has(at)) break;
      seen.add(at);
      hit = `${p[1]}(${args.split(/[,)]/)[0]}…)`;
      break;
    }
    if (!hit && filePosts) {
      const c = [...tail.matchAll(CLOSER)][0];
      if (c && !seen.has(m.index! + c.index!)) {
        seen.add(m.index! + c.index!);
        hit = `${c[1]}(), which posts to Lua`;
      }
    }
    if (hit) report("escape/adhoc", m.index!, `Escape calls ${hit} directly; ${why}`, severity, level);
  }
}

function scanScript(src: string, base: number, report: Report, ctx: FileContext) {
  const { code, strings } = lexJs(src);
  if (code.trim()) ctx.hasScript = true;
  const shifted = (r: Report): Report => (rule, offset, message, severity, level) => r(rule, base + offset, message, severity, level);
  const rep = shifted(report);
  scanStrings(src, strings, rep, ctx);
  if (/from\s+["']nuikit-core(\/[\w-]+)?["']|import\(\s*["']nuikit-core|require\(\s*["']nuikit-core/.test(code)) ctx.importsCore = true;
  if (/from\s+["'][^"']*components\/ui\/[^"']+["']/.test(code)) ctx.usesComponents = true;
  scanEscape(code, rep, ctx, ctx.handshakeOff ? "warning" : "error");
  scanGlow(code, base, report, ctx);
}

function scanHtml(src: string, report: Report, ctx: FileContext) {
  const { markup, styles, scripts } = lexHtml(src);
  if (/<meta[^>]+name=["']nuikit-handshake["'][^>]+content=["']off["']/i.test(markup)) ctx.handshakeOff = true;
  for (const s of styles) scanCss(src.slice(s.start, s.end), s.start, report, ctx);
  for (const s of scripts) scanScript(src.slice(s.start, s.end), s.start, report, ctx);
  scanGlow(markup, 0, report, ctx);
  // attributes: class, style, fill…
  for (const m of markup.matchAll(/\s([\w:@.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    const attr = m[1]!.toLowerCase();
    const value = m[3] ?? m[4] ?? "";
    const start = m.index! + m[0].indexOf(m[2]!) + 1;
    ctx.tokenRefs += tokenRefs(value);
    if (attr === "style" || attr === ":style") {
      scanCss(`x{${value}}`, start - 2, report, ctx);
      continue;
    }
    if (/^(href|src|id|for|name|content|data-[\w-]+|alt|title|action)$/.test(attr)) {
      if ((attr === "href" || attr === "src") && isRemoteAsset(value)) {
        const tag = markup.lastIndexOf("<", m.index!);
        const tagName = /^<(\w+)/.exec(markup.slice(tag))?.[1]?.toLowerCase();
        if (tagName === "link" || tagName === "script" || tagName === "img" || tagName === "audio" || tagName === "video" || tagName === "source")
          report("perf/remote-asset", start, `${value} is fetched from the network by every client; ship it in the resource`);
      }
      continue;
    }
    for (const h of colorLiterals(value)) report("color/hardcoded", start + h.index, `${attr}="${h.text}" is a fixed colour; use a theme token`);
    for (const h of paletteClasses(value)) report("color/palette-class", start + h.index, `${h.text} is a fixed palette colour; use a token class`);
  }
}

// ───────────────────────────────── Lua

interface LuaContext {
  focusCalls: { file: string; offset: number }[];
  releasesOnStop: boolean;
  surfaces: boolean;
  usesNuikitLua: boolean;
}

function isNuikitLua(rel: string, src: string) {
  return /(^|\/)nuikit\.lua$/.test(rel) || /nuikit\.lua: the Lua half of nuikit/.test(src.slice(0, 400));
}

function scanLua(rel: string, src: string, report: Report, ctx: LuaContext) {
  const { code, bare } = lexLua(src);
  const own = isNuikitLua(rel, src);
  if (own) ctx.usesNuikitLua = true;
  if (!own) {
    for (const m of bare.matchAll(/\bSetNuiFocus(KeepInput)?\s*\(/g)) {
      ctx.focusCalls.push({ file: rel, offset: m.index! });
      report("focus/direct", m.index!, `${m[0].replace(/\s*\($/, "")} called directly; declare a surface (nk.surface) and let nuikit own focus (protocol §3.2)`);
    }
    if (/\b(?:NUI|nk)\s*\.\s*(surface|open|toggle)\s*\(/.test(bare)) ctx.surfaces = true;
  }
  const blocks = luaBlocks(bare);
  // focus release in a stop handler
  for (const m of code.matchAll(/AddEventHandler\s*\(\s*["']on(?:Client)?ResourceStop["']/g)) {
    const fn = blocks.filter((b) => b.kind === "function" && b.start > m.index!).sort((a, b) => a.start - b.start)[0];
    const body = fn ? bare.slice(fn.start, fn.end) : bare.slice(m.index!, m.index! + 600);
    if (/\bSetNuiFocus\s*\(\s*false/.test(body)) ctx.releasesOnStop = true;
  }
  // per-frame sends: innermost loop containing the send has Wait(0)
  const loops = blocks.filter((b) => b.kind === "while" || b.kind === "repeat");
  for (const m of bare.matchAll(/\b(SendNUIMessage|SendNuiMessage|NUI\s*\.\s*send)\s*\(/g)) {
    const at = m.index!;
    const inner = loops.filter((l) => l.start < at && at < l.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    if (!inner) continue;
    if (/\b(?:Citizen\s*\.\s*)?Wait\s*\(\s*0\s*\)/.test(bare.slice(inner.start, inner.end)))
      report("perf/frame-send", at, `${m[1]!.replace(/\s+/g, "")} inside a Wait(0) loop runs every frame; send on change or throttle to ≤ 10 Hz`);
  }
}

// ───────────────────────────────── manifest

interface Manifest {
  file: string;
  src: string;
  page?: { type: "ui_page" | "loadscreen"; path: string; offset: number };
  protocol?: string;
  loadsNuikitLua: boolean;
  /** Has a files { } entry (themes, chat_theme) */
}

function readManifest(root: string): Manifest | null {
  for (const file of ["fxmanifest.lua", "__resource.lua"]) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, "utf8");
    const { code } = lexLua(src);
    const page = /^\s*(ui_page|loadscreen)\s*\(?\s*["']([^"']+)["']/m.exec(code);
    const protocol = /^\s*nuikit_protocol\s*\(?\s*["']?([\w.]+)["']?/m.exec(code);
    return {
      file,
      src,
      page: page ? { type: page[1] as "ui_page" | "loadscreen", path: page[2]!, offset: page.index! + page[0].indexOf(page[1]!) } : undefined,
      protocol: protocol?.[1],
      // a copy of nuikit.lua, or the runtime imported from the nuikit resource
      loadsNuikitLua: /["'][^"']*nuikit\.lua["']/.test(code) || /["']@nuikit\/init\.lua["']/.test(code),
    };
  }
  return null;
}

// ───────────────────────────────── entry

/** Check one resource (or override / web) folder. */
export function checkResource(root: string, options: CheckOptions = {}): CheckResult {
  const abs = path.resolve(root);
  const collector = new Collector(abs);
  const manifest = readManifest(abs);
  const all = walk(abs);
  const ui = all.filter((f) => UI_EXT.test(f.rel) && !SKIP_FILE.test(f.rel) && !SKIP_DIR_IN_PATH.test(f.rel));
  const sources = ui.filter((f) => !f.built);
  // Only built output (a downloaded resource): grade what ships, but skip bundled JS (vendor code).
  const uiFiles = options.includeBuilt || sources.length === 0 ? ui.filter((f) => !f.built || !/\.(m?js|cjs)$/.test(f.rel) || options.includeBuilt) : sources;
  const luaFiles = all.filter((f) => /\.lua$/.test(f.rel) && f.rel !== manifest?.file && !SKIP_DIR_IN_PATH.test(f.rel));

  const ctx: FileContext = { tokenRefs: 0, importsCore: false, usesComponents: false, handshakeOff: false, hasScript: false, glowMarks: 0 };
  // HTML first so the handshake-off meta is known before scripts are graded.
  const ordered = [...uiFiles].sort((a, b) => Number(/\.html?$/.test(b.rel)) - Number(/\.html?$/.test(a.rel)));
  for (const f of ordered) {
    const src = fs.readFileSync(path.join(abs, f.rel), "utf8");
    const report = collector.file(f.rel, src);
    if (/(^|\/)components\/ui\//.test(f.rel)) ctx.usesComponents = true;
    if (/\.(css|scss|sass|less)$/i.test(f.rel)) scanCss(src, 0, report, ctx);
    else if (/\.(html?|vue|svelte)$/i.test(f.rel)) scanHtml(src, report, ctx);
    else scanScript(src, 0, report, ctx);
  }

  const lua: LuaContext = { focusCalls: [], releasesOnStop: false, surfaces: false, usesNuikitLua: false };
  for (const f of luaFiles) {
    const src = fs.readFileSync(path.join(abs, f.rel), "utf8");
    scanLua(f.rel, src, collector.file(f.rel, src), lua);
  }

  const kind: Kind = manifest ? "resource" : ctx.handshakeOff ? "override" : "web";
  const skipped: RuleId[] = [];
  const hasUi = uiFiles.length > 0 || !!manifest?.page;
  const isUiPage = manifest?.page?.type === "ui_page";

  if (hasUi && ctx.tokenRefs === 0) {
    collector.file(uiFiles[0]?.rel ?? manifest?.file ?? ".", "")("tokens/none", 0, "No theme token is read anywhere (var(--primary), bg-primary, nk-*): the server theme can't reach this UI");
  }

  if (manifest) {
    const report = collector.file(manifest.file, manifest.src);
    if (isUiPage && !manifest.protocol) report("manifest/protocol", manifest.page!.offset, "ui_page without nuikit_protocol '1': declare the protocol version this UI speaks (protocol §2.1)");
    if (!isUiPage) skipped.push("manifest/protocol", "surfaces/none");
    else if (!lua.surfaces) report("surfaces/none", manifest.page!.offset, "This UI registers no surface (nk.surface / nk.open), so nuikit can't coordinate its focus, stacking or Escape");
    if (lua.focusCalls.length && !lua.releasesOnStop) {
      const first = lua.focusCalls[0]!;
      const src = fs.readFileSync(path.join(abs, first.file), "utf8");
      collector.file(first.file, src)("focus/no-release", first.offset, "Focus is taken here but no onClientResourceStop handler calls SetNuiFocus(false, false): a restart can leave the cursor stuck");
    }
    if (hasUi && !manifest.page) skipped.push("native/runtime", "native/components");
    else if (hasUi) {
      const missing = [isUiPage && !lua.usesNuikitLua && !manifest.loadsNuikitLua ? "the nuikit runtime isn't loaded (shared_script '@nuikit/init.lua')" : null, ctx.hasScript && !ctx.importsCore ? "the page doesn't import nuikit-core" : null].filter(Boolean);
      if (!uiFiles.some((f) => /\.(m?[jt]sx?|vue|svelte|html?)$/.test(f.rel) && !f.built)) missing.push("no page source to run nuikit-core");
      if (missing.length) report("native/runtime", manifest.page?.offset ?? 0, `Not on the nuikit runtime: ${missing.join("; ")}`);
    } else skipped.push("native/runtime");
  } else {
    skipped.push("manifest/protocol", "surfaces/none", "focus/direct", "focus/no-release", "perf/frame-send");
    const first = uiFiles.find((f) => /\.html?$/.test(f.rel)) ?? uiFiles[0];
    if (first && !ctx.importsCore) collector.file(first.rel, "")("native/runtime", 0, "The page doesn't import nuikit-core");
  }
  if (hasUi && !ctx.usesComponents && !skipped.includes("native/components")) {
    const first = uiFiles[0];
    collector.file(first?.rel ?? manifest?.file ?? ".", "")("native/components", 0, "No shadcn/ui or nuikit registry components (components/ui/…)");
  }
  if (!hasUi) skipped.push("color/hardcoded", "color/palette-class", "tokens/none", "escape/adhoc", "native/components", "perf/remote-asset");

  const findings = collector.findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
  let level: Level | null = null;
  if (hasUi) {
    // A resource with styles but no page of its own (a chat theme, the theme resource) can only be graded as themed.
    level = manifest && !manifest.page ? 1 : 3;
    for (const f of findings) if (f.severity === "error" && f.level > 0 && f.level <= level) level = (f.level - 1) as Level;
  }

  return {
    root,
    name: path.basename(abs),
    kind,
    page: manifest?.page ? { type: manifest.page.type, path: manifest.page.path } : undefined,
    protocol: manifest?.protocol,
    level,
    findings,
    skipped: [...new Set(skipped)],
    stats: { files: all.length, uiFiles: uiFiles.length, luaFiles: luaFiles.length, tokenRefs: ctx.tokenRefs },
  };
}

/** Is `dir` a resource (fxmanifest) or a bare UI folder (web/ or index.html)? */
export function isResourceRoot(dir: string): boolean {
  return ["fxmanifest.lua", "__resource.lua"].some((f) => fs.existsSync(path.join(dir, f))) || fs.existsSync(path.join(dir, "web")) || fs.existsSync(path.join(dir, "index.html"));
}

/** A resource folder → [it]; a folder of resources ([resources], systems/) → every resource under it. */
export function findResources(dir: string, depth = 4): string[] {
  if (isResourceRoot(dir)) return [dir];
  if (depth === 0) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    // build output repeats its sources; check it by pointing at it directly
    .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name) && !BUILT_DIRS.has(e.name) && !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => findResources(path.join(dir, e.name), depth - 1));
}

export function check(target: string, options: CheckOptions = {}): CheckResult[] {
  return findResources(target).map((r) => checkResource(r, options));
}

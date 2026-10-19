/**
 * Just enough lexing to tell code from comments and strings, without a parser per language.
 * Every function keeps offsets: blanked characters become spaces and newlines stay, so a match in
 * the output is at the same line and column as in the source.
 */

export interface Span {
  start: number;
  end: number;
}

const blank = (s: string) => s.replace(/[^\n]/g, " ");

function splice(chars: string[], start: number, end: number) {
  for (let i = start; i < end; i++) if (chars[i] !== "\n") chars[i] = " ";
}

/** Characters after which `/` starts a regex literal rather than a division. */
const REGEX_PREV = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", ";", "+", "-", "*", "%", "~", "^", ""]);
const REGEX_KEYWORDS = /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)\s*$/;

export interface JsLex {
  /** Source with comments blanked. */
  code: string;
  /** String literal contents (template literal text included, `${…}` excluded). */
  strings: Span[];
}

/** JS / TS / JSX. Single and double quoted strings end at a newline, so stray apostrophes in JSX text can't swallow a file. */
export function lexJs(src: string): JsLex {
  const chars = src.split("");
  const strings: Span[] = [];
  const n = src.length;
  // template literal nesting: each entry is the brace depth at which a `${` opened
  const tpl: number[] = [];
  let depth = 0;
  let i = 0;
  let prev = ""; // last significant char outside strings/comments

  const readTemplate = () => {
    // at the char after ` or after the } closing a ${…}
    let start = i;
    while (i < n) {
      const ch = src[i];
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "`") {
        strings.push({ start, end: i });
        i++;
        prev = "`";
        return;
      }
      if (ch === "$" && src[i + 1] === "{") {
        strings.push({ start, end: i });
        i += 2;
        depth++;
        tpl.push(depth);
        prev = "{";
        return;
      }
      i++;
    }
    strings.push({ start, end: n });
  };

  while (i < n) {
    const ch = src[i]!;
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      splice(chars, i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      splice(chars, i, stop);
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const start = i + 1;
      i++;
      while (i < n && src[i] !== ch && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1;
      strings.push({ start, end: Math.min(i, n) });
      i++;
      prev = ch;
      continue;
    }
    if (ch === "`") {
      i++;
      readTemplate();
      continue;
    }
    if (ch === "/" && next !== ">" && (REGEX_PREV.has(prev) || REGEX_KEYWORDS.test(src.slice(Math.max(0, i - 12), i)))) {
      // regex literal
      i++;
      let inClass = false;
      while (i < n && src[i] !== "\n") {
        const c = src[i];
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
        i++;
      }
      i++;
      while (i < n && /[a-z]/i.test(src[i]!)) i++;
      prev = "/x";
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      if (tpl.length && tpl[tpl.length - 1] === depth) {
        tpl.pop();
        depth--;
        i++;
        readTemplate();
        continue;
      }
      depth--;
    }
    if (!/\s/.test(ch)) prev = /[\w$]/.test(ch) ? "w" : ch;
    i++;
  }
  return { code: chars.join(""), strings };
}

/** CSS: blank comments. */
export function lexCss(src: string): string {
  return src.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, blank);
}

export interface HtmlLex {
  /** Markup with `<!-- -->` blanked and `<style>` / `<script>` bodies blanked. */
  markup: string;
  styles: Span[];
  scripts: Span[];
}

/** HTML, Vue and Svelte single-file components. */
export function lexHtml(src: string): HtmlLex {
  let markup = src.replace(/<!--[\s\S]*?(?:-->|$)/g, blank);
  const styles: Span[] = [];
  const scripts: Span[] = [];
  for (const [tag, list] of [
    ["style", styles],
    ["script", scripts],
  ] as const) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi");
    for (const m of markup.matchAll(re)) {
      const open = m[0].indexOf(">") + 1;
      const start = m.index! + open;
      list.push({ start, end: start + m[1]!.length });
    }
  }
  const chars = markup.split("");
  for (const s of [...styles, ...scripts]) splice(chars, s.start, s.end);
  markup = chars.join("");
  return { markup, styles, scripts };
}

export interface LuaLex {
  /** Comments blanked, strings kept. */
  code: string;
  /** Comments and string contents blanked (quotes kept). */
  bare: string;
}

export function lexLua(src: string): LuaLex {
  const code = src.split("");
  const bare = src.split("");
  const n = src.length;
  let i = 0;
  const longClose = (at: number): [number, number] | null => {
    // at points to '['; returns [level, contentStart]
    const m = /^\[(=*)\[/.exec(src.slice(at, at + 64));
    return m ? [m[1]!.length, at + m[0].length] : null;
  };
  while (i < n) {
    const ch = src[i];
    if (ch === "-" && src[i + 1] === "-") {
      const long = src[i + 2] === "[" ? longClose(i + 2) : null;
      let stop: number;
      if (long) {
        const close = "]" + "=".repeat(long[0]) + "]";
        const end = src.indexOf(close, long[1]);
        stop = end === -1 ? n : end + close.length;
      } else {
        const end = src.indexOf("\n", i);
        stop = end === -1 ? n : end;
      }
      splice(code, i, stop);
      splice(bare, i, stop);
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const start = i + 1;
      i++;
      while (i < n && src[i] !== ch && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1;
      splice(bare, start, Math.min(i, n));
      i++;
      continue;
    }
    if (ch === "[") {
      const long = longClose(i);
      if (long) {
        const close = "]" + "=".repeat(long[0]) + "]";
        const end = src.indexOf(close, long[1]);
        const stop = end === -1 ? n : end;
        splice(bare, long[1], stop);
        i = stop + close.length;
        continue;
      }
    }
    i++;
  }
  return { code: code.join(""), bare: bare.join("") };
}

/** Offset → 1-based line and column. */
export function locator(src: string): (offset: number) => { line: number; column: number } {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - starts[lo]! + 1 };
  };
}

export interface LuaBlock {
  kind: "while" | "repeat" | "for" | "function" | "if" | "do";
  start: number;
  end: number;
}

/** Block ranges in comment- and string-free Lua (`bare` from lexLua). Unbalanced input yields what it can. */
export function luaBlocks(bare: string): LuaBlock[] {
  const out: LuaBlock[] = [];
  const stack: (LuaBlock & { awaitingDo?: boolean })[] = [];
  const re = /\b(function|while|for|do|if|repeat|until|end)\b/g;
  for (const m of bare.matchAll(re)) {
    const word = m[1]!;
    const at = m.index!;
    // skip field access like `x.end` or `t:do`
    const before = bare[at - 1];
    if (before === "." || before === ":") continue;
    const top = stack[stack.length - 1];
    switch (word) {
      case "while":
      case "for":
        stack.push({ kind: word, start: at, end: -1, awaitingDo: true });
        break;
      case "do":
        if (top?.awaitingDo) top.awaitingDo = false;
        else stack.push({ kind: "do", start: at, end: -1 });
        break;
      case "if":
      case "function":
      case "repeat":
        stack.push({ kind: word, start: at, end: -1 });
        break;
      case "until":
      case "end": {
        const b = stack.pop();
        if (b) out.push({ kind: b.kind, start: b.start, end: at + word.length });
        break;
      }
    }
  }
  return out;
}

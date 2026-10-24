// Resolves a CSS custom-property value (theme value, else the kit.css default) to a typed Figma value for one mode.
// Understands var(--x, fallback), calc/max/min, rem/px/em/ms/s/%/deg, rgb()/rgba() and transparent. Nothing else.
import { readFileSync } from "node:fs";

const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

function closing(s, i) { // index of the ")" that closes the "(" at i
  let d = 0;
  for (let j = i; j < s.length; j++) { if (s[j] === "(") d++; else if (s[j] === ")" && --d === 0) return j; }
  throw new Error("unbalanced: " + s);
}
function splitTop(s) { // split on the first top-level comma
  let d = 0;
  for (let i = 0; i < s.length; i++) { if (s[i] === "(") d++; else if (s[i] === ")") d--; else if (s[i] === "," && d === 0) return [s.slice(0, i), s.slice(i + 1)]; }
  return [s, null];
}
/** Replace every var() with its value (recursively). The fallback is used only when the name is undefined. */
export function subst(s, env, seen = []) {
  let out = "", i = 0;
  while (i < s.length) {
    const k = s.indexOf("var(", i);
    if (k < 0) { out += s.slice(i); break; }
    out += s.slice(i, k);
    const e = closing(s, k + 3);
    const [name, fb] = splitTop(s.slice(k + 4, e));
    const n = name.trim().replace(/^--/, "");
    if (seen.includes(n)) throw new Error("cycle at " + n);
    if (env[n] !== undefined) out += subst(String(env[n]), env, [...seen, n]);
    else if (fb !== null) out += subst(fb.trim(), env, seen);
    else throw new Error("undefined --" + n);
    i = e + 1;
  }
  return out;
}
/** The first name a plain var() chain resolves to (for aliases), or null if the value is not a plain var(). */
export function plainVar(s, env) {
  s = s.trim();
  if (!s.startsWith("var(") || closing(s, 3) !== s.length - 1) return null;
  const [name, fb] = splitTop(s.slice(4, -1));
  const n = name.trim().replace(/^--/, "");
  if (env[n] !== undefined) return n;
  return fb === null ? null : plainVar(fb, env);
}

// ---- numbers: calc/max/min over lengths, all returned in px (rem 16) or the bare unit's number
function evalExpr(src) {
  const t = src.match(/[a-z]+\(|[\d.]+(?:rem|px|em|ms|s|deg|%)?|[-+*/(),]|[a-z]+/gi) || [];
  let p = 0;
  const peek = () => t[p], next = () => t[p++];
  function atom() {
    const x = next();
    if (x === "(" ) { const v = sum(); next(); return v; }
    if (x === "-") return -atom();
    if (/^(calc|max|min)\($/.test(x)) {
      if (x === "calc(") { const v = sum(); next(); return v; }
      const a = [sum()]; while (peek() === ",") { next(); a.push(sum()); } next();
      return x === "max(" ? Math.max(...a) : Math.min(...a);
    }
    const m = /^([\d.]+)(rem|px|em|ms|s|deg|%)?$/.exec(x || "");
    if (!m) throw new Error("not a number: " + src);
    const n = parseFloat(m[1]);
    return m[2] === "rem" || m[2] === "em" ? n * 16 : m[2] === "s" ? n * 1000 : n;
  }
  function prod() { let v = atom(); while (peek() === "*" || peek() === "/") v = next() === "*" ? v * atom() : v / atom(); return v; }
  function sum() { let v = prod(); while (peek() === "+" || peek() === "-") v = next() === "+" ? v + prod() : v - prod(); return v; }
  const v = sum();
  if (p !== t.length) throw new Error("trailing: " + src);
  return v;
}
/** em-based lengths (letter-spacing) as a percent of em; everything else px. */
export function toNumber(css, { em = false } = {}) {
  css = css.trim();
  if (em && /^-?[\d.]+em$/.test(css)) return Math.round(parseFloat(css) * 10000) / 100;
  const v = evalExpr(css);
  return Math.round(v * 1000) / 1000;
}
export function toColor(css) {
  css = css.trim();
  if (css === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const m = /^rgba?\((.*)\)$/.exec(css);
  if (!m) throw new Error("not a colour: " + css);
  const parts = []; let rest = m[1];
  for (;;) { const [a, b] = splitTop(rest); parts.push(a); if (b === null) break; rest = b; }
  const [r, g, b, a] = parts.map((x) => evalExpr(x));
  return { r: r / 255, g: g / 255, b: b / 255, a: a === undefined ? 1 : a };
}

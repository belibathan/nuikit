// Class-string lint (design v2 §5B, docs/design/contract.md): conflicting and unknown Tailwind classes, and
// the classes CLAUDE.md forbids. Run with `pnpm lint:classes`. Synced copies are skipped: their sources are
// linted (registry/), and pnpm sync keeps the copies identical.
import fs from "node:fs";
import tsParser from "@typescript-eslint/parser";
import betterTailwind from "eslint-plugin-better-tailwindcss";

// Classes that the kit rules forbid (CLAUDE.md "Hard rules", docs/design.md). Not scale-*/translate-*: Tailwind
// compiles them to the individual properties, but vite-plugin-nuikit lowers those in stylesheets; the ban is on
// custom CSS.
const restrict = [
  // palette colours: the theme owns colour (nuikit check also catches these in strings)
  { pattern: "^(.*:)?(bg|text|border|ring|fill|stroke|from|via|to|outline|shadow|divide|accent|caret|decoration)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\\d+(/.*)?$", message: "\"$0\" is a palette colour: use a theme token (docs/tokens.md)." },
  // essentials on :has() / @container are ignored in Chromium 103
  { pattern: "^(.*:)?(has|group-has|peer-has)-.*$", message: "\"$0\" relies on :has(), which Chromium 103 ignores: only for non-essential polish." },
  { pattern: "^(.*:)?@.*$", message: "\"$0\" is a container query, which Chromium 103 ignores: only for non-essential polish." },
  // a bare px size (w-[640px], text-[13px]): rem follows the NUI scale. Rings, outlines, borders, offsets and
  // shadows are hairlines and may be px; px inside calc() offsets is fine.
  { pattern: "^(.*:)?(?!ring|outline|border|shadow|inset-shadow|divide|offset|ring-offset)[a-z-]+-\\[\\d+(\\.\\d+)?px\\]$", message: "\"$0\" sizes in px: use rem so it follows the NUI scale (px only for hairlines)." },
];
const root = import.meta.dirname;
// the code disables react-hooks rules inline; this config doesn't run them, so give ESLint their names
const reactHooks = { rules: { "exhaustive-deps": { create: () => ({}) }, "rules-of-hooks": { create: () => ({}) } } };

// one block per UI: its own synced index.css is the entry point (it knows the theme tokens and nk-* kit)
const uis = ["systems", "addons"].flatMap((group) =>
  fs.existsSync(group) ? fs.readdirSync(group).filter((d) => fs.existsSync(`${group}/${d}/web/src/index.css`) && fs.existsSync(`${group}/${d}/web/node_modules/tailwindcss`)).map((d) => `${group}/${d}/web`) : [],
);
// a UI's own feature CSS (hud.css, app.css…) defines plain classes Tailwind doesn't know: they aren't unknown
const ownClasses = (web) => {
  const names = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css") && p !== `${web}/src/index.css`)
        for (const m of fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)) names.add(m[1]);
    }
  };
  if (fs.existsSync(`${web}/src`)) walk(`${web}/src`);
  const own = [...names].map((n) => `^${n}$`);
  // tw-animate-css, when the UI imports it next to index.css
  if (fs.existsSync(`${web}/package.json`) && fs.readFileSync(`${web}/package.json`, "utf8").includes('"tw-animate-css"'))
    own.push("^(animate-(in|out)|(fade|zoom|spin)-(in|out)(-.*)?|slide-(in|out)-from-.*|slide-(in|out)-to-.*|fill-mode-.*)$");
  return own;
};
const block = (files, web, ignores = []) => ({
  files,
  ignores,
  languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "better-tailwindcss": betterTailwind, "react-hooks": reactHooks },
  settings: { "better-tailwindcss": { entryPoint: `${root}/${web}/src/index.css`, cwd: `${root}/${web}`, detectComponentClasses: true } },
  rules: {
    "better-tailwindcss/no-conflicting-classes": "warn",
    "better-tailwindcss/no-unknown-classes": ["warn", { ignore: ["^group/", "^peer/", "^dark$", "^toaster$", ...ownClasses(web)] }],
    "better-tailwindcss/no-restricted-classes": ["warn", { restrict }],
  },
});

export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "vendor/**"] },
  // the registry, against a UI built from the template's index.css (stock theme + tokens + kit)
  block(["registry/**/*.{ts,tsx}"], "systems/nuikit_pause/web", ["registry/**/*.test.{ts,tsx}"]),
  // each UI's own code; synced copies (components/ui, hooks, lib/utils.ts) are linted at their source
  ...uis.map((web) => block([`${web}/src/**/*.{ts,tsx}`], web, [`${web}/src/components/ui/**`, `${web}/src/hooks/**`, `${web}/src/lib/utils.ts`])),
];

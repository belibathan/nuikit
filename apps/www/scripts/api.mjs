// The props and levers behind every /components section, read from the registry sources with the TypeScript
// checker, so the tables follow the code. Writes src/generated/api.json; runs before dev and build.
//   props:  each exported component's own props (not React's DOM props): type, default, JSDoc
//   levers: the --nk-* custom properties the component reads, in its source and in kit.css's rules for its slots
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const uiDir = path.join(root, "registry/nuikit/ui");
const kit = fs.readFileSync(path.join(root, "packages/create-nuikit/kit.css"), "utf8");
const out = path.join(here, "../src/generated/api.json");

const files = fs.readdirSync(uiDir).filter((f) => f.endsWith(".tsx")).map((f) => path.join(uiDir, f));
const program = ts.createProgram(files, {
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  baseUrl: root,
  paths: {
    "@/components/ui/*": ["registry/nuikit/ui/*", "vendor/shadcn/ui/*"],
    "@/hooks/*": ["registry/nuikit/hooks/*"],
    "@/lib/*": ["registry/nuikit/lib/*"],
    // the registry sits outside the app: resolve its packages (and React's types) from the app's node_modules
    react: ["apps/www/node_modules/@types/react"],
    "react/*": ["apps/www/node_modules/@types/react/*"],
    "*": ["apps/www/node_modules/*", "apps/www/node_modules/@types/*"],
  },
  types: [],
  typeRoots: [path.join(here, "../node_modules/@types")],
});
const checker = program.getTypeChecker();

const isReact = (d) => /[\\/]@types[\\/+]react/.test(d.getSourceFile().fileName) || /node_modules[\\/].*radix/.test(d.getSourceFile().fileName);
const clip = (s, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** The --nk-* tokens kit.css reads inside rules whose selector names one of these slots. */
function kitLevers(slots) {
  const found = new Set();
  for (const m of kit.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1];
    if (!slots.some((s) => sel.includes(`"${s}"`) || sel.includes(`.nk-${s}`))) continue;
    for (const v of m[2].matchAll(/var\((--nk-[a-z0-9-]+)/g)) found.add(v[1]);
  }
  return found;
}

const api = {};
for (const file of files) {
  const sf = program.getSourceFile(file);
  if (!sf) continue;
  const name = path.basename(file, ".tsx");
  const text = sf.text;
  const slots = [...new Set([...text.matchAll(/data-slot[=:]\s*\{?\s*["']([a-z-]+)["']/g)].map((m) => m[1]))];
  slots.push(name);
  const levers = new Set([...text.matchAll(/(--nk-[a-z0-9-]+)/g)].map((m) => m[1].replace(/-$/, "")));
  for (const l of kitLevers(slots)) levers.add(l);

  const components = [];
  const moduleSym = checker.getSymbolAtLocation(sf);
  const exports = moduleSym ? checker.getExportsOfModule(moduleSym) : [];
  // exported components, and the parts of a namespace object (const VitalChip = { Root, Row… })
  const entries = [];
  for (const ex of exports) {
    if (!/^[A-Z]/.test(ex.name)) continue;
    const sym = ex.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(ex) : ex;
    const decl = sym.declarations?.[0];
    if (decl && ts.isFunctionDeclaration(decl)) entries.push([ex.name, decl]);
    else if (decl && ts.isVariableDeclaration(decl) && decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
      for (const p of decl.initializer.properties) {
        const id = ts.isShorthandPropertyAssignment(p) ? p.name : ts.isPropertyAssignment(p) && ts.isIdentifier(p.initializer) ? p.initializer : null;
        const target = id && (ts.isShorthandPropertyAssignment(p) ? checker.getShorthandAssignmentValueSymbol(p) : checker.getSymbolAtLocation(id));
        const fd = target?.declarations?.[0];
        if (fd && ts.isFunctionDeclaration(fd)) entries.push([`${ex.name}.${p.name.getText(sf)}`, fd]);
      }
    }
  }
  for (const [exName, decl] of entries) {
    const ex = { name: exName };
    const param = decl.parameters[0];
    if (!param) continue;
    const defaults = {};
    if (ts.isObjectBindingPattern(param.name)) {
      for (const el of param.name.elements) {
        if (el.initializer && !el.dotDotDotToken) defaults[(el.propertyName ?? el.name).getText(sf)] = clip(el.initializer.getText(sf), 40);
      }
    }
    const type = checker.getTypeAtLocation(param);
    const props = [];
    for (const p of checker.getPropertiesOfType(type)) {
      const ds = p.declarations ?? [];
      if (!ds.length || ds.every(isReact) || p.name === "className") continue;
      // the type as written (keeps aliases and the author's order), else the checker's
      const wd = ds.find((d) => !isReact(d) && d.type);
      const w = wd?.type.getText(wd.getSourceFile());
      const written = w && !w.includes("typeof") ? w : undefined;
      const pt = checker.getTypeOfSymbolAtLocation(p, param);
      let t = written ?? checker.typeToString(checker.getNonNullableType(pt), param, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
      t = t
        .replace(/\s+/g, " ")
        .replace(/React\.ReactNode/g, "ReactNode")
        .replace(/import\([^)]*\)\./g, "")
        .replace(/string \| number \| bigint \| boolean \| React\.ReactElement.*$/, "ReactNode");
      const doc = ts.displayPartsToString(p.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
      props.push({ name: p.name, type: clip(t), default: defaults[p.name] ?? null, doc, required: !(p.flags & ts.SymbolFlags.Optional) });
    }
    components.push({ name: ex.name, props });
  }
  // the kit's private state variables (--nk-tile-rim-now…) are not levers
  api[name] = { components, levers: [...levers].filter((l) => !/-now$/.test(l)).sort() };
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(api, null, 1)}\n`);
console.log(`api.json: ${Object.keys(api).length} items, ${Object.values(api).reduce((n, a) => n + a.components.length, 0)} components`);

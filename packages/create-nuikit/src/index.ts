#!/usr/bin/env node
/**
 * create-nuikit — a FiveM NUI resource with shadcn, Tailwind v4, typed Lua↔JS and
 * browser devtools, in one command.
 *
 *   npm create nuikit@latest my-hud
 *   pnpm create nuikit my-hud --yes
 *   npm create nuikit@latest my-hud -- -t hud-minimal     (start from a block)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";

const REGISTRY = "https://nuikit.vercel.app";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(HERE, "../template");
/** Block templates, assembled at build time by scripts/templates.mjs (base + registry block + Lua). */
const BLOCKS = path.resolve(HERE, "templates");
/** nuikit-core, vite-plugin-nuikit and create-nuikit are released together with one version. */
const VERSION: string = JSON.parse(fs.readFileSync(path.resolve(HERE, "../package.json"), "utf8")).version;

type PM = "pnpm" | "npm" | "yarn" | "bun";

interface Block {
  name: string;
  title: string;
  description: string;
  next: string[];
}

interface Args {
  name?: string;
  yes: boolean;
  install?: boolean;
  pm?: PM;
  /** a block template (`-t hud-minimal`); the demo when absent */
  template?: string;
  /** contributors: link nuikit + vite-plugin-nuikit to a local checkout */
  link?: string;
}

function blocks(): Block[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(BLOCKS, "index.json"), "utf8")) as Block[];
  } catch {
    return [];
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-y" || a === "--yes") args.yes = true;
    else if (a === "--no-install") args.install = false;
    else if (a === "--install") args.install = true;
    else if (a === "--pm") args.pm = argv[++i] as PM;
    else if (a === "-t" || a === "--template") args.template = argv[++i];
    else if (a.startsWith("--template=")) args.template = a.slice("--template=".length);
    else if (a === "--link") args.link = path.resolve(argv[++i]!);
    else if (a === "-h" || a === "--help") help();
    else if (!a.startsWith("-") && !args.name) args.name = a;
  }
  return args;
}

function help(): never {
  console.log(`
  ${pc.magenta("◆")} ${pc.bold("create-nuikit")} ${pc.dim("— FiveM NUI with shadcn that actually renders in game")}

  ${pc.bold("Usage")}   npm create nuikit@latest ${pc.dim("[resource-name] [options]")}

  ${pc.bold("Options")}
    -t, --template <block>  start from a block ${pc.dim("(default: the demo)")}
    -y, --yes               accept defaults
    --pm <pm>               pnpm | npm | yarn | bun ${pc.dim("(default: the one you ran)")}
    --no-install            skip installing dependencies

  ${pc.bold("Blocks")}
${blocks().map((b) => `    ${b.name.padEnd(22)}  ${b.description}`).join("\n") || "    (none in this build)"}
`);
  process.exit(0);
}

function detectPM(): PM {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

const validName = (n: string) => /^[a-z0-9][a-z0-9_-]*$/i.test(n);

function copyDir(from: string, to: string, vars: Record<string, string>) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name === "_gitignore" ? ".gitignore" : entry.name);
    if (entry.isDirectory()) copyDir(src, dest, vars);
    else {
      const text = fs.readFileSync(src, "utf8");
      fs.writeFileSync(dest, text.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m));
    }
  }
}

function run(cmd: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "pipe", shell: process.platform === "win32" });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split("\n").slice(-6).join("\n")))));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log();
  p.intro(`${pc.bgMagenta(pc.black(" nuikit "))} ${pc.dim("shadcn + Tailwind v4 for FiveM, rendered right")}`);

  let name = args.name;
  if (!name) {
    if (args.yes) name = "my-nui";
    else {
      const answer = await p.text({
        message: "Resource name",
        placeholder: "my-hud",
        defaultValue: "my-hud",
        validate: (v) => (!v || validName(v) ? undefined : "letters, numbers, - and _ only"),
      });
      if (p.isCancel(answer)) return cancel();
      name = answer || "my-hud";
    }
  }
  if (!validName(name)) {
    p.cancel(`"${name}" isn't a valid resource name — letters, numbers, - and _ only.`);
    process.exit(1);
  }

  const dir = path.resolve(process.cwd(), name);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) {
    if (args.yes) {
      p.cancel(`${name}/ already exists and isn't empty.`);
      process.exit(1);
    }
    const ok = await p.confirm({ message: `${name}/ isn't empty. Write into it anyway?`, initialValue: false });
    if (p.isCancel(ok) || !ok) return cancel();
  }

  const available = blocks();
  let block: Block | undefined;
  if (args.template) {
    block = available.find((b) => b.name === args.template);
    if (!block) {
      p.cancel(
        `There's no "${args.template}" template. Blocks: ${available.map((b) => b.name).join(", ") || "none in this build"}.`,
      );
      process.exit(1);
    }
  } else if (!args.yes && available.length) {
    const answer = await p.select({
      message: "Start from",
      initialValue: "",
      options: [
        { value: "", label: "Demo", hint: "a HUD, a menu and a confirm dialog" },
        ...available.map((b) => ({ value: b.name, label: b.title, hint: b.description })),
      ],
    });
    if (p.isCancel(answer)) return cancel();
    block = available.find((b) => b.name === answer);
  }

  const pm = args.pm ?? detectPM();
  let install = args.install;
  if (install === undefined) {
    if (args.yes) install = true;
    else {
      const answer = await p.confirm({ message: `Install dependencies with ${pm}?`, initialValue: true });
      if (p.isCancel(answer)) return cancel();
      install = answer;
    }
  }

  const s = p.spinner();
  s.start("Scaffolding resource");
  const vars = { name, pm, registry: REGISTRY };
  copyDir(block ? path.join(BLOCKS, block.name) : TEMPLATE, dir, vars);
  pinVersions(path.join(dir, "web/package.json"));
  if (args.link) linkLocal(path.join(dir, "web/package.json"), args.link);
  s.stop(
    `Created ${pc.cyan(name + "/")} ${pc.dim(`${block ? `${block.title} · ` : ""}fxmanifest · client/*.lua · web/ (Vite, React, shadcn, Tailwind v4)`)}`,
  );

  if (install) {
    s.start(`Installing with ${pm}`);
    try {
      await run(pm, ["install"], path.join(dir, "web"));
      s.stop("Dependencies installed");
    } catch (e) {
      s.stop(pc.yellow("Install failed — run it yourself in web/"));
      p.log.warn(String((e as Error).message));
    }
  }

  const runCmd = pm === "npm" ? "npm run" : pm;
  const fill = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (vars as Record<string, string>)[k] ?? m);
  p.note(
    [
      `${pc.bold("Browser")}   cd ${name}/web && ${runCmd} dev`,
      `          ${pc.dim("devtools: press ` to fire Lua events and swap backdrops")}`,
      "",
      `${pc.bold("In game")}   copy ${name}/ into your resources, add ${pc.cyan("ensure nuikit")} then ${pc.cyan(`ensure ${name}`)}`,
      `          ${pc.dim(`while dev runs, saves hot-reload in game${block ? "" : " · open with F7"}`)}`,
      ...(block?.next ?? []).map((line) => `          ${pc.dim(fill(line))}`),
      "",
      `${pc.bold("Add UI")}    npx shadcn add dialog @nuikit/speedometer`,
    ].join("\n"),
    "Next",
  );
  p.outro(`${pc.magenta("◆")} Star it if it saved you time → ${pc.underline("github.com/belibathan/nuikit")}`);
}

/** The template's nuikit packages at this release (the file in the repo can lag behind it). */
function pinVersions(pkgPath: string) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkg.dependencies?.["nuikit-core"]) pkg.dependencies["nuikit-core"] = `^${VERSION}`;
  if (pkg.devDependencies?.["vite-plugin-nuikit"]) pkg.devDependencies["vite-plugin-nuikit"] = `^${VERSION}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function linkLocal(pkgPath: string, repo: string) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.dependencies["nuikit-core"] = `link:${path.join(repo, "packages/core")}`;
  pkg.devDependencies["vite-plugin-nuikit"] = `link:${path.join(repo, "packages/vite")}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function cancel() {
  p.cancel("Cancelled.");
  process.exit(0);
}

main().catch((e) => {
  p.cancel(String(e?.message ?? e));
  process.exit(1);
});

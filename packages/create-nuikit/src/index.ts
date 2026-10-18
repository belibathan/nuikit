#!/usr/bin/env node
/**
 * create-nuikit — a FiveM NUI resource with shadcn, Tailwind v4, typed Lua↔JS and
 * browser devtools, in one command.
 *
 *   npm create nuikit@latest my-hud
 *   pnpm create nuikit my-hud --yes
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";

const REGISTRY = "https://nuikit.vercel.app";
const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../template");

type PM = "pnpm" | "npm" | "yarn" | "bun";

interface Args {
  name?: string;
  yes: boolean;
  install?: boolean;
  pm?: PM;
  /** contributors: link @nuikit/* to a local checkout */
  link?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-y" || a === "--yes") args.yes = true;
    else if (a === "--no-install") args.install = false;
    else if (a === "--install") args.install = true;
    else if (a === "--pm") args.pm = argv[++i] as PM;
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
    -y, --yes        accept defaults
    --pm <pm>        pnpm | npm | yarn | bun ${pc.dim("(default: the one you ran)")}
    --no-install     skip installing dependencies
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
  copyDir(TEMPLATE, dir, { name, pm, registry: REGISTRY });
  if (args.link) linkLocal(path.join(dir, "web/package.json"), args.link);
  s.stop(`Created ${pc.cyan(name + "/")} ${pc.dim("fxmanifest · client/*.lua · web/ (Vite, React, shadcn, Tailwind v4)")}`);

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
  p.note(
    [
      `${pc.bold("Browser")}   cd ${name}/web && ${runCmd} dev`,
      `          ${pc.dim("devtools: press ` to fire Lua events and swap backdrops")}`,
      "",
      `${pc.bold("In game")}   copy ${name}/ into your resources, add ${pc.cyan(`ensure ${name}`)}`,
      `          ${pc.dim("while dev runs, saves hot-reload in game · open with F7")}`,
      "",
      `${pc.bold("Add UI")}    npx shadcn add dialog @nuikit/speedometer`,
    ].join("\n"),
    "Next",
  );
  p.outro(`${pc.magenta("◆")} Star it if it saved you time → ${pc.underline("github.com/belibathan/nuikit")}`);
}

function linkLocal(pkgPath: string, repo: string) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.dependencies["@nuikit/core"] = `link:${path.join(repo, "packages/core")}`;
  pkg.devDependencies["@nuikit/vite"] = `link:${path.join(repo, "packages/vite")}`;
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

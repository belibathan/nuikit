// Dev server for the slab specimen: Vite + Tailwind borrowed from a shipped system (nuikit_death), so the
// page gets the same synced index.css and nuikit-core every UI does. Used by ../shots.mjs.
//   node bench/identity/specimen/serve.mjs --port=5899
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const app = path.join(repo, "systems/nuikit_death/web");
const req = createRequire(path.join(app, "package.json"));
const load = async (name) => import(pathToFileURL(req.resolve(name)).href);

const { createServer } = await load("vite");
const { default: tailwindcss } = await load("@tailwindcss/vite");
const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 5899);

const server = await createServer({
  configFile: false,
  root: here,
  plugins: [tailwindcss()],
  resolve: { alias: { "nuikit-core": path.join(app, "node_modules/nuikit-core") } },
  server: { port, strictPort: true, host: "127.0.0.1", fs: { allow: [repo] } },
  logLevel: "info",
});
await server.listen();
server.printUrls();
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

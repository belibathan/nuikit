// Writes the published token files from the built compiler (run after tsup):
//   tokens/nuikit.tokens.json        the default theme (stock shadcn neutral, dark) as DTCG 2025.10
//   tokens/nuikit-theme.schema.json  JSON Schema for a compiled theme (theme.json / GlobalState)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTheme, NEUTRAL, themeJsonSchema, toDtcg } from "../dist/index.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tokens");
fs.mkdirSync(dir, { recursive: true });
const stock = compileTheme({ ...NEUTRAL.dark });
const write = (name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
write("nuikit.tokens.json", toDtcg(stock, "nuikit default theme (stock shadcn neutral)"));
write("nuikit-theme.schema.json", themeJsonSchema());
console.log("✓ tokens/nuikit.tokens.json, tokens/nuikit-theme.schema.json");

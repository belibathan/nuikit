// Emits compact per-collection rows (out/data-*.json) from out/vars.json for populate.js inside use_figma.
// Emits compact per-collection use_figma scripts from vars.json
import { readFileSync, writeFileSync } from "node:fs";
const scratch = new URL("./out", import.meta.url).pathname;
const spec = JSON.parse(readFileSync(`${scratch}/vars.json`, "utf8"));
const hex = (c) => "#" + [c.r, c.g, c.b, c.a].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
const SC = { '["FRAME_FILL","SHAPE_FILL"]': "F", '["TEXT_FILL"]': "T", '["STROKE_COLOR"]': "S", '["ALL_FILLS","STROKE_COLOR","EFFECT_COLOR"]': "A", '["WIDTH_HEIGHT","GAP"]': "L", '["CORNER_RADIUS"]': "R", '["FONT_SIZE"]': "Z", '["LETTER_SPACING"]': "K", '["FONT_FAMILY"]': "P", '["FONT_STYLE"]': "Y", "[]": "H", '["STROKE_FLOAT"]': "W", '["OPACITY"]': "O", '["EFFECT_COLOR"]': "E", '["EFFECT_FLOAT"]': "G", '["GAP"]': "N", '["GAP","WIDTH_HEIGHT"]': "L" };
const MODES = ["default", "neon-pop", "flat", "square"];
function compact(v, modes) {
  const sc = SC[JSON.stringify(v.scopes)];
  if (!sc) throw new Error("scope " + JSON.stringify(v.scopes));
  const row = [v.name, v.type[0], sc, v.code || "", v.desc];
  if (v.alias) row.push({ a: v.alias });
  else row.push(modes.map((m) => (v.type === "COLOR" ? hex(v.v[m]) : typeof v.v[m] === "number" ? Math.round(v.v[m] * 1000) / 1000 : v.v[m])));
  return row;
}
const byCol = { identity: [], semantic: [], component: [] };
for (const v of spec.vars) byCol[v.col].push(v);
const main = (col, modes) => JSON.stringify(byCol[col].map((v) => compact(v, modes)));
const outs = {
  identity: main("identity", MODES.slice(0, 4)),
  semantic: main("semantic", MODES.slice(0, 4)),
  component: main("component", MODES.slice(0, 4)),
};
for (const k in outs) { writeFileSync(`${scratch}/data-${k}.json`, outs[k]); console.log(k, outs[k].length); }
writeFileSync(`${scratch}/fonts.json`, JSON.stringify(spec.fonts));
console.log("fonts", JSON.stringify(spec.fonts).length);

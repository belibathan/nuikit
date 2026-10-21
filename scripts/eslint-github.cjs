// ESLint formatter: one line per problem, as a GitHub Actions annotation in CI and plain text elsewhere.
// Used by `pnpm lint:classes` (eslint.config.js).
const path = require("node:path");

module.exports = (results) => {
  const ci = !!process.env.GITHUB_ACTIONS;
  const lines = [];
  let count = 0;
  for (const r of results) {
    const file = path.relative(process.cwd(), r.filePath);
    for (const m of r.messages) {
      count++;
      const level = m.severity === 2 ? "error" : "warning";
      const text = `${m.message} (${m.ruleId ?? "eslint"})`;
      lines.push(ci ? `::${level} file=${file},line=${m.line},col=${m.column}::${text}` : `${file}:${m.line}:${m.column} ${level} ${text}`);
    }
  }
  lines.push(count ? `${count} class lint finding${count === 1 ? "" : "s"} (warnings: they don't fail the build)` : "class lint: clean");
  return lines.join("\n");
};

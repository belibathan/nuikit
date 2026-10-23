/**
 * The theme compiler and the doctor as one plain script for FXServer's JS runtime
 * (systems/nuikit/server/compiler.js, copied there by `pnpm sync`). It sets globalThis.NuikitTheme;
 * server/main.js and server/doctor.js use it.
 */
export { checkContrast, compileTheme, themeToCss, toDtcg, TOKEN_NAMES, TOKENS_VERSION } from "./tokens";
export { ADAPTER_PACKS, compareVersions, detectFramework, doctor, formatDoctor, pageHash } from "./doctor";
export { bytesHash, formatInstall, overrideOutdated, planInstall, planUninstall } from "./install";

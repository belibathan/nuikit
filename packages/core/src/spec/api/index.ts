// The arsenal spec: every domain of nuikit's public API (types.ts says the shape, naming.ts the rule).
// Order is the order of /kit and arsenal.json: the wire, services, context, layout, tooling.
import camera from "./camera";
import controls from "./controls";
import devtools from "./devtools";
import doctor from "./doctor";
import host from "./host";
import images from "./images";
import intents from "./intents";
import keys from "./keys";
import messages from "./messages";
import motion from "./motion";
import player from "./player";
import radar from "./radar";
import settings from "./settings";
import slots from "./slots";
import surfaces from "./surfaces";
import theme from "./theme";
import zones from "./zones";
import layout from "./layout";
import type { DomainSpec } from "./types";

<<<<<<< HEAD
export const DOMAINS: DomainSpec[] = [messages, surfaces, intents, camera, controls, keys, settings, player, theme, images, zones, slots, motion, layout, host, devtools, doctor];
=======
export const DOMAINS: DomainSpec[] = [messages, surfaces, intents, camera, controls, keys, settings, player, theme, images, zones, slots, radar, motion, host, devtools, doctor];
>>>>>>> 4a609ca633a93d127f3645ceef274aa162725cf9
export { checkDomain, checkSpec } from "./naming";
export type * from "./types";

/** Exports that are not part of the arsenal, with the reason. Everything else must be in a domain. */
export const INTERNAL: Record<string, string> = {
  __reset: "tests",
  __resetIntentStore: "tests",
  INTENT_DEFS: "the generated schema the validator reads",
  INTENT_META: "the generated schema the validator reads",
  INTENT_VERSIONS: "the generated schema the validator reads",
  rendererContext: "the frame builds a renderer's context",
  setVisible: "tests and devtools drive visibility",
  default: "devtools' default export (NuiDevtools)",
};

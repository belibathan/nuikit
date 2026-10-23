// The arsenal spec: every domain of nuikit's public API (types.ts says the shape, naming.ts the rule).
// Order is the order of /kit and arsenal.json.
import intents from "./intents";
import surfaces from "./surfaces";
import type { DomainSpec } from "./types";

export const DOMAINS: DomainSpec[] = [surfaces, intents];
export { checkDomain, checkSpec } from "./naming";
export type * from "./types";

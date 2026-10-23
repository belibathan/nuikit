import type { DomainSpec } from "./types";

const J = "js only: motion is the page's (WAAPI)";
/** Motion: springs, FLIP and timed runs on WAAPI, read from the theme's motion tokens. */
export default {
  js: "motion",
  lua: "motion",
  title: "Motion",
  doc: "Springs, FLIP, stagger and timed runs from the theme's motion tokens; reduced motion respected.",
  docs: "docs/tokens.md#motion",
  entries: [
    { name: "spring", kind: "call", doc: "Spring an element's channel to a value (retargets mid-flight).", js: "spring", also: ["retarget"], only: J, since: "0.7.0" },
    { name: "flip", kind: "call", doc: "Animate a layout change from where things were.", js: "flip", also: ["flipFrom"], only: J, since: "0.7.0" },
    { name: "timed", kind: "call", doc: "A keyframe run that joins a clock (startedAt).", js: "timed", only: J, since: "0.7.0" },
    { name: "stagger", kind: "call", doc: "The delay of item i from --nk-stagger.", js: "stagger", only: J, since: "0.7.0" },
    { name: "indicator", kind: "call", doc: "A selection indicator that springs between rows.", js: "indicator", only: J, since: "0.7.0" },
    { name: "level", kind: "call", doc: "on, reduced or off for an element.", js: "motionLevel", only: J, since: "0.7.0" },
    { name: "springOf", kind: "call", doc: "A preset or token as a spring.", js: "springOf", also: ["parseSpring", "solveSpring", "springValues"], only: J, since: "0.7.0" },
    { name: "token", kind: "call", doc: "A motion token's value (ms).", js: "token", also: ["tokenMs", "valueOf"], only: J, since: "0.7.0" },
    { name: "useSpring", kind: "hook", doc: "Spring a ref to a value.", js: "useSpring", only: "js only: React", since: "0.7.0" },
    { name: "useFlip", kind: "hook", doc: "FLIP a ref when deps change.", js: "useFlip", only: "js only: React", since: "0.7.0" },
    { name: "useIndicator", kind: "hook", doc: "The selection indicator.", js: "useIndicator", only: "js only: React", since: "0.7.0" },
    { name: "Stagger", kind: "component", doc: "Children enter one after another.", js: "Stagger", also: ["StaggerGroup", "useStaggerGroup", "useStaggerItem"], only: "js only: React", since: "0.7.0" },
    { name: "installPressFeel", kind: "call", doc: "The press feel on every button (once).", js: "installPressFeel", only: J, since: "0.7.0" },
  ],
  rules: ["transform only (never individual scale/translate); reduced motion ends at the final state."],
} satisfies DomainSpec;

// The default renderers, one per intent (docs/intents.md §5). Each is a module in the host's format
// (defineReactRenderer → mount(el, ctx)); a resource can later replace one with `nuikit_renderer`.
import type { IntentKind, RendererDefinition } from "nuikit-core/intents";
import challenge from "./challenge";
import confirm from "./confirm";
import input from "./input";
import menu from "./menu";
import notify from "./notify";
import progress from "./progress";
import prompt from "./prompt";
import radial from "./radial";
import target from "./target";

export const renderers: Record<IntentKind, RendererDefinition> = {
  notify: notify as RendererDefinition,
  menu: menu as RendererDefinition,
  input: input as RendererDefinition,
  confirm: confirm as RendererDefinition,
  progress: progress as RendererDefinition,
  prompt: prompt as RendererDefinition,
  target: target as RendererDefinition,
  radial: radial as RendererDefinition,
  challenge: challenge as RendererDefinition,
};

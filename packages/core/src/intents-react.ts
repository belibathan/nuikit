/**
 * nuikit-core/intents-react: a renderer written in React (docs/intents.md §5).
 *
 *   export default defineReactRenderer({ kind: "notify", Component: NotifyRenderer });
 */
import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { defineRenderer, type IntentInstance, type IntentKind, type RendererContext, type RendererDefinition } from "./intents";

/** Props the React renderer component receives. */
export interface RendererProps<K extends IntentKind = IntentKind> {
  intents: IntentInstance<K>[];
  ctx: RendererContext<K>;
}

/** A React renderer: one root per renderer, re-rendered with the open intents of its kind. */
export function defineReactRenderer<K extends IntentKind>({
  kind,
  Component,
  css,
  version,
}: {
  kind: K;
  Component: ComponentType<RendererProps<K>>;
  css?: string;
  version?: number;
}): RendererDefinition<K> {
  return defineRenderer<K>({
    kind,
    css,
    version,
    mount(el, ctx) {
      const root: Root = createRoot(el);
      const render = () => root.render(createElement(Component, { intents: ctx.intents(), ctx }));
      const off = ctx.subscribe(render);
      render();
      return () => {
        off();
        root.unmount();
      };
    },
  });
}


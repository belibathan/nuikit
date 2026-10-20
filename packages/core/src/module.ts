/**
 * nuikit-core/module: ship a UI as a module the nuikit host can mount (docs/host.md), and as a
 * normal ui_page from the same source.
 *
 *   // src/module.tsx, built with nuikitModule() into web/dist/module.js
 *   import css from "virtual:nuikit-module-css";
 *   import App from "./App";
 *   export default defineReactModule({ App, css });
 *
 * A module is plain data plus mount(): the host gives it an element inside the resource's
 * isolated container, and a portal element for overlays (dialogs, popovers, toasts).
 * fetchNui/onNui inside it need no changes: nuikit-core detects the host's context.
 */
import { Component, StrictMode, createElement, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

export interface ModuleContext {
  /** The owning resource. */
  resource: string;
  /** True when mounted by the nuikit host; false on the resource's own ui_page. */
  hosted: boolean;
  /** Where overlays render. The host redirects React portals aimed at document.body here. */
  portal: HTMLElement;
  /** Tell the host (and the server console) that the module failed. */
  reportError(error: unknown): void;
}

export interface ModuleDefinition {
  /** The module's stylesheet (Tailwind output). The host scopes it to this module. */
  css?: string;
  /** Render into `el`. Return a cleanup function; the host calls it on resource stop. */
  mount(el: HTMLElement, ctx: ModuleContext): void | (() => void);
}

/** Declare a framework-agnostic module (Vue, Svelte or plain DOM mount the same way). */
export function defineModule(def: ModuleDefinition): ModuleDefinition {
  if (!def || typeof def.mount !== "function") throw new Error("[nuikit] defineModule needs a mount(el, ctx) function");
  return def;
}

class ModuleBoundary extends Component<{ children: ReactNode; onError: (e: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, _info: ErrorInfo) {
    this.props.onError(error);
  }
  render() {
    // A broken UI renders nothing rather than a half-drawn screen over the game.
    return this.state.failed ? null : this.props.children;
  }
}

export interface ReactModuleOptions {
  App: ComponentType;
  css?: string;
  /** Wrap in <StrictMode>. Default true. */
  strict?: boolean;
}

/** A React module: one root per module, wrapped in an error boundary. */
export function defineReactModule({ App, css, strict = true }: ReactModuleOptions): ModuleDefinition {
  return defineModule({
    css,
    mount(el, ctx) {
      const root: Root = createRoot(el);
      const tree = createElement(ModuleBoundary, { onError: ctx.reportError, children: createElement(App) });
      root.render(strict ? createElement(StrictMode, null, tree) : tree);
      return () => root.unmount();
    },
  });
}

/** Mount a module on the resource's own page (the ui_page fallback when the host isn't running). */
export function mountStandalone(def: ModuleDefinition, el: HTMLElement = document.getElementById("root") ?? document.body): () => void {
  const cleanup = def.mount(el, {
    resource: typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "nuikit",
    hosted: false,
    portal: document.body,
    reportError: (e) => console.error("[nuikit]", e),
  });
  return typeof cleanup === "function" ? cleanup : () => {};
}

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
import { Component, StrictMode, createElement, useEffect, type ComponentType, type ErrorInfo, type ReactNode } from "react";
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
  /**
   * The module's listeners (onNui) are attached: deliver the messages the host held back. Only
   * modules that declare `ready: "signal"` call it (defineReactModule does, after the first
   * commit's effects); for the others the host calls it itself when mount() returns.
   */
  ready(): void;
}

export interface ModuleDefinition {
  /** The module's stylesheet (Tailwind output). The host scopes it to this module. */
  css?: string;
  /** Render into `el`. Return a cleanup function; the host calls it on resource stop. */
  mount(el: HTMLElement, ctx: ModuleContext): void | (() => void);
  /**
   * When the module is listening. "mount" (default): as soon as mount() returns (a plain DOM
   * module subscribes synchronously). "signal": the module calls ctx.ready() itself, for
   * frameworks that attach listeners later (React effects run a tick after render); until then the
   * host holds its messages, so nothing sent in that gap is lost.
   */
  ready?: "mount" | "signal";
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

/**
 * Runs `onReady` once the first commit's effects have run. React fires effects children first, so
 * by the time this parent's effect runs every onNui() in the App's own effects is attached.
 */
function Ready({ onReady, children }: { onReady: () => void; children: ReactNode }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return children;
}

/** A React module: one root per module, wrapped in an error boundary. */
export function defineReactModule({ App, css, strict = true }: ReactModuleOptions): ModuleDefinition {
  return defineModule({
    css,
    ready: "signal",
    mount(el, ctx) {
      const root: Root = createRoot(el);
      const boundary = createElement(ModuleBoundary, { onError: ctx.reportError, children: createElement(App) });
      const tree = createElement(Ready, { onReady: ctx.ready, children: boundary });
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
    ready: () => {},
  });
  return typeof cleanup === "function" ? cleanup : () => {};
}

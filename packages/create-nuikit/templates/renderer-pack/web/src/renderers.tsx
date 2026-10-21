// The pack's entry (web/dist/renderers.js, built by vite.module.config.ts): one renderer per intent
// the fxmanifest claims with `nuikit_renderer '<kind>'`. nuikit's frame picks the renderer for each
// kind from this default export, mounts it with the open intents of that kind, and keeps the
// default when a kind is missing here (F8 says so).
import css from "virtual:nuikit-module-css";
import { defineReactRenderer } from "nuikit-core/intents-react";
import { NotifyRenderer } from "./renderers/notify";
import "./index.css";

export default {
  notify: defineReactRenderer({ kind: "notify", Component: NotifyRenderer, css, version: 1 }),
  // menu: defineReactRenderer({ kind: "menu", Component: MenuRenderer, css }),
};

// The HUD as a nuikit host module (fxmanifest: nuikit_ui 'web/dist/module.js'). Same App, same
// CSS; the host provides React, the theme and the frame. Built by vite.module.config.ts.
import css from "virtual:nuikit-module-css";
import { defineReactModule } from "nuikit-core/module";
import App from "./App";
import "./index.css";

export default defineReactModule({ App, css });

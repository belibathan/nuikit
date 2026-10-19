// ui_page entry. When the nuikit host renders this resource (web/dist/module.js), this page
// stays empty and loads nothing else; otherwise it loads the HUD (standalone.tsx).
import { standalone } from "nuikit-core/boot";

standalone(() => import("./standalone"));

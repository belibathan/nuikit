/** Surfaces: panel (every floating surface), and the components that compose it. */
import { alpha, color, css, length, pal, ref, shadow, string, type ComponentDef } from "../lang";

export const panel: ComponentDef = {
  description: "Every floating surface: menus, inventories, dialogs (the nk-panel utility)",
  anatomy: ["header", "icon", "title", "description", "actions", "body", "footer"],
  levers: {
    bg: color(css`rgba(${pal("surface", "rgb")}, calc(${pal("surface", "a")} * ${ref("alpha.menu")}))`, "The panel's fill: the surface at the menu material's alpha", { was: ["nk-panel-bg"] }),
    fg: color(pal("popover-foreground"), "Text in the panel", { was: ["nk-panel-fg"] }),
    border: color(ref("plate.hair"), "The panel's hairline", { was: ["nk-panel-border"] }),
    radius: length(ref("radius.surface"), "The panel's radius", { was: ["nk-panel-radius"] }),
    blur: length(ref("material.menu.blur"), "Backdrop blur (with surface.backdrop on)", { was: ["nk-panel-blur"] }),
    cut: length(ref("shape.cut"), "The chamfer's size", { was: ["nk-panel-cut"] }),
    clip: string(ref("line.clip"), "The panel's clip-path", { was: ["nk-panel-clip"] }),
    gradient: string(css`linear-gradient(180deg, rgba(${pal("popover-foreground", "rgb")}, ${ref("surface.gradient")}), rgba(${pal("popover-foreground", "rgb")}, 0) 60%)`, "The light falloff", { was: ["nk-panel-gradient"] }),
    edge: shadow(css`inset 0 1px 0 0 rgba(${pal("popover-foreground", "rgb")}, ${ref("material.menu.edge")})`, "The machined top edge", { was: ["nk-panel-edge"] }),
    shadow: shadow(ref("depth.elevation"), "The panel's drop: the elevation recipe", { was: ["nk-panel-shadow"] }),
    divider: string(css`${ref("line.width")} solid ${ref("panel.border")}`, "The one hairline under a header", { was: ["nk-panel-divider"] }),
    width: length("20rem", "Width (md)", { floor: true, was: ["nk-panel-w"] }),
    "width-sm": length("18rem", "Width (sm)", { floor: true, was: ["nk-panel-w-sm"] }),
    "width-lg": length("24rem", "Width (lg)", { floor: true, was: ["nk-panel-w-lg"] }),
  },
  state: {
    backdrop: { type: "string", description: "A surface's backdrop-filter (drawn only with surface.backdrop on); registered with @property", was: ["nk-backdrop-filter"] },
  },
  parts: {
    header: {
      height: length(css`calc(3.25rem * ${ref("density")})`, "A header's minimum height", { was: ["nk-panel-header-height"] }),
      padding: string(css`${ref("gap.surface")} ${ref("gap.surface")} ${ref("space.4")}`, "Surface padding; the title a step off its hairline", { was: ["nk-panel-header-padding"] }),
    },
    body: {
      padding: string(ref("space.3"), "The body's padding", { was: ["nk-panel-body-padding"] }),
    },
    footer: {
      padding: string(css`${ref("space.4")} ${ref("gap.surface")} ${ref("gap.surface")}`, "On the panel itself, no rule above it", { was: ["nk-panel-footer-padding"] }),
      rule: string("none", "A rule above the footer (none: spacing separates it)", { floor: true, was: ["nk-panel-footer-rule"] }),
    },
    actions: {
      bracket: length("0px", "L-shaped corner marks (0 = off)", { floor: true, was: ["nk-panel-bracket"] }),
      "bracket-width": length(css`calc(${ref("line.width")} * 2)`, "The marks' weight", { was: ["nk-panel-bracket-width"] }),
      "bracket-color": color(pal("brand"), "The marks' colour", { was: ["nk-panel-bracket-color"] }),
    },
  },
};

export const edgeSheet: ComponentDef = {
  description: "A full-height sheet against a screen edge",
  inherits: ["panel"],
  anatomy: ["column", "header", "actions", "edge", "body", "footer"],
  parts: { header: { height: length("2rem", "The header's minimum height", { floor: true, was: ["nk-edge-sheet-header-h"] }) } },
};

export const confirm: ComponentDef = {
  description: "A confirmation dialog",
  inherits: ["panel"],
  anatomy: ["scrim", "root", "icon", "description", "cancel", "action"],
  levers: {
    width: length("24rem", "Width (md)", { floor: true, was: ["nk-confirm-w"] }),
    "width-sm": length("20rem", "Width (sm)", { floor: true, was: ["nk-confirm-w-sm"] }),
    "width-lg": length("28rem", "Width (lg)", { floor: true }),
  },
};

export const notice: ComponentDef = {
  description: "A notice / toast: a Glyph icon, a title, a description, a time line",
  inherits: ["control", "panel"],
  anatomy: ["stack", "item", "icon", "item-glyph", "title", "description", "item-name", "item-delta", "time"],
  levers: {
    width: length("20rem", "Width (md)", { floor: true, was: ["nk-notice-w"] }),
    "width-sm": length("18rem", "Width (sm)", { floor: true, was: ["nk-notice-w-sm"] }),
    "width-lg": length("24rem", "Width (lg)", { floor: true, was: ["nk-notice-w-lg"] }),
  },
  state: {
    "tone-rgb": { type: "string", description: "The notice's tone channels", was: ["nk-notice-tone-rgb"] },
    delay: { type: "time", description: "The item's stagger delay", was: ["nk-stagger-delay"] },
  },
};

void alpha;

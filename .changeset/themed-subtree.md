---
"nuikit-core": patch
"create-nuikit": patch
---

A theme painted on a subtree (`applyTheme(theme, element)`: a preview stage, a host module) now shows its whole identity: `applyTheme` marks the element `data-nk-theme` and kit.css re-declares its component tokens there, so density, radii, the HUD plate and the rest derive from that theme instead of what `<html>` resolved.

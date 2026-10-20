---
"create-nuikit": patch
---

Existing blocks on the new components: death-screen's clock is the kit's Countdown and its keys are KeyPrompts (the respawn hold fills the prompt's own line), pause-menu's Disconnect asks with the kit's Confirm (Escape closes the confirm first, then the menu), settings' sliders are form-field's SliderField (still sending once, when let go), and the demo template's "Open menu" hint is a KeyPrompt. What each sends to Lua is unchanged.

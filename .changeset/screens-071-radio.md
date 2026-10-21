---
"nuikit-mm-radio-ui": patch
---

mm_radio override rebuilt on the kit's components: the handheld is a `panel` (clock, signal or jammed, battery and the street in its header; a notify message takes the header's second line), the joined frequency is a display `stat`, favourite and recent channels are `menu-row`s, members are rows with a mute button, settings are `form-field` rows (switches, sliders that post on release, the call sign), empty and no-charge screens are `empty-state`s, and who's talking in the overlay are `hud-chip`s (active while talking). The nav keeps icon-over-label buttons that no longer clip. Every POST (all 16 callbacks, the keypad limit, Escape → `hideUI`) is unchanged, checked with `bench/screens/mm_radio`. One new locale key: `ui.nuikit_no_charge_hint`.

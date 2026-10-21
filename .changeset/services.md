---
"nuikit-core": minor
---

Services: `nk.camera` and `nk.controls` (`docs/services.md`), the runtime's shared camera and controls next to surfaces. `nk.camera.claim(opts)` takes the screen with a scripted camera started on the current view (or placed around a target entity or point with `offset`, `look`, `fov`, `duration`, `lockHeading`); claims stack client-wide, a claim on top suspends the one below, `release` resumes it or blends back to the gameplay camera, and a resource stopping or the player going down releases everything. `nk.controls.disable(set)` disables presets (`'all'`, `'movement'`, `'look'`, `'weapons'`, `'vehicle'`, `'frontend'`) and control ids as a union across sets, with one per-frame loop only while something is disabled; a surface can declare `controls` in its options and hold them while open. Both load with `@nuikit/init.lua`; the pause menu's camera module is now a thin shim over `nk.camera`.

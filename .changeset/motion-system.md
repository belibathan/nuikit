---
"nuikit-core": minor
"create-nuikit": minor
"nuikit-ox-lib-ui": patch
---

Motion system (design v2 §5A, tokens 1.2). `compileTheme` derives a motion ladder from `--nk-duration` (`--nk-time-press` / `-hover` / `-base` / `-exit` / `-move` / `-modal` / `-screen` / `-ambient`, `--nk-stagger` and its cap), five easings and four springs (`--nk-spring-snap` / `-move` / `-soft` / `-pop`), from two new identity inputs, `--nk-motion-feel` (crisp, snap, smooth, stepped) and `--nk-spring-bounce`. Graphite is crisp, Signal snaps, Velvet glides with a slight bounce, Vector steps. Additive.

Reduced motion now has two levels: a theme's `--nk-motion: 0` is off (as before), and the player's `reducedMotion` pref is "reduced" (`data-nk-motion="reduced"`): no movement, fades kept at most 100 ms. New `--nk-motion-move`. The prefs message is unchanged.

New `nuikit-core/motion` entry (no dependencies, about 2 kB): springs sampled into Web Animations keyframes, retargeting with velocity, FLIP, timed runs, the selection indicator's key-repeat rule; `useSpring`, `useFlip` and `useIndicator` in `nuikit-core/react`.

Kit: no text selection or image drag outside fields, themed scrollbars, selection, caret and placeholder; `nk-pop`, `nk-rise`, `nk-press`, `nk-stagger`, `nk-skeleton`, `nk-blink` and `nk-indicator`; keyboard and controller state (rows, tabs, toggles, focus) changes instantly. Components: `meter` and `progress-ring` timed runs and the `skill-check` needle are each one compositor animation (no per-frame JS or React renders); meter segments scale instead of resizing, and a critical meter blinks twice instead of pulsing forever. ox_lib's progress and skill check keep every request and timing.

---
---

Registry: `meter` gains status tones (`success`, `warning`, `info`), a `color` prop for a library's own colour, `meterColor()` (Mantine names as ox_lib sends them, like `green` or `red.6`, map to theme tones; CSS colours pass through), and a timed mode (`duration` + `onComplete`, fired from a timer, so it finishes with motion off). Bars now report `aria-valuenow`. `value` is optional (it is ignored when timed). Existing props behave as before. No package changes.

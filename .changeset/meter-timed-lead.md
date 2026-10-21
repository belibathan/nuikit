---
---

Registry: `meter` and `progress-ring` timed runs no longer trail real time by a step. Each 100ms step glides onto the value it will have at the next tick (`timedStep()` / `ringStep()`, exported), in the time until then, so the fill is on the true value at each tick and full exactly at `duration`. With motion off it draws the true value (never ahead), and the completion timer draws it full before `onComplete`. Text and aria keep the true value. No package changes.

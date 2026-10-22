---
"create-nuikit": minor
---

`notice` queue policy: `useNotices({ policy, max, queue, hurry })` (and `<NuiNotices>`): `stack` (default, as before) or `one` at a time per position, a capped queue of waiting notices (the oldest waiting goes past it), and a shorter dwell (`hurry`, 0.5) for shown notices while others wait. `waiting` counts the queued.

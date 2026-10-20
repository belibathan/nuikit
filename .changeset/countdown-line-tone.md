---
---

Registry: `countdown` gets `lineTone` (`neutral` default, `primary`, `warning`, `destructive`, the theme tokens), so a caller can colour the line from the start: a last stand drains in destructive, not only from `warnAt`. `warnTone` still takes over once `warnAt` is reached. `countdownLineTone()` is exported. No package changes.

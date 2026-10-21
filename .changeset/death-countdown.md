---
"nuikit-death-web": patch
---

nuikit_death: the big timer is the kit's `countdown` (hero size) instead of its own clock, label and bar. It reads the same: mm:ss, the label under it, and a line that drains. In the last 30 s of last stand it turns red and pulses, and it dims at 00:00. The bleed-out line stays red for the whole of last stand, as before (`countdown`'s `lineTone="destructive"`).

---
"nuikit-core": patch
---

`motionLevel(el)` takes an optional element and reads the nearest `[data-nk-motion]` from it up (a theme painted on a subtree), falling back to `<html>`, like kit.css's identity keywords. `countdown` and `notice`'s time line honour motion off on any ancestor.

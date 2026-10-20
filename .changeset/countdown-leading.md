---
---

Registry: `countdown` keeps `leading-none` at every size. tailwind-merge treated each size's font size as overriding the base line-height, so the clock had a tall line box and its label sat too low (about 60px at the 128px hero size). No package changes.

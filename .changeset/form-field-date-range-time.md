---
---

Registry: `form-field` gains `DateRangeField` and `TimeField`, ox_lib's input `date-range` and `time` rows. Values are in ox_lib's shapes (`[startMs, endMs]` at local midnight; epoch ms of today at the picked time), with typed day/month/year and hour/minute boxes (12h with AM/PM, or 24h) and no native pickers. min/max, required, an order check for ranges, `validateField()` support, and converters (`dateToEpoch`, `epochToDate`, `timeToEpoch`, `epochToTime`). No package changes.

---
"nuikit-ox-lib-ui": patch
---

ox_lib override: the input dialog's `date-range` and `time` rows use the kit's `form-field` presets (`DateRangeField`, `TimeField`): typed day/month/year and hour/minute boxes with arrow-key steps, in the order of the row's `format`. `time` shows 12-hour with AM/PM unless the row says `format = '24'`, as in ox_lib. A typed range outside `min`/`max`, or ending before it starts, gets a one-sentence error. The `date` row keeps its year picker. What Lua receives is unchanged.

---
"nuikit-ox-lib-ui": patch
---

ox_lib override, input dialog:

- **Decimal numbers no longer block the dialog.** A number that didn't fit the field's step (for example 12.345 with `precision: 2`) stopped the dialog from submitting, with no message. It now submits rounded to `precision`, as ox_lib does.
- **An untouched `select` returns `null`.** It used to return `""`.
- **Dates outside a field's `min` or `max` can't be submitted.** The dialog now checks them on submit.
- **The date field reaches any year quickly.** Click the calendar header to jump from the month to a page of years, and again to decades. You can also type the date as `YYYY-MM-DD`. Years and dates outside `min`/`max` are disabled, and with no default it opens on `max` when that is in the past (Qbox birth dates).

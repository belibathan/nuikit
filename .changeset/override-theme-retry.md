---
"nuikit-core": patch
---

`loadServerTheme` keeps asking the `nuikit` resource for the server theme when its first ask fails (override pages such as ox_lib start before `nuikit`), and the server's theme replaces the `nuikit/theme.css` stand-in when it answers. Before, such a page kept the client's cached `theme.css` (the theme from when `nuikit` last started) and never repainted on `nuikit theme reload`.

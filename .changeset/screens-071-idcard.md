---
"qbx-idcard-web": patch
---

qbx_idcard override rebuilt on the kit's components: the card is a `player-card` (mugshot, name, the card type and the issuing place, then citizen ID, date of birth, sex and nationality as stats), the close key is a `key-prompt` under it, and the job grade beside the badge is a `hud-chip`. The card type's colour from `config/shared.lua` still marks the top edge. The flag image is no longer drawn. What the page posts (`closeIdCard` on the close key, even with no card showing, and after `autoClose`) is unchanged (`bench/screens/qbx_idcard`).

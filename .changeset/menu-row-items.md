---
---

Registry: `menu-row` carries the rest of the `menu` intent's items: `image` (a thumbnail instead of the icon), `progress` (a slim bar under the label), `readOnly` (shown, not used), `inert` (hover changes nothing, because CEF keeps :hover after Lua takes focus), `valueTone="muted"` for stepper values, and `MenuRowDetails` with `menuMetadata()` for the image-and-metadata card beside a hovered row. Existing props behave as before. No package changes.

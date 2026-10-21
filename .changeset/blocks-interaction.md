---
"create-nuikit": minor
---

An interaction block: `npm create nuikit@latest my-interaction -- -t interaction` gives a target eye (hold Left Alt, aim, and the options of what you aim at show; click for the cursor, or scroll and click) and "[E] Open the fridge" key prompts near places, with press or hold. Lua does the raycast and reads the keys; options and points marked `server = true` are checked again on the server (the option fits what was aimed at, the player is within reach by the server's own position, cooldowns). Also in the registry (`…/r/interaction.json`) and on `/blocks`.

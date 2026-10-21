---
"create-nuikit": minor
---

A character-select block: `npm create nuikit@latest my-characters -- -t character-select` shows the player's characters at join (slots, a player card, Play, Delete with a confirm), where to spawn, and a create form. The server checks every choice: only the caller's own characters, only its own spawn points (it sends the coordinates), new characters with real names, an age of 18 to 100 and a listed gender in a free slot, deletes only from the character screen; last locations come from the server's own view of the player. It warns at start when a framework's own character screen is running. Also in the registry (`…/r/character-select.json`) and on `/blocks`.

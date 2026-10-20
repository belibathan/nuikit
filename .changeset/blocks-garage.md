---
"create-nuikit": minor
---

A garage block: `npm create nuikit@latest my-garage -- -t garage` lists your vehicles at a garage with fuel, engine and body, and takes them out, stores the one you're driving, or releases one from the impound, with a working standalone example (vehicles kept per player in a JSON file) and the lines to change for Qbox, QBCore or ESX. The server checks every request (your own vehicles only, at the garage, the vehicle read from the game), spawns and deletes vehicles itself so one can't come out twice, and refunds the impound fee if a release fails. Also in the registry (`…/r/garage.json`) and on `/blocks`.

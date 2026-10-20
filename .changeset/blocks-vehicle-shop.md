---
"create-nuikit": minor
---

A vehicle-shop block: `npm create nuikit@latest my-dealership -- -t vehicle-shop` gives a showroom with vehicles by category, a camera on a local preview car, stats, paint from swatches or any hex, test drives and buying with a confirm. The server keeps the prices, checks every purchase (the vehicle, the colour, the payment, the player at the showroom, one at a time), spawns the car itself with a unique plate, and refunds if the spawn or `Config.onBought` fails; test drives are spawned, timed and cleaned up by the server. Also in the registry (`…/r/vehicle-shop.json`) and on `/blocks`.

---
"create-nuikit": minor
---

A shop block: `npm create nuikit@latest my-shop -- -t shop` gives a catalogue by category with price and stock, a cart with steppers, cash or bank, and checkout with a confirm. The server keeps the prices and stock, checks every cart line and that the player is at the shop (OneSync), and moves money and items all or nothing (anything given is taken back and the money refunded if an item can't be carried); `Config.money` and `Config.items` hand them to Qbox, QBCore, ESX or ox_inventory. Also in the registry (`…/r/shop.json`) and on `/blocks`.

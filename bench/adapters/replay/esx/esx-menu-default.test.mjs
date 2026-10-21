// esx_menu_default → nuikit_esx_menu_default: docs/adapters/esx-menu-default.md "Replay test".
// ESX.UI.Menu.Open takes callbacks and returns a menu object, which a JSON recording can't express, so the
// calling script is Lua run on a caller resource against the es_extended mock (_es_extended.lua).
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { ESX_IMPORT as esxImport, intents, startAdapter, startEsx, startNk } from "./_nk.mjs";

describe("nuikit_esx_menu_default", () => {
  let client, nk, shop;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startEsx(client);
    await startAdapter(client, "[nuikit-esx]", "nuikit_esx_menu_default", { before: esxImport });
    shop = await client.start("esx_shop", { before: esxImport + `
      GOT = {}
      local function got(kind) return function(data, menu) GOT[#GOT + 1] = { kind, data.current and data.current.label, data.current and data.current.value } end end
      MENU = ESX.UI.Menu.Open('default', 'esx_shop', 'main', {
        title = 'Shop', align = 'top-left',
        elements = {
          { label = 'Bread', value = 'bread' },
          { label = 'Amount', type = 'slider', min = 1, max = 10, value = 3, name = 'amount' },
          { label = 'Colour', options = { 'Red', 'Green' }, value = 0 },
        },
      }, got('submit'), got('cancel'), got('change'))
    ` });
  });
  after(() => client.close());

  it("Open draws one keyboard menu; a slider move runs change with the new value; submit carries current and elements; methods update in place", async () => {
    const opens = () => intents(nk, "menu").filter((m) => m.op === "open");
    assert.equal(opens().length, 1);
    const p = opens()[0].props;
    assert.deepEqual([p.id, p.title, p.position, p.input], ["esx_shop:main", "Shop", "top-left", "keyboard"]);
    assert.deepEqual(p.items[1].values.slice(0, 3), ["1", "2", "3"]);
    assert.equal(p.items[1].defaultIndex, 3);
    assert.deepEqual([p.items[2].values, p.items[2].defaultIndex], [["Red", "Green"], 1]);

    await shop.run(`exports.nuikit:emit('menu', 'scroll', { index = 2, id = 'amount', value = 5 })`);
    await shop.run(`exports.nuikit:emit('menu', 'scroll', { index = 3, id = '3', value = 2 })`);
    await shop.run(`MENU.setTitle('Shop 2')`);
    await shop.run(`MENU.setElement(1, 'label', 'Baguette')`);
    assert.equal(opens().length, 1, "methods never reopen");
    const updates = intents(nk, "menu").filter((m) => m.op === "update");
    assert.equal(updates.length, 2);
    assert.equal(updates[1].props.items[0].label, "Baguette");

    await shop.run(`exports.nuikit:pick('menu', { index = 2, id = 'amount', value = 5, path = { 2 } })`);
    const got = Object.values(await shop.lua.global.get("GOT")).map((g) => Object.values(g));
    assert.deepEqual(got, [["change", "Amount", 5], ["change", "Colour", 1], ["submit", "Amount", 5]]);
    // The script didn't close in submit: es_extended still lists it, so it is drawn again.
    assert.equal(opens().length, 2);
    assert.equal(await shop.run(`return ESX.UI.Menu.IsOpen('default', 'esx_shop', 'main')`), true);
  });

  it("failure path: Escape runs cancel; a second menu stacks; CloseAll cancels both without callbacks and IsOpen is false", async () => {
    await shop.run(`ESX.UI.Menu.Open('default', 'esx_shop', 'sub', { title = 'Sub', elements = { { label = 'x' } } }, function() GOT[#GOT + 1] = { 'submit2' } end, function() GOT[#GOT + 1] = { 'cancel2' } end)`);
    assert.equal(await shop.run(`return exports.nuikit:count('menu')`), 2);
    await shop.run(`exports.nuikit:escape('menu')`);
    let got = Object.values(await shop.lua.global.get("GOT")).map((g) => Object.values(g)[0]);
    assert.equal(got.at(-1), "cancel2");
    await shop.run(`ESX.UI.Menu.CloseAll()`);
    assert.equal(await shop.run(`return exports.nuikit:count('menu')`), 0);
    assert.equal(await shop.run(`return ESX.UI.Menu.IsOpen('default', 'esx_shop', 'main')`), false);
    got = Object.values(await shop.lua.global.get("GOT")).map((g) => Object.values(g)[0]);
    assert.equal(got.length, 4, "CloseAll ran no submit/cancel");
  });
});

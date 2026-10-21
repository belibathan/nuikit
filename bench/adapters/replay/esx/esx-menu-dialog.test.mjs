// esx_menu_dialog → nuikit_esx_menu_dialog: docs/adapters/esx-menu-dialog.md "Replay test".
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { ESX_IMPORT as esxImport, intents, startAdapter, startEsx, startNk } from "./_nk.mjs";

describe("nuikit_esx_menu_dialog", () => {
  let client, nk, shop;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startEsx(client);
    await startAdapter(client, "[nuikit-esx]", "nuikit_esx_menu_default", { before: esxImport });
    await startAdapter(client, "[nuikit-esx]", "nuikit_esx_menu_dialog", { before: esxImport });
    shop = await client.start("esx_shop", { before: esxImport + `
      GOT = {}
      ESX.UI.Menu.Open('default', 'esx_shop', 'main', { title = 'Shop', elements = { { label = 'Bread' } } }, function() end, function() end)
      function dialog(name)
        ESX.UI.Menu.Open('dialog', 'esx_shop', name, { title = 'Amount' },
          function(data, menu) GOT[#GOT + 1] = 'submit ' .. name .. ' ' .. type(data.value) .. ' ' .. data.value menu.close() end,
          function(data, menu) GOT[#GOT + 1] = 'cancel ' .. name menu.close() end)
      end
      dialog('amount')
    ` });
  });
  after(() => client.close());

  const got = async () => Object.values(await shop.lua.global.get("GOT"));

  it("the dialog opens as a one-field input over the menu; submit gets data.value as a string", async () => {
    const open = intents(nk, "input").filter((m) => m.op === "open");
    assert.equal(open.length, 1);
    assert.deepEqual(open[0].props, { id: "esx_shop:amount", title: "Amount", fields: [{ id: "value", type: "text", required: false }] });
    assert.equal(await shop.run(`return exports.nuikit:count()`), 2); // the default menu stays under it
    await shop.run(`exports.nuikit:pick('input', { values = { '42' }, byId = { value = '42' } })`);
    assert.deepEqual(await got(), ["submit amount string 42"]);
    assert.equal(await shop.run(`return ESX.UI.Menu.IsOpen('dialog', 'esx_shop', 'amount')`), false);
    assert.equal(await shop.run(`return ESX.UI.Menu.IsOpen('default', 'esx_shop', 'main')`), true);
  });

  it("failure paths: Escape runs cancel once and no submit; menu.close() by code runs neither", async () => {
    await shop.run(`dialog('second')`);
    await shop.run(`exports.nuikit:escape('input')`);
    assert.deepEqual(await got(), ["submit amount string 42", "cancel second"]);
    await shop.run(`dialog('third')`);
    await shop.run(`ESX.UI.Menu.GetOpened('dialog', 'esx_shop', 'third').close()`);
    assert.deepEqual(await got(), ["submit amount string 42", "cancel second"]);
    assert.equal(await shop.run(`return exports.nuikit:count('input')`), 0);
    assert.equal(await shop.run(`return exports.nuikit:count('menu')`), 1);
  });
});

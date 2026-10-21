// qbx_scoreboard: flat messages ({ action, ...fields }), no NUI callbacks (docs/qbx-scoreboard-protocol.md).
// The check is that the page posts nothing to qbx_scoreboard in any state.
export const resource = "qbx_scoreboard";
export const entry = "ui.html";
export const scene = "street.jpg";

const items = {
  storerobbery: "Store Robbery",
  bankrobbery: "Bank Robbery",
  jewellery: "Jewelry",
  pacific: "Pacific Bank",
  paleto: "Paleto Bay Bank",
};
const cops = (busy = []) => ({
  storerobbery: { minimumPolice: 2, label: "Store Robbery", busy: busy.includes("storerobbery") },
  bankrobbery: { minimumPolice: 3, label: "Bank Robbery", busy: busy.includes("bankrobbery") },
  jewellery: { minimumPolice: 2, label: "Jewelry", busy: busy.includes("jewellery") },
  pacific: { minimumPolice: 5, label: "Pacific Bank", busy: busy.includes("pacific") },
  paleto: { minimumPolice: 4, label: "Paleto Bay Bank", busy: busy.includes("paleto") },
});

export async function run({ send, shot, sleep }) {
  // `nosetup`: the page opened before `setup` reached it; labels come from `open`
  await send("open-nosetup", { action: "open", players: 21, maxPlayers: 64, requiredCops: cops(), currentCops: 2 });
  await sleep(400);
  await shot("nosetup");
  await send("close", { action: "close" });
  await sleep(300);

  await send("setup", { action: "setup", items });
  await send("open", { action: "open", players: 37, maxPlayers: 64, requiredCops: cops(), currentCops: 3 });
  await sleep(400);
  await shot("open");
  await send("open-busy", { action: "open", players: 52, maxPlayers: 64, requiredCops: cops(["bankrobbery", "jewellery"]), currentCops: 6 });
  await sleep(300);
  await shot("busy");
  await send("open-nocops", { action: "open", players: 9, maxPlayers: 48, requiredCops: cops(), currentCops: 0 });
  await sleep(300);
  await shot("nocops");
  await send("open-full", { action: "open", players: 128, maxPlayers: 128, requiredCops: cops(["paleto"]), currentCops: 12 });
  await sleep(300);
  await shot("full");
  await send("open-noactivities", { action: "open", players: 3, maxPlayers: 32, requiredCops: {}, currentCops: 0 });
  await sleep(300);
  await shot("noactivities");
  await send("close-2", { action: "close" });
  await sleep(400);
  await shot("closed");
}

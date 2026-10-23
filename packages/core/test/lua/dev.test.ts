// systems/nuikit_dev/shared.lua: the server-side rules of /nk test (ace, whitelist, rate limit, items grant).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LuaFactory, type LuaEngine } from "wasmoon";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SHARED = readFileSync(fileURLToPath(new URL("../../../../systems/nuikit_dev/shared.lua", import.meta.url)), "utf8");

let lua: LuaEngine;
beforeEach(async () => {
  lua = await new LuaFactory().createEngine();
  await lua.doString(SHARED);
});
afterEach(() => lua.global.close());

const run = <T = unknown>(code: string) => lua.doString(code) as Promise<T>;
const ALLOW = "function() return true end";
const authorize = (src: string, what: string, now = 1000, allow = ALLOW, state = "S") =>
  run<[boolean, string?]>(`S = S or { last = {} } local ok, err = NkDev.authorize(${state}, ${src}, ${what}, ${now}, ${allow}) return { ok = ok, err = err }`).then(
    (r) => r as any,
  );

describe("NkDev.authorize", () => {
  it("allows a known test for an admin", async () => {
    expect(await authorize("5", "'notify'")).toMatchObject({ ok: true });
  });
  it("rejects the console and non-player sources", async () => {
    expect((await authorize("0", "'notify'")).ok).toBe(false);
    expect((await authorize("'abc'", "'notify'")).ok).toBe(false);
  });
  it("rejects a player without the ace", async () => {
    const r = await authorize("5", "'notify'", 1000, "function() return false end");
    expect(r.ok).toBe(false);
    expect(r.err).toContain("command.nuikit");
  });
  it("checks the ace name it documents", async () => {
    const seen = await run<string>(`local a NkDev.authorize({ last = {} }, 5, 'notify', 0, function(_, ace) a = ace return true end) return a`);
    expect(seen).toBe("command.nuikit");
  });
  it("rejects unknown and non-string tests", async () => {
    expect((await authorize("5", "'rm -rf'")).ok).toBe(false);
    expect((await authorize("5", "nil", 5000)).ok).toBe(false);
    expect((await authorize("5", "{}", 6000)).ok).toBe(false);
  });
  it("rate-limits every command briefly and items for 10 s per player", async () => {
    await run(`S = { last = {} }`);
    expect((await authorize("5", "'items'", 1000)).ok).toBe(true);
    expect((await authorize("5", "'notify'", 1100)).ok).toBe(false); // too fast
    expect((await authorize("5", "'items'", 5000)).ok).toBe(false); // items cooldown
    expect((await authorize("6", "'items'", 5000)).ok).toBe(true); // another player is independent
    expect((await authorize("5", "'items'", 11500)).ok).toBe(true);
  });
  it("does not start the cooldown for a rejected call", async () => {
    await run(`S = { last = {} }`);
    await authorize("5", "'nope'", 1000);
    expect((await authorize("5", "'notify'", 1001)).ok).toBe(true);
  });
});

const deps = (over = "") => `
  local added = {}
  D = {
    invStarted = function() return true end,
    canCarry = function() return true end,
    add = function(_, name, count, meta) added[#added + 1] = { name = name, count = count, meta = meta } return true end,
    playerData = function() return nil end,
  }
  ${over}
  local ok, msg = NkDev.grantItems(D, 5)
  return { ok = ok, msg = msg, n = #added }
`;

describe("NkDev.grantItems", () => {
  it("gives an id_card with metadata plus the stock items", async () => {
    const r = await run<any>(deps());
    expect(r.ok).toBe(true);
    expect(r.n).toBe(3);
  });
  it("builds the id card metadata from the player's data, else placeholders", async () => {
    const md = await run<any>(`return NkDev.idCardMetadata({ citizenid = 'ABC', charinfo = { firstname = 'Ann', lastname = 'Lee', birthdate = '1999-02-03', gender = 1, nationality = 'US' } })`);
    expect(md).toMatchObject({ type: "id_card", citizenid: "ABC", firstname: "Ann", lastname: "Lee", birthdate: "1999-02-03", sex: "F", nationality: "US" });
    expect(await run<any>(`return NkDev.idCardMetadata(nil)`)).toMatchObject({ citizenid: "TEST0001", sex: "M" });
  });
  it("fails when ox_inventory is missing, giving nothing", async () => {
    const r = await run<any>(deps(`D.invStarted = function() return false end`));
    expect(r.ok).toBe(false);
    expect(r.msg).toContain("ox_inventory");
    expect(r.n).toBe(0);
  });
  it("fails before adding anything when an item can't be carried", async () => {
    const r = await run<any>(deps(`D.canCarry = function(_, name) return name ~= 'burger' end`));
    expect(r.ok).toBe(false);
    expect(r.msg).toContain("burger");
    expect(r.n).toBe(0);
  });
  it("reports a failed AddItem with how many were given", async () => {
    const r = await run<any>(deps(`local n = 0 D.add = function() n = n + 1 return n < 2 end`));
    expect(r.ok).toBe(false);
    expect(r.msg).toContain("1 of 3");
  });
  it("takes back what it gave when a later AddItem fails (all or nothing)", async () => {
    const r = await run<any>(`
      local inv, n = {}, 0
      D = {
        invStarted = function() return true end,
        canCarry = function() return true end,
        add = function(_, name, count) n = n + 1 if n == 3 then return false end inv[name] = (inv[name] or 0) + count return true end,
        remove = function(_, name, count) inv[name] = inv[name] - count return true end,
        playerData = function() return nil end,
      }
      local ok, msg = NkDev.grantItems(D, 5)
      return { ok = ok, msg = msg, id = inv.id_card, water = inv.water }
    `);
    expect(r).toMatchObject({ ok: false, id: 0, water: 0 });
    expect(r.msg).toContain("2 taken back");
  });
});

describe("NkDev.queueNames (the dev restart queue)", () => {
  const names = (queue: string) =>
    run<string[]>(`return NkDev.queueNames(${JSON.stringify(queue)}, 'nuikit_dev', function(n) return n ~= 'ghost' end)`).then((r) => Object.values(r ?? {}));
  it("keeps whole names of resources that exist, once each, never itself", async () => {
    expect(await names("nuikit_hud\nox_inventory\r\nnuikit_hud nuikit_dev ghost")).toEqual(["nuikit_hud", "ox_inventory"]);
  });
  it("never yields anything a console would read as another command or a flag", async () => {
    expect(await names("nuikit_hud;quit\nstop all\n-x\nrcon_password x\n`a`\nexec server.cfg")).toEqual(["stop", "all", "exec"]);
    expect(await names("a".repeat(65))).toEqual([]);
    expect((await names(Array.from({ length: 40 }, (_, i) => `r${i}`).join(" "))).length).toBe(32);
  });
});

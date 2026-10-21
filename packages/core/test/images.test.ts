import { afterEach, describe, expect, it } from "vitest";
import { __resetImages } from "../src/images";
import { DEFAULT_IMAGES, getImageConfig, parseTemplates, resolveImage, setImageConfig } from "../src/index";

afterEach(() => __resetImages());

describe("images", () => {
  it("resolves items through the inventory conventions, ox first", () => {
    const urls = resolveImage("item", "water");
    expect(urls[0]).toBe("nui://ox_inventory/web/images/water.png");
    expect(urls).toContain("nui://qb-inventory/html/images/water.png");
  });

  it("weapons are items", () => {
    expect(resolveImage("weapon", "WEAPON_PISTOL")[0]).toBe("nui://ox_inventory/web/images/WEAPON_PISTOL.png");
  });

  it("vehicles default to the FiveM docs images, lower case", () => {
    expect(resolveImage("vehicle", "Sultan")).toEqual(["https://docs.fivem.net/vehicles/sultan.webp"]);
  });

  it("clothing has no default and fills every placeholder", () => {
    const key = { model: "mp_f_freemode_01", type: "prop", id: 0, drawable: 5, texture: 2 } as const;
    expect(resolveImage("clothing", key)).toEqual([]);
    setImageConfig({ clothing: "https://x/{model}/{collection}/{kind}_{id}_{drawable}_{texture}.webp; nui://gs/images/clothing/{gender}_{prefix}{id}_{drawable}_{texture}.png" });
    expect(resolveImage("clothing", key)).toEqual([
      "https://x/mp_f_freemode_01/base/P_0_5_2.webp",
      "nui://gs/images/clothing/female_prop_0_5_2.png",
    ]);
  });

  it("server templates go first, defaults stay as fallbacks unless replaced", () => {
    setImageConfig({ item: "https://cdn/{lower}.webp" });
    expect(resolveImage("item", "Water")[0]).toBe("https://cdn/water.webp");
    expect(getImageConfig().item.length).toBe(DEFAULT_IMAGES.item.length + 1);
    setImageConfig({ item: "https://cdn/{name}.webp", replace: true });
    expect(getImageConfig().item).toEqual(["https://cdn/{name}.webp"]);
  });

  it("parses ; lists and skips empties; encodes values", () => {
    expect(parseTemplates(" a ; ;b ")).toEqual(["a", "b"]);
    expect(resolveImage("item", "a b")[0]).toBe("nui://ox_inventory/web/images/a%20b.png");
    expect(resolveImage("item", "")).toEqual([]);
  });
});

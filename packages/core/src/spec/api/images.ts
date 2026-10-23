import type { DomainSpec } from "./types";

/** Images: item, weapon, vehicle and clothing pictures from the conventions servers already use. */
export default {
  js: "images",
  lua: "images",
  title: "Images",
  doc: "Resolve item, weapon, vehicle and clothing pictures from known conventions; servers add their own by convar.",
  docs: "docs/images.md",
  entries: [
    { name: "resolve", kind: "call", doc: "Candidate URLs for a thing, best first.", js: "resolveImage", only: "js only: the page loads images; Lua sets convars", since: "0.8.0" },
    { name: "load", kind: "call", doc: "Fetch the server's templates once per page.", js: "loadImageConfig", only: "js only: the page asks nuikit:images:config", since: "0.8.0" },
    { name: "config", kind: "call", doc: "The templates in use, per kind.", js: "getImageConfig", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "setConfig", kind: "call", doc: "Merge server templates over the defaults.", js: "setImageConfig", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "subscribe", kind: "call", doc: "Called when the templates change.", js: "onImageConfig", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "parseTemplates", kind: "call", doc: "A ;-separated template list.", js: "parseTemplates", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "clothingValues", kind: "call", doc: "The placeholder values of a clothing key.", js: "clothingValues", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "hasClothing", kind: "call", doc: "The server named a clothing pack.", js: "hasClothingImages", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "defaults", kind: "const", doc: "ox/qb/ps/lj inventory images, FiveM docs vehicles.", js: "DEFAULT_IMAGES", only: "js only: the page's resolver", since: "0.8.0" },
    { name: "ImageKind", kind: "type", doc: "item, weapon, vehicle, clothing.", js: "ImageKind", only: "js only: the page's resolver", since: "0.8.0" },
  ],
  events: [
    { name: "nuikit:images:config", dir: "page→lua", payload: "{}", reply: "{ item: string; weapon: string; vehicle: string; clothing: string; replace: boolean }", sender: "any", doc: "https://nuikit/images: the server's templates.", wire: "images", since: "0.8.0" },
    { name: "nuikit:images:vehicle", dir: "page→lua", payload: "{}", reply: "{ model?: string; hash?: number }", sender: "any", doc: "https://nuikit/vehicle: the vehicle the player sits in or stands at.", wire: "vehicle", since: "0.8.0" },
  ],
  rules: ["Never a broken-image icon: try each URL, then the fallback.", "Servers configure by convar (setr nuikit_images_<kind>); nothing to code."],
} satisfies DomainSpec;

// A renderer pack talks to nuikit's frame through the renderer context (ctx.resolve / cancel / emit),
// never to Lua directly: the intents' wire types come from nuikit-core/intents. Add your own
// events here only if the pack's client/main.lua sends any.
import "nuikit-core";

declare module "nuikit-core" {
  interface NuiEvents {}
  interface NuiCallbacks {}
  interface NuiSurfaces {}
}

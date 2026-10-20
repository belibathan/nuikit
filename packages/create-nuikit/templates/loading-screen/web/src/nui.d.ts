// A loading screen gets no NUI messages: it starts before any resource runs on the client. What it
// shows comes from the connection handover (components/blocks/loading-screen/handover.ts) and the
// game's own load events (components/blocks/loading-screen/progress.ts). These interfaces stay
// empty unless you add a NUI page to this resource later.
import "nuikit-core";

declare module "nuikit-core" {
  interface NuiEvents {}
  interface NuiCallbacks {}
  interface NuiSurfaces {}
}

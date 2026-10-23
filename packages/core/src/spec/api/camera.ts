import type { DomainSpec } from "./types";

const L = "lua only: cameras are natives; a page asks its Lua";
/** Camera: one scripted camera owner at a time, a client-wide stack, the gameplay camera always given back. */
export default {
  js: "camera",
  lua: "camera",
  title: "Camera",
  doc: "Take the screen with a scripted camera; a stack across resources, and the game camera always comes back.",
  docs: "docs/services.md#nkcamera",
  entries: [
    { name: "claim", kind: "call", doc: "Take the screen: a targeted camera placed around an entity, or your own on the current view.", lua: "nk.camera.claim", sig: { lua: "nk.camera.claim(opts?) → NuiCameraClaim, from" }, only: L, since: "0.8.0" },
    { name: "release", kind: "call", doc: "Give a claim back; the claim below (or the game) resumes.", lua: "nk.camera.release", sig: { lua: "nk.camera.release(claim, { ms?, instant? })" }, only: L, since: "0.8.0" },
    { name: "releaseAll", kind: "call", doc: "Release every claim of this resource.", lua: "nk.camera.releaseAll", only: L, since: "0.8.0" },
    { name: "stream", kind: "call", doc: "Stream the world around a far point while the claim lasts.", lua: "nk.camera.stream", only: L, since: "0.8.0" },
    { name: "handle", kind: "call", doc: "This resource's top camera handle.", lua: "nk.camera.handle", only: L, since: "0.8.0" },
    { name: "owner", kind: "call", doc: "Who holds the screen: resource and id.", lua: "nk.camera.owner", only: L, since: "0.8.0" },
    { name: "isActive", kind: "call", doc: "A scripted camera is on screen (any resource).", lua: "nk.camera.isActive", only: L, since: "0.8.0" },
    { name: "get", kind: "call", doc: "This resource's claim with that id.", lua: "nk.camera.get", only: L, since: "0.8.0" },
    { name: "stack", kind: "call", doc: "The client-wide stack, bottom to top.", lua: "nk.camera.stack", only: L, since: "0.8.0" },
    { name: "down", kind: "call", doc: "The player is down (dead, or the 'dead' state).", lua: "nk.camera.down", only: L, since: "0.8.0" },
    { name: "pose", kind: "call", doc: "Where a targeted claim's camera sits and looks this frame.", lua: "nk.camera.pose", only: L, status: "unproven", since: "0.8.0" },
    { name: "defaults", kind: "const", doc: "Default offsets per target kind (ped, vehicle); a resource may change them.", lua: "nk.camera.defaults", only: L, since: "0.8.0" },
    { name: "claim.release", kind: "handle", doc: "Release this claim.", lua: "NuiCameraClaim:release", only: L, since: "0.8.0" },
    { name: "claim.stream", kind: "handle", doc: "Stream around a point while this claim lasts.", lua: "NuiCameraClaim:stream", only: L, since: "0.8.0" },
    { name: "claim.isActive", kind: "handle", doc: "Active and not suspended.", lua: "NuiCameraClaim:isActive", only: L, since: "0.8.0" },
    { name: "NuiCameraOptions", kind: "type", doc: "id, target, offset, look, fov, duration, lockHeading, follow, onSuspend, onResume, onLost.", lua: "NuiCameraOptions", only: L, since: "0.8.0" },
  ],
  events: [
    { name: "nuikit:camera:claim", dir: "local", payload: "{ resource: string; id: string }", sender: "owner", doc: "Replicated: a claim went on top.", wire: "nuikit:cam:claim", since: "0.8.0" },
    { name: "nuikit:camera:release", dir: "local", payload: "(resource: string, id: string)", sender: "owner", doc: "Replicated: a claim left.", wire: "nuikit:cam:release", since: "0.8.0" },
    { name: "nuikit:camera:hello", dir: "local", payload: "(resource: string)", sender: "runtime", doc: "A copy joined: ask for the stack.", wire: "nuikit:cam:hello", since: "0.8.0" },
    { name: "nuikit:camera:stack", dir: "local", payload: "(to: string, { stack, seq })", sender: "runtime", doc: "The stack, to a copy that joined.", wire: "nuikit:cam:snapshot", since: "0.8.0" },
  ],
  rules: [
    "Each copy touches only its own cameras; the stack is replicated in order.",
    "A claim starts on the rendered view: taking the screen is a cut to the same picture.",
    "A resource stopping releases its claims; the player going down releases every claim (onLost('dead')).",
    "Idle cost zero: no thread without a claim.",
  ],
} satisfies DomainSpec;

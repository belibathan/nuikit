// The contract between your Lua and the garage. Lua opens the `garage` surface with a GarageData
// snapshot; the page asks Lua to take a vehicle out, store the one you're in, or release one from
// the impound, and shows what Lua answers (an error stays on the panel).
import "nuikit-core"

export type GarageVehicleState = "stored" | "out" | "impounded"

export interface GarageVehicle {
  /** Your id for it (a database id, or the plate). */
  id: string
  /** "Pegassi Zentorno" */
  label: string
  plate: string
  /** "Super", "Muscle" */
  class?: string
  state: GarageVehicleState
  /** Where it is, when that helps: "Last seen in Vinewood", "Davis impound". */
  location?: string
  /** 0–100 */
  fuel: number
  /** 0–100 */
  engine: number
  /** 0–100 */
  body: number
  /** Impounded: what releasing it costs. */
  fee?: number
}

export interface GarageData {
  /** "Legion Square" */
  title: string
  description?: string
  vehicles: GarageVehicle[]
  /** The player is driving a vehicle they can store here: a Store button shows. */
  canStore?: boolean
}

export type GarageAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    garage: GarageData
  }
  interface NuiCallbacks {
    "garage:takeOut": { req: { id: string }; res: GarageAnswer }
    "garage:store": { req: void; res: GarageAnswer }
    "garage:release": { req: { id: string }; res: GarageAnswer }
  }
}

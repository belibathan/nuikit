// The contract between your Lua and the scoreboard. Lua opens the `scoreboard` surface with a
// ScoreboardData snapshot and updates it (surface:update) every few seconds while it's open. The page
// sends nothing back: it only reads.
import "nuikit-core"

export interface ScoreboardPlayer {
  /** Server ID. */
  id: number
  name: string
  /** Job or role, when your server shares it ("LSPD", "EMS"). */
  job?: string
  /** ms */
  ping?: number
  /** This player. */
  you?: boolean
}

export interface ScoreboardActivity {
  id: string
  label: string
  /** Can start now. */
  available: boolean
  /** Why or why not: "4 police on duty", "Needs 3 police". */
  detail?: string
}

export interface ScoreboardData {
  /** Empty: the page says "Players". */
  title?: string
  players: ScoreboardPlayer[]
  /** sv_maxclients. */
  max?: number
  activities?: ScoreboardActivity[]
}

declare module "nuikit-core" {
  interface NuiSurfaces {
    scoreboard: ScoreboardData
  }
}

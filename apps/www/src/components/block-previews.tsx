import type { ReactNode } from "react";
import { Bank } from "@/blocks/bank/bank";
import { bankFixtures } from "@/blocks/bank/fixtures";
import { DeathScreen } from "@/blocks/death-screen/death-screen";
import { garageFixtures } from "@/blocks/garage/fixtures";
import { Garage } from "@/blocks/garage/garage";
import { deathScreenFixtures } from "@/blocks/death-screen/fixtures";
import { HudMinimal } from "@/blocks/hud-minimal/hud-minimal";
import { jobMenuFixtures } from "@/blocks/job-menu/fixtures";
import { JobMenu } from "@/blocks/job-menu/job-menu";
import { hudMinimalFixtures } from "@/blocks/hud-minimal/fixtures";
import { LoadingScreen } from "@/blocks/loading-screen/loading-screen";
import { loadingHandovers, loadStateAt } from "@/blocks/loading-screen/fixtures";
import { PauseMenu } from "@/blocks/pause-menu/pause-menu";
import { pauseMenuFixtures } from "@/blocks/pause-menu/fixtures";
import { Scoreboard } from "@/blocks/scoreboard/scoreboard";
import { scoreboardFixtures } from "@/blocks/scoreboard/fixtures";
import { Settings } from "@/blocks/settings/settings";
import { settingsFixtures } from "@/blocks/settings/fixtures";

export interface BlockPreview {
  name: string;
  title: string;
  description: string;
  /** Which game scene suits it. */
  scene?: "dusk" | "day";
  /** Named states, each a still of the block on a 1920×1080 screen (its fixtures). */
  states: Record<string, () => ReactNode>;
}

/**
 * Every block on /blocks, drawn from its presentational component and its fixtures: never the
 * wired *Surface components (a surface is fixed to the viewport, and these are stills).
 */
export const BLOCKS: BlockPreview[] = [
  {
    name: "hud-minimal",
    title: "Minimal HUD",
    description: "Vitals and needs with voice, cash, bank and job, and a speedometer with seatbelt and engine warnings while driving. The player comes from nuikit's bridge, on any framework.",
    scene: "day",
    states: {
      Driving: () => <HudMinimal player={hudMinimalFixtures.driving.player} vehicle={hudMinimalFixtures.driving.vehicle} />,
      Warnings: () => <HudMinimal player={hudMinimalFixtures.warnings.player} vehicle={hudMinimalFixtures.warnings.vehicle} />,
      "On foot": () => <HudMinimal player={hudMinimalFixtures.talking.player} vehicle={false} />,
      Standalone: () => <HudMinimal player={hudMinimalFixtures.standalone.player} vehicle={false} />,
    },
  },
  {
    name: "death-screen",
    title: "Death screen",
    description: "Last stand and death: a countdown, call EMS, hold to respawn with a live bar. Its example rules step aside for qbx_medical, qb-ambulancejob and ESX.",
    states: {
      Down: () => <DeathScreen data={deathScreenFixtures["down-ems"]} />,
      Urgent: () => <DeathScreen data={deathScreenFixtures["down-urgent"]} />,
      Dead: () => <DeathScreen data={deathScreenFixtures.dead} />,
      Respawn: () => <DeathScreen data={deathScreenFixtures["dead-respawn"]} hold={0.6} />,
    },
  },
  {
    name: "pause-menu",
    title: "Pause menu",
    description: "Esc opens it in place of GTA's: resume, map, settings, key bindings, disconnect with a confirm, and the player and server on cards.",
    states: {
      Menu: () => <PauseMenu data={pauseMenuFixtures.full.data} player={pauseMenuFixtures.full.player} autoFocus={false} />,
      Opening: () => <PauseMenu data={pauseMenuFixtures.opening.data} player={pauseMenuFixtures.opening.player} autoFocus={false} />,
      "No character": () => <PauseMenu data={pauseMenuFixtures["no-character"].data} player={pauseMenuFixtures["no-character"].player} autoFocus={false} />,
    },
  },
  {
    name: "loading-screen",
    title: "Loading screen",
    description: "The real load progress from the game's own load events, tips, links, backgrounds and music, themed through the connection handover.",
    states: {
      "Loading map": () => <LoadingScreen handover={loadingHandovers.full} load={loadStateAt("map")} />,
      "Building the city": () => <LoadingScreen handover={loadingHandovers.plain} load={loadStateAt("afterMap")} />,
      Ready: () => <LoadingScreen handover={loadingHandovers.full} load={loadStateAt("ready")} />,
    },
  },
  {
    name: "settings",
    title: "Settings",
    description: "Player settings in one panel: toggles, choices, sliders and key hints. Lua has the last word on every change, and Accessibility is nuikit's own player preferences.",
    states: {
      Interface: () => <SettingsStill data={settingsFixtures.full} />,
      Accessibility: () => <SettingsStill data={settingsFixtures.single} />,
      Disabled: () => <SettingsStill data={settingsFixtures.disabled} />,
    },
  },
  {
    name: "scoreboard",
    title: "Scoreboard",
    description: "Who's online with server IDs, jobs and ping, a search, how full the server is, and which activities can start given who's on duty.",
    states: {
      Full: () => <ScoreboardStill data={scoreboardFixtures.full} />,
      Search: () => <ScoreboardStill data={scoreboardFixtures.full} query="lspd" />,
      Standalone: () => <ScoreboardStill data={scoreboardFixtures.standalone} />,
    },
  },
  {
    name: "garage",
    title: "Garage",
    description: "Your vehicles at a garage with fuel, engine and body: take one out, store the one you're driving, or pay to release one from the impound. Lua answers every button.",
    states: {
      Garage: () => <Garage data={garageFixtures.full} autoFocus={false} onAction={async () => ({ ok: true })} />,
      Impound: () => <Garage data={garageFixtures.impounded} autoFocus={false} onAction={async () => ({ ok: true })} />,
      "On foot, refused": () => <Garage data={garageFixtures["on-foot"]} autoFocus={false} onAction={async () => ({ ok: false, error: "Something is parked in the way." })} />,
      Empty: () => <Garage data={garageFixtures.empty} autoFocus={false} />,
    },
  },
  {
    name: "bank",
    title: "Bank",
    description: "Accounts, balance and recent transactions; deposit, withdraw and transfer in a dialog that checks the amount, then the server checks it again. Protocol-agnostic.",
    states: {
      Bank: () => <Bank data={bankFixtures.full} autoFocus={false} onMoney={async () => ({ ok: true })} />,
      ATM: () => <Bank data={bankFixtures.atm} autoFocus={false} onMoney={async () => ({ ok: true })} />,
      Frozen: () => <Bank data={bankFixtures.frozen} autoFocus={false} />,
      "New account": () => <Bank data={bankFixtures.new} autoFocus={false} />,
    },
  },
  {
    name: "job-menu",
    title: "Job menu",
    description: "A duty toggle and the job's actions; the boss also gets the staff to promote, demote or fire (with a confirm) and whoever is nearby to hire. The server checks every request against the caller's own job.",
    states: {
      Staff: () => <JobMenu data={jobMenuFixtures.boss} defaultTab="staff" autoFocus={false} onRequest={async () => ({ ok: true })} />,
      Actions: () => <JobMenu data={jobMenuFixtures.boss} autoFocus={false} onRequest={async () => ({ ok: true })} />,
      "Off duty": () => <JobMenu data={jobMenuFixtures["off-duty"]} autoFocus={false} onRequest={async () => ({ ok: true })} />,
      Refused: () => <JobMenu data={jobMenuFixtures.boss} defaultTab="staff" autoFocus={false} onRequest={async () => ({ ok: false, error: "Only the boss can do that." })} />,
    },
  },
];

function SettingsStill({ data }: { data: (typeof settingsFixtures)[keyof typeof settingsFixtures] }) {
  return (
    <div className="nk-edge absolute inset-0">
      <div className="nk-anchor-r">
        <Settings data={data} autoFocus={false} onChange={async (_id, value) => value} />
      </div>
    </div>
  );
}

function ScoreboardStill({ data, query }: { data: (typeof scoreboardFixtures)[keyof typeof scoreboardFixtures]; query?: string }) {
  return <Scoreboard data={data} query={query} autoFocus={false} className="absolute inset-x-0 top-[15%] mx-auto" />;
}

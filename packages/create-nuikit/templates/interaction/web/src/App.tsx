import { InteractionSurface } from "@/components/blocks/interaction/interaction";
import { NuiNotices } from "@/components/ui/notice";

// The interaction block (npx shadcn add @nuikit/interaction). It's your code now: the eye, the
// options and the prompts are in components/blocks/interaction, its messages in
// components/blocks/interaction/nui.ts, and client/main.lua + server/main.lua decide what shows
// and check what happens. <NuiNotices /> shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <InteractionSurface />
      <NuiNotices />
    </main>
  );
}

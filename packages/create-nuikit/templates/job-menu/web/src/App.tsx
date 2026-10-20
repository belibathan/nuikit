import { JobMenuSurface } from "@/components/blocks/job-menu/job-menu";

// The job-menu block (npx shadcn add @nuikit/job-menu). It's your code now: the panel is in
// components/blocks/job-menu, its messages in components/blocks/job-menu/nui.ts, and
// client/main.lua + server/main.lua decide what it shows and check every request.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <JobMenuSurface />
    </main>
  );
}

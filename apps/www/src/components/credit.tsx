import { cn } from "@/lib/utils";

export const AUTHOR = { handle: "belibathan", avatar: "https://avatars.githubusercontent.com/u/128108519?v=4&s=96" };

/** "Made by" chip: GitHub avatar and handle, linking to the profile. */
export function Credit({ className }: { className?: string }) {
  return (
    <a
      href={`https://github.com/${AUTHOR.handle}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-background/60 py-1 pr-3.5 pl-1 text-sm backdrop-blur transition-colors hover:bg-accent",
        className,
      )}
    >
      <img src={AUTHOR.avatar} alt="" className="size-6 rounded-full bg-muted" />
      <span className="font-mono text-[13px] font-medium">@{AUTHOR.handle}</span>
    </a>
  );
}

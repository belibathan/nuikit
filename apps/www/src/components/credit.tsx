import { cn } from "@/lib/utils";

export const AUTHOR = { handle: "belibathan", avatar: "https://avatars.githubusercontent.com/u/128108519?v=4&s=96" };

/** "Made by" chip: GitHub avatar and handle, linking to the profile. Ink's chip: r-chip corners, a hairline, no blur. */
export function Credit({ className }: { className?: string }) {
  return (
    <a
      href={`https://github.com/${AUTHOR.handle}`}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-(--nk-r-chip) border bg-background py-1 pr-3 pl-1 text-sm transition-colors hover:bg-accent",
        className,
      )}
    >
      <img src={AUTHOR.avatar} alt="" width={24} height={24} className="size-6 rounded-(--nk-r-key) bg-muted" />
      <span className="font-mono text-[13px] font-medium">@{AUTHOR.handle}</span>
    </a>
  );
}

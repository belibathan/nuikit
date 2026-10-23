import { GithubIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const REPO = "https://github.com/belibathan/nuikit";
export const SITE = "https://nuikit.vercel.app";

const PAGES = [
  { href: "/start", label: "Start" },
  { href: "/components", label: "Components" },
  { href: "/blocks", label: "Blocks" },
  { href: "/theme", label: "Theme studio" },
  { href: "/language", label: "Your language" },
  { href: "/design", label: "Design" },
  { href: "/protocol", label: "Protocol" },
  { href: "/intents", label: "Intents" },
  { href: "/adopt", label: "Adopt" },
  { href: "/coverage", label: "Coverage" },
];

export function Nav({ wide = false }: { wide?: boolean }) {
  const here = typeof location === "undefined" ? "/" : location.pathname.replace(/\/$/, "");
  const active = (href: string) => here === href || here.startsWith(`${href}/`);
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <nav aria-label="Main" className={cn("mx-auto flex h-14 items-center gap-6 px-4 text-sm sm:px-6", wide ? "max-w-7xl" : "max-w-6xl")}>
        <a href="/" aria-label="nuikit home" className="shrink-0">
          <Logo className="text-lg" />
        </a>
        <div className="hidden gap-5 text-muted-foreground md:flex">
          {PAGES.map((p) => (
            <a key={p.href} href={p.href} aria-current={active(p.href) ? "page" : undefined} className={cn("hover:text-foreground", active(p.href) && "text-foreground")}>
              {p.label}
            </a>
          ))}
        </div>
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <a href={REPO}>
            <GithubIcon /> GitHub
          </a>
        </Button>
      </nav>
      {/* phones: the same links as one scrolling row */}
      <div className="flex gap-5 overflow-x-auto border-t px-4 py-2.5 text-sm whitespace-nowrap text-muted-foreground [scrollbar-width:none] md:hidden">
        {PAGES.map((p) => (
          <a key={p.href} href={p.href} aria-current={active(p.href) ? "page" : undefined} className={cn("hover:text-foreground", active(p.href) && "text-foreground")}>
            {p.label}
          </a>
        ))}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <Logo className="text-base text-foreground" />
        <span>
          by{" "}
          <a href="https://github.com/belibathan" className="font-medium text-foreground underline-offset-4 hover:underline">
            @belibathan
          </a>
          . MIT licensed.
        </span>
        <span className="basis-full sm:basis-auto">Not affiliated with Cfx.re, Rockstar Games or shadcn.</span>
        <span className="flex gap-5 sm:ml-auto">
          <a href={REPO} className="hover:text-foreground">GitHub</a>
          <a href="https://www.npmjs.com/package/nuikit-core" className="hover:text-foreground">npm</a>
          <a href={`${REPO}/releases/latest`} className="hover:text-foreground">Releases</a>
        </span>
      </div>
    </footer>
  );
}

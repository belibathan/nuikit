import { applyTheme, clearTheme, type ThemeVars } from "nuikit-core/react";
import { GithubIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { themes } from "@/themes";

export const REPO = "https://github.com/belibathan/nuikit";
export const SITE = "https://nuikit.vercel.app";

const PAGES = [
  { href: "/design", label: "Design" },
  { href: "/components", label: "Components" },
  { href: "/theme", label: "Theme studio" },
  { href: "/coverage", label: "Coverage" },
];

export function Nav() {
  const here = typeof location === "undefined" ? "/" : location.pathname.replace(/\/$/, "");
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6 text-sm">
        <a href="/" aria-label="nuikit home">
          <Logo className="text-lg" />
        </a>
        <div className="hidden gap-5 text-muted-foreground md:flex">
          {PAGES.map((p) => (
            <a key={p.href} href={p.href} className={cn("hover:text-foreground", here === p.href && "text-foreground")}>
              {p.label}
            </a>
          ))}
          <a href="/#bridge" className="hover:text-foreground">Lua ↔ React</a>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <a href={REPO}>
            <GithubIcon /> GitHub
          </a>
        </Button>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-8 text-sm text-muted-foreground">
        <Logo className="text-base text-foreground" />
        <span>
          by{" "}
          <a href="https://github.com/belibathan" className="font-medium text-foreground underline-offset-4 hover:underline">
            @belibathan
          </a>
        </span>
        <span>Not affiliated with Cfx.re, Rockstar Games or shadcn.</span>
        <a href={REPO} className="ml-auto hover:text-foreground">GitHub</a>
        <a href="https://www.npmjs.com/package/vite-plugin-nuikit" className="hover:text-foreground">npm</a>
      </div>
    </footer>
  );
}

/**
 * Swap the whole page to one of the TweakCN presets, the way a server's nuikit/theme.css does in game.
 * The selected preset (the first, stock Neutral, unless `initial` says otherwise) is applied as soon as
 * the picker mounts, compiled like a server theme, so a page with a picker needs no theme code of its own.
 */
export function ThemePicker({ className, initial = 0 }: { className?: string; initial?: number }) {
  const [active, setActive] = useState(initial);
  const applied = useRef<ThemeVars | null>(null);
  const apply = (i: number) => {
    const t = themes[i];
    if (!t) return;
    setActive(i);
    if (applied.current) clearTheme(applied.current);
    applied.current = applyTheme(t.css, document.documentElement, "dark");
  };
  useEffect(() => {
    apply(initial);
    return () => void (applied.current && clearTheme(applied.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {themes.map((t, i) => (
        <Button
          key={t.name}
          variant={active === i ? "secondary" : "outline"}
          size="sm"
          onClick={() => apply(i)}
        >
          <span className="flex -space-x-1">
            {t.swatch.map((c) => (
              <span key={c} className="size-3 rounded-full ring-2 ring-background" style={{ background: c }} />
            ))}
          </span>
          {t.name}
        </Button>
      ))}
    </div>
  );
}

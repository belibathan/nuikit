import { applyTheme, clearTheme, type ThemeVars } from "nuikit-core/react";
import { CheckIcon, CircleAlertIcon, DownloadIcon, RotateCcwIcon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/code";
import { GameStage } from "@/components/game-stage";
import { Footer, Nav } from "@/components/site";
import { ThemePreview } from "@/components/theme-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { exportThemeCss, studioTheme, toHex, TWEAKS, withAlpha } from "@/lib/theme-studio";
import { cn } from "@/lib/utils";
import { themes } from "@/themes";

/**
 * /theme: paste a TweakCN / shadcn theme or tweak tokens, see the kit update on a game screen,
 * read the contrast warnings compileTheme gives the server, download theme.css. The theme applies
 * to the preview only, so the controls stay readable whatever you paste.
 */
export function ThemePage() {
  const [css, setCss] = useState(themes[0]!.css);
  const [preset, setPreset] = useState<number | null>(0);
  const [tweaks, setTweaks] = useState<ThemeVars>({});
  const theme = useMemo(() => studioTheme(css, tweaks), [css, tweaks]);
  const file = useMemo(() => exportThemeCss(theme), [theme]);

  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    applyTheme(theme, el, "dark");
  }, [theme]);
  useLayoutEffect(() => () => void (stage.current && clearTheme(undefined, stage.current)), []);

  const contrastIssues = theme.contrast.filter((c) => !c.ok).length;
  const notes = theme.warnings.filter((w) => !/:1 \(needs /.test(w));

  const download = () => {
    const url = URL.createObjectURL(new Blob([file], { type: "text/css" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme.css";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight">Theme studio</h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Paste a{" "}
            <a href="https://tweakcn.com" className="text-foreground underline underline-offset-4">
              TweakCN
            </a>{" "}
            or shadcn theme, or tweak the tokens, and watch the kit change on a game screen. The checks are the ones your server runs. Download
            theme.css, drop it in <code className="font-mono text-foreground">nuikit/theme.css</code> and run{" "}
            <code className="font-mono text-foreground">nuikit theme reload</code>.
          </p>
        </header>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
          <div className="flex flex-col gap-6 lg:sticky lg:top-20">
            <GameStage stageRef={stage}>
              <ThemePreview />
            </GameStage>
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle className="flex items-center gap-2">
                  {theme.warnings.length ? <CircleAlertIcon className="size-4 text-warning" /> : <CheckIcon className="size-4 text-success" />}
                  {theme.warnings.length ? `${theme.warnings.length} ${theme.warnings.length === 1 ? "thing" : "things"} to check` : "Ready for the game"}
                </CardTitle>
                <CardDescription>
                  What <code className="font-mono">compileTheme</code> tells the server console. Warnings never block a theme.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-5">
                {notes.length > 0 && (
                  <ul className="flex flex-col gap-2 text-sm">
                    {notes.map((w) => (
                      <li key={w} className="flex gap-2">
                        <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Contrast{" "}
                    <span className="font-normal text-muted-foreground">
                      {contrastIssues ? `${contrastIssues} of ${theme.contrast.length} pairs below the minimum` : `all ${theme.contrast.length} pairs pass`}
                    </span>
                  </p>
                  <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {theme.contrast.map((c) => (
                      <div key={c.fg + c.bg} className={cn("flex items-center gap-2", !c.ok && "text-warning")}>
                        {c.ok ? <CheckIcon className="size-3.5 shrink-0 text-success" /> : <CircleAlertIcon className="size-3.5 shrink-0" />}
                        <span className="truncate">
                          {c.fg} on {c.bg}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-xs tabular-nums">
                          {c.ratio.toFixed(1)} / {c.min}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>Start from</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-5">
                {themes.map((t, i) => (
                  <Button
                    key={t.name}
                    variant={preset === i ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPreset(i);
                      setCss(t.css);
                      setTweaks({});
                    }}
                  >
                    <span className="flex -space-x-1">
                      {t.swatch.map((c) => (
                        <span key={c} className="size-3 rounded-full ring-2 ring-background" style={{ background: c }} />
                      ))}
                    </span>
                    {t.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>Paste a theme</CardTitle>
                <CardDescription>The CSS from tweakcn.com or ui.shadcn.com/themes, with its .dark block. It updates as you type.</CardDescription>
              </CardHeader>
              <CardContent className="px-5">
                <Textarea
                  aria-label="Theme CSS"
                  value={css}
                  onChange={(e) => {
                    setCss(e.target.value);
                    setPreset(null);
                  }}
                  spellCheck={false}
                  className="h-56 resize-y font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle className="flex items-center justify-between">
                  Tweak tokens
                  {Object.keys(tweaks).length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setTweaks({})}>
                      <RotateCcwIcon /> Undo tweaks
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>A tweak sets the token outright, on top of the paste.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 px-5">
                {TWEAKS.map((g) => (
                  <div key={g.group} className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">{g.group}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {g.tokens.map((t) => (
                        <label key={t.name} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                          <input
                            type="color"
                            aria-label={t.label}
                            value={toHex(theme.vars[t.name])}
                            onChange={(e) => setTweaks((prev) => ({ ...prev, [t.name]: withAlpha(e.target.value, theme.vars[t.name]) }))}
                            className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                          />
                          <span className="truncate">{t.label}</span>
                          {tweaks[t.name] && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" aria-label="Tweaked" />}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <SliderField
                  label="Corner radius"
                  min={0}
                  max={1.5}
                  step={0.125}
                  value={parseFloat(theme.vars.radius ?? "0.625") || 0}
                  format={() => theme.vars.radius}
                  onValueChange={(v) => setTweaks((prev) => ({ ...prev, radius: `${v}rem` }))}
                />

              </CardContent>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>theme.css</CardTitle>
                <CardDescription>
                  Every token, compiled for the game. Put it in <code className="font-mono">nuikit/theme.css</code>; every nuikit UI on the server
                  picks it up.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 px-5">
                <Button className="flex-1" onClick={download}>
                  <DownloadIcon /> Download theme.css
                </Button>
                <CopyButton text={file} className="size-9 border" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

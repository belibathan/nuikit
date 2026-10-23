import { type ThemeVars } from "nuikit-core/react";
import { CheckIcon, CircleAlertIcon, CopyIcon, DownloadIcon, RotateCcwIcon } from "lucide-react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GameStage } from "@/components/game-stage";
import { Footer, Nav } from "@/components/site";
import { ThemePreview } from "@/components/theme-preview";
import { VariantsDemo } from "@/components/variants-demo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField, SliderField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { COMPONENTS, diffTheme, exportChangesCss, exportThemeCss, fontChoice, FONT_CHOICES, IDENTITY, identityNumber, identityValue, LEVERS, studioTheme, toHex, TREATMENT_INFO, TREATMENTS, TWEAKS, withAlpha, withTreatment, type IdentityControl, type Treatment } from "@/lib/theme-studio";
import { LanguageStrip } from "@/components/language-strip";
import { cn } from "@/lib/utils";
import { identities, themes } from "@/themes";

const PRESETS = [...identities, ...themes];

/**
 * /theme: paste a TweakCN / shadcn theme or tweak tokens, see the kit update on a game screen,
 * read the contrast warnings compileTheme gives the server, download theme.css. The theme applies
 * to the preview only, so the controls stay readable whatever you paste.
 */
export function ThemePage() {
  const [css, setCss] = useState(PRESETS[0]!.css);
  const [preset, setPreset] = useState<number | null>(0);
  const [tweaks, setTweaks] = useState<ThemeVars>({});
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const theme = useMemo(() => studioTheme(withTreatment(css, treatment), tweaks), [css, treatment, tweaks]);
  const base = useMemo(() => studioTheme(css), [css]);
  const file = useMemo(() => exportThemeCss(theme), [theme]);
  const changes = useMemo(() => diffTheme(theme, base), [theme, base]);
  const startName = preset === null ? "your paste" : PRESETS[preset]!.name;
  const changesFile = useMemo(() => exportChangesCss(changes, startName), [changes, startName]);

  const stage = useRef<HTMLDivElement>(null);
  const variants = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    applyStageTheme(theme, el);
    if (variants.current) applyStageTheme(theme, variants.current);
  }, [theme]);
  useLayoutEffect(
    () => () => {
      if (stage.current) clearStageTheme(stage.current);
      if (variants.current) clearStageTheme(variants.current);
    },
    []
  );
  const tweak = (name: string, value: string) => setTweaks((prev) => ({ ...prev, [name]: value }));

  const contrastIssues = theme.contrast.filter((c) => !c.ok).length;
  const notes = theme.warnings.filter((w) => !/:1 \(needs /.test(w));

  const download = (text = file) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/css" }));
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
            Start from one of the identities or paste a{" "}
            <a href="https://tweakcn.com" className="text-foreground underline underline-offset-4">
              TweakCN
            </a>{" "}
            or shadcn theme, tweak the colours and the identity (type, shape, surface, density, motion, HUD), and watch the kit change on a game screen. Pick a treatment, then drag the levers. The checks are the ones your server runs. Download
            theme.css, drop it in <code className="font-mono text-foreground">nuikit/theme.css</code> and run{" "}
            <code className="font-mono text-foreground">nuikit theme reload</code>. New to this?{" "}
            <a href="/language" className="text-foreground underline underline-offset-4">
              Your language in an hour
            </a>
            .
          </p>
        </header>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
          <div className="flex flex-col gap-6 lg:sticky lg:top-20">
            <GameStage stageRef={stage}>
              <ThemePreview />
            </GameStage>
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>Variants on this theme</CardTitle>
                <CardDescription>What a UI can still pick per component over the theme: size, density, shape, motion.</CardDescription>
              </CardHeader>
              <CardContent className="px-5">
                <div ref={variants} className="rounded-lg bg-background p-5 font-(family-name:--font-sans) text-foreground">
                  <VariantsDemo />
                </div>
              </CardContent>
            </Card>
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
                <CardDescription>Every nuikit identity (type, shape, surface, density, motion and HUD, not just colour), then colour-only presets. One click loads it; tweaks start from there.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-5">
                {PRESETS.map((t, i) => (
                  <Fragment key={t.name}>
                  {i === identities.length && <span className="basis-full" />}
                  <Button
                    key={t.name}
                    variant={preset === i ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPreset(i);
                      setCss(t.css);
                      setTweaks({});
                      setTreatment(null);
                    }}
                  >
                    <span className="flex -space-x-1">
                      {t.swatch.map((c, j) => (
                        <span key={j} className="size-3 rounded-(--nk-r-key) ring-2 ring-background" style={{ background: c }} />
                      ))}
                    </span>
                    {t.name}
                  </Button>
                  </Fragment>
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
                    setTreatment(null);
                  }}
                  spellCheck={false}
                  className="h-56 resize-y font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>Treatment</CardTitle>
                <CardDescription>How the palette is drawn: a named set of levers. Anything you set yourself wins over it.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-5">
                <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Treatment">
                  {TREATMENTS.map((t) => (
                    <Button key={t} role="radio" aria-checked={theme.vars["nk-treatment"] === t} variant={theme.vars["nk-treatment"] === t ? "secondary" : "outline"} size="sm" onClick={() => setTreatment(t)} className="capitalize">
                      {t}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{TREATMENT_INFO[(theme.vars["nk-treatment"] as Treatment) ?? "soft"]}</p>
              </CardContent>
            </Card>
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>1 · Identity</CardTitle>
                <CardDescription>
                  What makes the UI yours besides colour: type, shape, surface, density, motion and the HUD. Each control sets one token; the compiler derives
                  the rest and warns when a floor is crossed.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 px-5">
                {IDENTITY.map((g) => (
                  <div key={g.group} className="flex flex-col gap-3">
                    <p className="text-xs font-medium text-muted-foreground">{g.group}</p>
                    {g.controls.map((c) => (
                      <IdentityField key={c.name} control={c} value={theme.vars[c.name]} tweaked={c.name in tweaks} onChange={(v) => tweak(c.name, v)} />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle className="flex items-center justify-between">
                  2 · Colours
                  {Object.keys(tweaks).length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => { setTweaks({}); setTreatment(null); }}>
                      <RotateCcwIcon /> Undo tweaks
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>The semantic tokens: what each colour means (surfaces, actions, status, the game). A tweak sets the token outright, on top of the paste.</CardDescription>
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
              </CardContent>
            </Card>
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>3 · Components</CardTitle>
                <CardDescription>
                  One part of the kit, set outright. Left alone, each follows the identity above (density, radius, gauges); a UI can still pick a
                  variant per component (density, shape, motion) on top.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 px-5">
                {COMPONENTS.map((g) => (
                  <div key={g.group} className="flex flex-col gap-3">
                    <p className="text-xs font-medium text-muted-foreground">{g.group}</p>
                    {g.controls.map((c) => (
                      <IdentityField key={c.name} control={c} value={theme.vars[c.name]} tweaked={c.name in tweaks} onChange={(v) => tweak(c.name, v)} />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>


            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>4 · Levers</CardTitle>
                <CardDescription>
                  Geometry, type voices, fills, selection and motion: every one a token a theme file may set (
                  <a href="https://github.com/belibathan/nuikit/blob/main/docs/design/levers.md" className="underline underline-offset-4">levers.md</a>). A dot marks what you moved.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 px-5">
                {LEVERS.map((g) => (
                  <div key={g.group} className="flex flex-col gap-3">
                    <p className="text-xs font-medium text-muted-foreground">{g.group}</p>
                    {g.controls.map((c) => (
                      <IdentityField key={c.name} control={c} value={theme.vars[c.name]} tweaked={c.name in tweaks} onChange={(v) => tweak(c.name, v)} />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle>Only what you changed</CardTitle>
                <CardDescription>
                  Diffed against {startName}: {changes.length} {changes.length === 1 ? "value" : "values"}, values only, in <code className="font-mono">@layer nk.theme</code>. Keep the base theme and layer this on top.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-5">
                {changes.length > 0 && (
                  <ul className="max-h-48 overflow-auto font-mono text-xs">
                    {changes.map((c) => (
                      <li key={c.name} className="flex gap-2 py-0.5">
                        <span className="truncate">--{c.name}</span>
                        <span className="ml-auto shrink-0 text-muted-foreground">
                          {c.from ?? "unset"} → <span className="text-foreground">{c.to}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => download(changesFile)}>
                    <DownloadIcon /> Download changes
                  </Button>
                  <CopyThemeButton text={changesFile} label="Copy changes" />
                </div>
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
                <Button className="flex-1" onClick={() => download()}>
                  <DownloadIcon /> Download theme.css
                </Button>
                <CopyThemeButton text={file} />
              </CardContent>
            </Card>
          </div>
        </div>
        <LanguageStrip />
      </main>
      <Footer />
    </div>
  );
}

/** One identity control: a slider with its unit, a segmented choice, or a font select. */
function IdentityField({ control: c, value, tweaked, onChange }: { control: IdentityControl; value: string | undefined; tweaked: boolean; onChange: (v: string) => void }) {
  const dot = tweaked ? <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Tweaked" /> : null;
  if (c.kind === "range") {
    return (
      <SliderField
        label={
          <span className="flex items-center gap-2">
            {c.label}
            {dot}
          </span>
        }
        description={c.hint}
        min={c.min}
        max={c.max}
        step={c.step}
        value={identityNumber(value, c.def ?? c.min)}
        format={(n) => identityValue(c, n)}
        onValueChange={(n) => onChange(identityValue(c, n))}
      />
    );
  }
  if (c.kind === "choice") {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm">
          {c.label}
          {dot}
        </span>
        <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
          {c.options.map((o) => (
            <Button key={o.value} role="radio" aria-checked={value === o.value} variant={value === o.value ? "secondary" : "ghost"} size="sm" onClick={() => onChange(o.value)}>
              {o.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  const current = fontChoice(value);
  return (
    <SelectField
      label={
        <span className="flex items-center gap-2">
          {c.label}
          {dot}
        </span>
      }
      description={c.hint}
      placeholder={current === null && value ? value.split(",")[0]!.replace(/"/g, "") : "Pick a font"}
      options={FONT_CHOICES.map((f) => ({ value: f.value, label: f.label }))}
      value={current}
      onValueChange={(v) => v && onChange(v)}
    />
  );
}

/** Copies theme.css, and says so for a moment. */
function CopyThemeButton({ text, label = "Copy theme.css" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
      {done ? "Copied" : label}
    </Button>
  );
}

import dayjs from "dayjs";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type View = "days" | "years" | "decades";

const YEARS = 24; // a year page: 6 rows of 4
const DECADES = 12; // a decade page: 3 rows of 4

/** The month a closed picker opens on: the value, else today kept inside min/max. */
function openingMonth(value: Date | null, min?: Date, max?: Date): Date {
  const base = value ?? (max && dayjs(max).isBefore(dayjs(), "day") ? max : min && dayjs(min).isAfter(dayjs(), "day") ? min : new Date());
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

/** Parse what the player typed: YYYY-MM-DD, or the row's own display format. Strict. */
function parseTyped(text: string, format: string): Date | null {
  const d = dayjs(text.trim(), ["YYYY-MM-DD", format], true);
  return d.isValid() ? d.toDate() : null;
}

/**
 * The input dialog's `date` row: type the date (YYYY-MM-DD or the row's `format`), or pick it.
 * The picker steps up like Mantine's: click the header in the day view for a page of years, and
 * again for decades; pick a decade, then a year, then a day. Dates and years outside min/max are
 * disabled. It opens on the value (ox's `default`), or on max when that is in the past (Qbox's
 * birth date: max 2006-12-31). No native date input (Chromium 103), all buttons, keyboard usable.
 */
export function DatePicker({
  value,
  onChange,
  format,
  min,
  max,
  disabled,
  invalid,
  clearable,
  placeholder,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  format: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: React.ReactNode;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("days");
  const [cursor, setCursor] = useState(() => openingMonth(value, min, max));
  const [page, setPage] = useState(0); // first year (years view) or first decade (decades view)
  const [text, setText] = useState(value ? dayjs(value).format(format) : "");
  const [typing, setTyping] = useState(false);

  // Shown text follows the value unless the player is typing.
  useEffect(() => {
    if (!typing) setText(value ? dayjs(value).format(format) : "");
  }, [value, format, typing]);

  const minY = min?.getFullYear() ?? -Infinity;
  const maxY = max?.getFullYear() ?? Infinity;
  const typedBad = typing && text.trim() !== "" && !parseTyped(text, format);

  const show = (next: boolean) => {
    if (next) {
      setView("days");
      setCursor(openingMonth(value, min, max));
    }
    setOpen(next);
  };

  const up = () => {
    if (view === "days") {
      setPage(cursor.getFullYear() - 20);
      setView("years");
    } else if (view === "years") {
      setPage(Math.floor(page / 10) * 10 - 80);
      setView("decades");
    }
  };

  const step = (dir: -1 | 1) => {
    if (view === "days") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else setPage(page + dir * (view === "years" ? YEARS : DECADES * 10));
  };

  // Arrows that would only lead to disabled pages are off.
  const prevOff =
    view === "days" ? !!min && !dayjs(cursor).isAfter(min, "month") : view === "years" ? page <= minY : page <= minY - 9;
  const nextOff =
    view === "days"
      ? !!max && !dayjs(cursor).isBefore(max, "month")
      : view === "years"
        ? page + YEARS - 1 >= maxY
        : page + DECADES * 10 - 1 >= maxY;

  const title =
    view === "days"
      ? dayjs(cursor).format("MMMM YYYY")
      : view === "years"
        ? `${page} – ${page + YEARS - 1}`
        : `${page} – ${page + DECADES * 10 - 1}`;

  const pickYear = (y: number) => {
    // keep the month, inside min/max
    let d = new Date(y, cursor.getMonth(), 1);
    if (min && dayjs(d).isBefore(min, "month")) d = new Date(min.getFullYear(), min.getMonth(), 1);
    if (max && dayjs(d).isAfter(max, "month")) d = new Date(max.getFullYear(), max.getMonth(), 1);
    setCursor(d);
    setView("days");
  };

  const cell = (key: number, label: string, selected: boolean, off: boolean, pick: () => void) => (
    <Button
      key={key}
      type="button"
      variant={selected ? "default" : "ghost"}
      disabled={off}
      onClick={pick}
      className="h-(--cell-size) px-0 font-normal nk-num"
    >
      {label}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={show}>
      <PopoverAnchor asChild>
        <div className="flex min-w-0 flex-1 gap-(--nk-gap-items)">
          <Input
            disabled={disabled}
            aria-invalid={invalid || typedBad || undefined}
            placeholder={placeholder ?? format}
            value={text}
            inputMode="numeric"
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              // A full date sets the value (min/max are checked on submit, as for a picked date);
              // anything else that isn't empty is no date.
              onChange(next.trim() === "" ? null : parseTyped(next, format));
            }}
          />
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label="Pick a date" className="shrink-0">
              <CalendarIcon />
            </Button>
          </PopoverTrigger>
          {clearable}
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col gap-2 p-3 [--cell-size:--spacing(8)]">
          <div className="flex w-[calc(var(--cell-size)*7)] items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-(--cell-size)" disabled={prevOff} onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-(--cell-size) flex-1 font-medium"
              disabled={view === "decades"}
              onClick={up}
              aria-label={view === "days" ? `${title}: choose a year` : view === "years" ? `${title}: choose a decade` : title}
            >
              {title}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-(--cell-size)" disabled={nextOff} onClick={() => step(1)} aria-label="Next">
              <ChevronRightIcon />
            </Button>
          </div>

          {view === "days" && (
            <Calendar
              mode="single"
              className="p-0"
              hideNavigation
              classNames={{ month_caption: "hidden" }}
              month={cursor}
              onMonthChange={setCursor}
              selected={value ?? undefined}
              onSelect={(d: Date | undefined) => {
                onChange(d ?? null);
                if (d) setOpen(false);
              }}
              disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
            />
          )}

          {view === "years" && (
            <div className="grid w-[calc(var(--cell-size)*7)] grid-cols-4 gap-1" role="grid" aria-label="Years">
              {Array.from({ length: YEARS }, (_, i) => page + i).map((y) =>
                cell(y, String(y), value?.getFullYear() === y, y < minY || y > maxY, () => pickYear(y)),
              )}
            </div>
          )}

          {view === "decades" && (
            <div className="grid w-[calc(var(--cell-size)*7)] grid-cols-4 gap-1" role="grid" aria-label="Decades">
              {Array.from({ length: DECADES }, (_, i) => page + i * 10).map((d) =>
                cell(d, `${d}s`, !!value && Math.floor(value.getFullYear() / 10) * 10 === d, d + 9 < minY || d > maxY, () => {
                  setPage(d);
                  setView("years");
                }),
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


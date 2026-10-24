/** Form field: one row of a game form (label row, the control, the note under it) and the controls' own sizes. */
import { color, css, length, number, pal, ref, string, type ComponentDef } from "../lang";

export const formField: ComponentDef = {
  description: "One row of a game form: a label row over (or beside) the control, then a description or an error; text, number, select, date, time and colour controls",
  inherits: ["field"],
  // render order: the label row (label, hint, the end cluster with the value), the control and what sits in it, the note
  anatomy: ["label", "hint", "end", "value", "row", "trail", "control", "icon", "stepper", "reveal", "segment", "meridiem", "clear", "date-picker", "swatch", "swatches", "description", "error"],
  parts: {
    label: {
      gap: length(ref("space.1"), "Between the name and its required mark"),
      size: length(ref("text.label"), "The label's size"),
      leading: length(ref("leading.tight"), "The label's line height over a control"),
      "leading-row": length(ref("leading.normal"), "The label's line height beside a control (checkbox, switch)"),
    },
    hint: {
      size: length(ref("text.label"), "The hint's size"),
      leading: length(ref("leading.tight"), "The hint's line height"),
      color: color(pal("muted-foreground"), "The hint's ink"),
    },
    end: { gap: length(ref("space.1"), "Between the reset button and the value") },
    value: {
      size: length(ref("text.label"), "The value text's size"),
      leading: length(ref("leading.tight"), "The value text's line height"),
      color: color(pal("muted-foreground"), "The value text's ink"),
    },
    row: {
      gap: length(ref("space.2"), "Between the control, the label and the hint on a row (checkbox, switch)"),
      height: length(ref("height.key"), "A row's minimum height, so an icon-xs button never moves it"),
    },
    trail: { gap: length(ref("space.2"), "Between the value and the control at a switch row's end") },
    control: {
      height: length(ref("height.control"), "A segmented control's height (date, time)"),
      size: length(ref("text.label"), "A segmented control's text size"),
      gap: length(ref("space.1"), "Between a segmented control's parts"),
      "pad-x": length(ref("gap.pad-x"), "A segmented control's inline padding"),
      "pad-x-dense": length(ref("space.2"), "The same, dense (a range)"),
      "affix-password": length("2.5rem", "Room at a password field's end for the reveal button", { floor: true }),
      "affix-stepper": length("3.5rem", "Room at a number field's end for the inline stepper", { floor: true }),
    },
    icon: {
      size: length(ref("icon.md"), "A control's leading icon"),
      color: color(pal("muted-foreground"), "A control's leading icon ink"),
      inset: length(ref("space.3"), "How far a text or number field's icon sits from its start"),
      gap: length(ref("space.1"), "Between a segmented control's icon and its first segment"),
      pad: length(css`calc(${ref("form-field.icon.inset")} + ${ref("form-field.icon.size")} + ${ref("space.2")})`, "A text or number field's start padding when it has an icon"),
    },
    stepper: {
      inset: length(ref("space.1"), "How far the inline stepper sits from the field's end"),
      gap: length(ref("space.1"), "Between the stepper's two buttons"),
    },
    reveal: { inset: length("0.375rem", "How far the password reveal button sits from the field's end", { floor: true }) },
    segment: {
      sep: color(pal("muted-foreground"), "A segmented control's separators (/ : -)"),
    },
    meridiem: {
      gap: length(ref("space.1"), "Between the time segments and AM / PM"),
      "pad-x": length(ref("space.1"), "The AM / PM button's inline padding"),
      size: length(ref("text.label"), "The AM / PM text size"),
      weight: number(ref("type.label.weight"), "The AM / PM weight", { range: [100, 900] }),
      color: color(pal("muted-foreground"), "The AM / PM ink at rest"),
    },
    clear: {
      size: length("1.75rem", "The clear button's box", { floor: true }),
      bleed: length("-0.5rem", "How far it reaches into the control's padding", { floor: true }),
      color: color(pal("muted-foreground"), "The clear button's ink"),
    },
    "date-picker": {
      size: length("1.75rem", "The calendar button's box", { floor: true }),
      bleed: length("-0.5rem", "How far it reaches into the control's padding", { floor: true }),
      color: color(pal("muted-foreground"), "The calendar button's ink"),
      cell: length("2rem", "A day, year or decade cell (the grid is seven cells wide)", { floor: true }),
      pad: length(ref("space.3"), "The popover's padding"),
      gap: length(ref("space.2"), "Between the popover's header and grid"),
      step: length(ref("space.1"), "Between the header's buttons and between year and decade cells"),
    },
    swatch: {
      size: length(ref("icon.lg"), "The colour field's preview swatch"),
      inset: length("0.625rem", "How far the preview swatch sits from the field's start", { floor: true }),
      pad: length("2.5rem", "The colour field's start padding (room for the swatch)", { floor: true }),
      empty: string(css`repeating-linear-gradient(135deg, transparent 0 3px, ${pal("border")} 3px 5px)`, "The preview swatch while no colour is set"),
    },
    swatches: {
      gap: length(ref("space.2"), "Between preset swatches"),
      size: length(ref("height.key"), "A preset swatch's box"),
    },
    description: {
      size: length(ref("text.label"), "The description's size"),
      leading: length(ref("leading.tight"), "The description's line height"),
      color: color(pal("muted-foreground"), "The description's ink"),
      indent: length(ref("space.6"), "Its start inset under a checkbox row (aligned with the label)"),
    },
    error: {
      size: length(ref("text.label"), "The error's size"),
      leading: length(ref("leading.tight"), "The error's line height"),
      color: color(pal("destructive"), "The error's ink"),
      indent: length(ref("space.6"), "Its start inset under a checkbox row (aligned with the label)"),
    },
  },
};

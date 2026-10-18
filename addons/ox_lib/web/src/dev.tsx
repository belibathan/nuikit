// ox_lib's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload ox_lib's Lua really sends (docs/ox-lib-protocol.md).
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

const mocks = defineMocks({
  events: {
    notify: [
      { title: "Vehicle stored", description: "Your **Sultan RS** is in the Legion Square garage.", type: "success", position: "top-right" },
      { title: "Not enough cash", description: "You need $2,500 for that.", type: "error", position: "top-right" },
      { title: "Speed camera", description: "Flashed at 92 mph on Great Ocean Hwy", type: "warning", position: "top-right", duration: 6000 },
      { description: "Press **E** to talk", type: "inform", position: "bottom-center", icon: "comment" },
      { id: "fuel", title: "Fuel", description: "Refuelling… 40%", icon: "gas-pump", position: "top-right" },
    ],
    showContext: [
      {
        title: "Garage — Legion Square",
        options: [
          { title: "Sultan RS", description: "Plate 46EEK572 · Stored", icon: "car", arrow: true, metadata: { Fuel: "71%", Engine: "98%", Body: "100%" }, progress: 71, colorScheme: "green" },
          { title: "Bati 801", description: "Plate 08KXR114 · Impounded", icon: "motorcycle", disabled: true },
          { title: "Pegasus delivery", description: "Order a vehicle from the depot", icon: "truck", menu: "depot" },
          { title: "Read-only info", description: "Spots used: 2 / 6", icon: "circle-info", readOnly: true },
        ],
      },
      { title: "Pegasus depot", menu: "garage", options: { Banshee: { description: "$1,250 delivery", icon: "car-side" }, Faggio: { description: "Free", icon: "motorcycle" } } },
    ],
    hideContext: [null],
    setMenu: [
      {
        title: "Vehicle options",
        position: "top-left",
        items: [
          { label: "Engine", icon: "power-off", checked: true },
          { label: "Doors", icon: "door-open", values: ["Front left", "Front right", "Rear left", "Rear right", "Hood", "Trunk"], description: "Open or close a door" },
          { label: "Windows", icon: "window-maximize", values: [{ label: "Down", description: "All windows down" }, { label: "Up", description: "All windows up" }] },
          { label: "Fuel", icon: "gas-pump", progress: 64, colorScheme: "yellow" },
          { label: "Lock vehicle", icon: "lock" },
          { label: "Seat", icon: "chair", values: ["Driver", "Passenger"] },
          { label: "Close", icon: "xmark" },
        ],
      },
    ],
    closeMenu: [null],
    openRadialMenu: [
      {
        items: [
          { label: "Phone", icon: "mobile-screen" },
          { label: "Inventory", icon: "box-open" },
          { label: "Vehicle", icon: "car", menu: "vehicle" },
          { label: "Emotes", icon: "face-smile" },
          { label: "Walk style", icon: "person-walking" },
          { label: "Clothing", icon: "shirt" },
          { label: "Billing", icon: "file-invoice-dollar" },
          { label: "Documents", icon: "id-card" },
        ],
      },
      { sub: true, items: [{ label: "Engine", icon: "power-off" }, { label: "Lock", icon: "lock" }, { label: "Trunk", icon: "box" }] },
      false,
    ],
    openDialog: [
      {
        heading: "Create character",
        rows: [
          { type: "input", label: "First name", placeholder: "Niko", required: true, icon: "user" },
          { type: "input", label: "Last name", placeholder: "Bellic", required: true },
          { type: "date", label: "Date of birth", format: "DD/MM/YYYY", returnString: true, default: "1990-01-01" },
          { type: "select", label: "Nationality", options: [{ value: "us", label: "American" }, { value: "rs", label: "Serbian" }, { value: "mx", label: "Mexican" }], clearable: true },
          { type: "slider", label: "Height (cm)", min: 150, max: 210, default: 178 },
          { type: "checkbox", label: "I agree to the server rules", required: true },
        ],
        options: { size: "sm" },
      },
      {
        heading: "Every field",
        rows: [
          { type: "input", label: "Password", password: true, icon: "lock" },
          { type: "textarea", label: "Bio", description: "Shown on your ID", autosize: true },
          { type: "number", label: "Amount", min: 1, max: 1000, precision: 2, icon: "dollar-sign" },
          { type: "multi-select", label: "Licences", options: [{ value: "car" }, { value: "bike" }, { value: "truck" }, { value: "pilot" }], maxSelectedValues: 3 },
          { type: "color", label: "Paint", format: "rgb", default: "#e11d48" },
          { type: "date-range", label: "Rental", returnString: true },
          { type: "time", label: "Meet at", default: true },
        ],
        options: { size: "md", allowCancel: true },
      },
    ],
    closeInputDialog: [null],
    sendAlert: [
      { header: "Hello there", content: "General Kenobi \n Markdown support!", centered: true, cancel: true },
      {
        header: "Server rules",
        content: "1. **No RDM / VDM**\n2. Stay in character\n3. ~~Metagaming~~ is not allowed\n\n| Offence | Ban |\n|---|---|\n| RDM | 1 day |\n| Exploits | Perm |",
        size: "lg",
        labels: { confirm: "I understand" },
      },
    ],
    closeAlertDialog: [null],
    progress: [{ label: "Repairing engine", duration: 4000 }, { label: "Picking lock", duration: 1500 }],
    circleProgress: [{ label: "Drinking water", duration: 3000 }, { label: "Searching", duration: 5000, position: "bottom" }],
    progressCancel: [null],
    startSkillCheck: [{ difficulty: "easy" }, { difficulty: ["easy", "medium", "hard"], inputs: ["w", "a", "s", "d"] }, { difficulty: { areaSize: 60, speedMultiplier: 0.5 } }],
    skillCheckCancel: [null],
    textUi: [
      { text: "[E] - Open garage", icon: "warehouse" },
      { text: "**[E]** Pick up", position: "bottom-center", icon: "hand" },
      { text: "Press [G] to unlock", position: "top-center", icon: "lock", iconColor: "#f59e0b", style: "border-radius: 0" },
    ],
    textUiHide: [null],
    setClipboard: ["vector3(215.76, -810.12, 30.73)"],
  },
});

export default function Dev() {
  useEffect(() => {
    // Lua does this in reply to `init`
    emit("setLocale", { language: "English", ui: { cancel: "Cancel", confirm: "Confirm", more: "More..." } } as never);
  }, []);
  return <NuiDevtools events={mocks.events as never} scene="night" />;
}

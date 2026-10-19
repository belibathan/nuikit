/**
 * The kit's one motion for things that stay mounted through an exit (usePresence): nk-enter on
 * open, a 100 ms fade on close. ox_lib times callbacks off the exit, so it must stay ≤ 100 ms.
 */
export const presenceMotion =
  "data-[state=open]:nk-enter data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:duration-100 data-[state=closed]:fill-mode-forwards";

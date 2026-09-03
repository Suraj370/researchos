/** The real pipeline's phases, in order - shared by the live status→timeline mapping and the DB-record adapter. */
export const PHASE_STEPS = [
  { id: "initializing", name: "Initialized" },
  { id: "searching", name: "Searching" },
  { id: "normalizing", name: "Normalizing" },
  { id: "storing", name: "Storing" },
  { id: "analyzing", name: "Analyzing" },
] as const

export const PHASE_PROGRESS: Record<(typeof PHASE_STEPS)[number]["id"], number> = {
  initializing: 6,
  searching: 30,
  normalizing: 55,
  storing: 70,
  analyzing: 90,
}

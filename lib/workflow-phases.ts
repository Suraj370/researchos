/** The real pipeline's phases, in order - shared by the live status→timeline mapping and the DB-record adapter. */
export const PHASE_STEPS = [
  { id: "initializing", name: "Initialized" },
  { id: "planning", name: "Planning" },
  { id: "searching", name: "Searching" },
  { id: "evaluating", name: "Evaluating" },
  { id: "normalizing", name: "Normalizing" },
  { id: "storing", name: "Storing" },
  { id: "analyzing", name: "Analyzing" },
] as const

export const PHASE_PROGRESS: Record<(typeof PHASE_STEPS)[number]["id"], number> = {
  initializing: 5,
  planning: 15,
  searching: 40,
  evaluating: 55,
  normalizing: 70,
  storing: 80,
  analyzing: 92,
}

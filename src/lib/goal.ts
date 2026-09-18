/** The daily-goal shortcuts offered by the create/edit form. */
export const GOAL_PRESETS = ['None', '5', '8', '10', 'Custom'] as const

export type GoalPreset = (typeof GOAL_PRESETS)[number]

/** Maps a stored goal back onto the segmented control. */
export function presetForGoal(goal: number | null): GoalPreset {
  if (goal === null) return 'None'
  const asPreset = String(goal) as GoalPreset
  return GOAL_PRESETS.includes(asPreset) ? asPreset : 'Custom'
}

export function goalForPreset(preset: GoalPreset, customValue: number): number | null {
  if (preset === 'None') return null
  if (preset === 'Custom') return customValue
  return Number(preset)
}

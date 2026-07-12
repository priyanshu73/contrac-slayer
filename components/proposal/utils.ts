/** Shared helpers for the proposal builder modules. */

/** Generate a short, collision-unlikely id for a block/annotation/overlay. */
export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

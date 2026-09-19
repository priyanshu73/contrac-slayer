/**
 * AG-UI Protocol 1.0 - Real-Time Shared State & RFC 6902 JSON Patch Engine.
 * 
 * Provides reactive cross-component state synchronization between Bob AI
 * and active forms (Quote Creator, Proposal Builder, etc.) with revision validation,
 * snapshot restoration, and RFC 6902 compliant patch execution.
 */

export type JsonPatchOp = "add" | "remove" | "replace" | "move" | "copy" | "test"

export interface JsonPatch {
  op: JsonPatchOp
  path: string
  from?: string // Required for move and copy
  value?: any
}

export interface StateSnapshotEvent {
  type: "STATE_SNAPSHOT"
  threadId?: string
  runId?: string
  revision: number
  snapshot: Record<string, any>
}

export interface StateDeltaEvent {
  type?: "STATE_DELTA"
  threadId?: string
  runId?: string
  revision?: number
  entityType?: string
  delta: JsonPatch[]
  reason?: string
}

export interface StateRecoveryEvent {
  type: "STATE_RECOVERY_REQUIRED"
  reason: string
  failedRevision?: number
  expectedRevision?: number
}

function decodePointer(part: string): string {
  return part.replace(/~1/g, "/").replace(/~0/g, "~")
}

function parsePath(path: string): string[] {
  if (!path || path === "/") return []
  return path.replace(/^\//, "").split("/").map(decodePointer)
}

function deepClone<T>(val: T): T {
  if (val === undefined) return undefined as any
  return JSON.parse(JSON.stringify(val))
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== "object" || typeof b !== "object") return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) {
      return false
    }
  }
  return true
}

function getValueAtPath(target: any, pathParts: string[]): any {
  let curr = target
  for (const part of pathParts) {
    if (curr == null) return undefined
    if (Array.isArray(curr)) {
      const idx = Number(part)
      if (!Number.isInteger(idx) || idx < 0 || idx >= curr.length) return undefined
      curr = curr[idx]
    } else if (typeof curr === "object") {
      curr = curr[part]
    } else {
      return undefined
    }
  }
  return curr
}

/**
 * Apply a sequence of RFC 6902 JSON Patches immutably to a target state object.
 * Throws an Error if any patch operation is invalid or fails (e.g. test mismatch).
 */
export function applyJsonPatch<T extends Record<string, any>>(target: T, patches: JsonPatch[]): T {
  if (!patches || !Array.isArray(patches) || patches.length === 0) {
    return target
  }

  let current = deepClone(target)

  for (let i = 0; i < patches.length; i++) {
    const patch = patches[i]
    if (!patch || !patch.op || typeof patch.path !== "string") {
      throw new Error(`Invalid patch at index ${i}: missing op or path`)
    }

    const pathParts = parsePath(patch.path)

    switch (patch.op) {
      case "add": {
        current = applyAdd(current, pathParts, patch.value)
        break
      }
      case "remove": {
        current = applyRemove(current, pathParts)
        break
      }
      case "replace": {
        current = applyReplace(current, pathParts, patch.value)
        break
      }
      case "move": {
        if (!patch.from || typeof patch.from !== "string") {
          throw new Error(`Move operation at index ${i} missing 'from' path`)
        }
        const fromParts = parsePath(patch.from)
        const valToMove = getValueAtPath(current, fromParts)
        if (valToMove === undefined) {
          throw new Error(`Move operation failed: path '${patch.from}' does not exist`)
        }
        current = applyRemove(current, fromParts)
        current = applyAdd(current, pathParts, valToMove)
        break
      }
      case "copy": {
        if (!patch.from || typeof patch.from !== "string") {
          throw new Error(`Copy operation at index ${i} missing 'from' path`)
        }
        const fromParts = parsePath(patch.from)
        const valToCopy = getValueAtPath(current, fromParts)
        if (valToCopy === undefined) {
          throw new Error(`Copy operation failed: path '${patch.from}' does not exist`)
        }
        current = applyAdd(current, pathParts, deepClone(valToCopy))
        break
      }
      case "test": {
        const valToTest = getValueAtPath(current, pathParts)
        if (!deepEqual(valToTest, patch.value)) {
          throw new Error(
            `Test operation failed at path '${patch.path}': expected ${JSON.stringify(patch.value)}, got ${JSON.stringify(valToTest)}`
          )
        }
        break
      }
      default:
        throw new Error(`Unsupported patch operation '${patch.op}' at index ${i}`)
    }
  }

  return current
}

function applyAdd(target: any, pathParts: string[], value: any): any {
  if (pathParts.length === 0) {
    return value
  }

  const [head, ...tail] = pathParts

  if (tail.length === 0) {
    if (Array.isArray(target)) {
      const arr = [...target]
      if (head === "-") {
        arr.push(value)
      } else {
        const idx = Number(head)
        if (!Number.isInteger(idx) || idx < 0 || idx > arr.length) {
          throw new Error(`Array index out of bounds for add: ${head}`)
        }
        arr.splice(idx, 0, value)
      }
      return arr
    } else if (typeof target === "object" && target !== null) {
      return { ...target, [head]: value }
    }
    throw new Error(`Cannot add property '${head}' to non-object`)
  }

  if (Array.isArray(target)) {
    const idx = Number(head)
    if (!Number.isInteger(idx) || idx < 0 || idx >= target.length) {
      throw new Error(`Array index out of bounds for traversal: ${head}`)
    }
    const arr = [...target]
    arr[idx] = applyAdd(arr[idx], tail, value)
    return arr
  } else if (typeof target === "object" && target !== null) {
    const obj = { ...target }
    obj[head] = applyAdd(obj[head] !== undefined ? obj[head] : {}, tail, value)
    return obj
  }

  throw new Error(`Cannot traverse non-object at '${head}'`)
}

function applyRemove(target: any, pathParts: string[]): any {
  if (pathParts.length === 0) {
    return undefined
  }

  const [head, ...tail] = pathParts

  if (tail.length === 0) {
    if (Array.isArray(target)) {
      const idx = Number(head)
      if (!Number.isInteger(idx) || idx < 0 || idx >= target.length) {
        throw new Error(`Array index out of bounds for remove: ${head}`)
      }
      const arr = [...target]
      arr.splice(idx, 1)
      return arr
    } else if (typeof target === "object" && target !== null) {
      if (!(head in target)) {
        throw new Error(`Property '${head}' does not exist for remove`)
      }
      const obj = { ...target }
      delete obj[head]
      return obj
    }
    throw new Error(`Cannot remove property '${head}' from non-object`)
  }

  if (Array.isArray(target)) {
    const idx = Number(head)
    if (!Number.isInteger(idx) || idx < 0 || idx >= target.length) {
      throw new Error(`Array index out of bounds for traversal: ${head}`)
    }
    const arr = [...target]
    arr[idx] = applyRemove(arr[idx], tail)
    return arr
  } else if (typeof target === "object" && target !== null) {
    const obj = { ...target }
    obj[head] = applyRemove(obj[head], tail)
    return obj
  }

  throw new Error(`Cannot traverse non-object at '${head}'`)
}

function applyReplace(target: any, pathParts: string[], value: any): any {
  if (pathParts.length === 0) {
    return value
  }

  const [head, ...tail] = pathParts

  if (tail.length === 0) {
    if (Array.isArray(target)) {
      const idx = Number(head)
      if (!Number.isInteger(idx) || idx < 0 || idx >= target.length) {
        throw new Error(`Array index out of bounds for replace: ${head}`)
      }
      const arr = [...target]
      arr[idx] = value
      return arr
    } else if (typeof target === "object" && target !== null) {
      if (!(head in target)) {
        throw new Error(`Property '${head}' does not exist for replace`)
      }
      return { ...target, [head]: value }
    }
    throw new Error(`Cannot replace property '${head}' on non-object`)
  }

  if (Array.isArray(target)) {
    const idx = Number(head)
    if (!Number.isInteger(idx) || idx < 0 || idx >= target.length) {
      throw new Error(`Array index out of bounds for traversal: ${head}`)
    }
    const arr = [...target]
    arr[idx] = applyReplace(arr[idx], tail, value)
    return arr
  } else if (typeof target === "object" && target !== null) {
    const obj = { ...target }
    obj[head] = applyReplace(obj[head], tail, value)
    return obj
  }

  throw new Error(`Cannot traverse non-object at '${head}'`)
}

type DeltaListener = (event: StateDeltaEvent) => void
type SnapshotListener = (event: StateSnapshotEvent) => void
type RecoveryListener = (event: StateRecoveryEvent) => void

class AgUiStateManager {
  private currentRevision: number = 0
  private currentState: Record<string, any> = {}
  private appliedRevisions: Set<number> = new Set()

  private deltaListeners: Set<DeltaListener> = new Set()
  private snapshotListeners: Set<SnapshotListener> = new Set()
  private recoveryListeners: Set<RecoveryListener> = new Set()

  /**
   * Current monotonic state revision.
   */
  getRevision(): number {
    return this.currentRevision
  }

  /**
   * Retrieve current snapshot state copy.
   */
  getState(): Record<string, any> {
    return deepClone(this.currentState)
  }

  /**
   * Reset local state from a server snapshot.
   */
  applySnapshot(snapshot: Record<string, any>, revision: number = 0, threadId?: string, runId?: string): void {
    this.currentState = deepClone(snapshot || {})
    this.currentRevision = revision
    this.appliedRevisions.clear()
    this.appliedRevisions.add(revision)

    const event: StateSnapshotEvent = {
      type: "STATE_SNAPSHOT",
      threadId,
      runId,
      revision,
      snapshot: this.currentState,
    }

    this.snapshotListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error("Error in AgUiState snapshot listener:", err)
      }
    })
  }

  /**
   * Apply an RFC 6902 state delta event with revision validation.
   */
  applyDelta(event: StateDeltaEvent): boolean {
    if (!event.delta || !Array.isArray(event.delta) || event.delta.length === 0) {
      return true
    }

    // Monotonic revision check
    if (event.revision !== undefined) {
      if (this.appliedRevisions.has(event.revision)) {
        console.warn(`[AgUiState] Duplicate patch revision ${event.revision} ignored.`)
        return true
      }

      if (this.currentRevision > 0 && event.revision !== this.currentRevision + 1) {
        console.error(
          `[AgUiState] Revision gap detected! Expected ${this.currentRevision + 1}, received ${event.revision}. Triggering snapshot recovery.`
        )
        this.dispatchRecovery({
          type: "STATE_RECOVERY_REQUIRED",
          reason: `Revision gap: expected ${this.currentRevision + 1}, received ${event.revision}`,
          failedRevision: event.revision,
          expectedRevision: this.currentRevision + 1,
        })
        return false
      }
    }

    try {
      this.currentState = applyJsonPatch(this.currentState, event.delta)
      if (event.revision !== undefined) {
        this.currentRevision = event.revision
        this.appliedRevisions.add(event.revision)
      }

      this.deltaListeners.forEach((listener) => {
        try {
          listener(event)
        } catch (err) {
          console.error("Error in AgUiState delta listener:", err)
        }
      })
      return true
    } catch (err: any) {
      console.error("[AgUiState] Patch application failed:", err.message)
      this.dispatchRecovery({
        type: "STATE_RECOVERY_REQUIRED",
        reason: err.message,
        failedRevision: event.revision,
        expectedRevision: this.currentRevision + 1,
      })
      return false
    }
  }

  private dispatchRecovery(event: StateRecoveryEvent): void {
    this.recoveryListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error("Error in AgUiState recovery listener:", err)
      }
    })
  }

  /**
   * Subscribe to live state delta updates.
   */
  subscribe(listener: DeltaListener): () => void {
    this.deltaListeners.add(listener)
    return () => {
      this.deltaListeners.delete(listener)
    }
  }

  /**
   * Subscribe to state snapshot replacements.
   */
  subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener)
    return () => {
      this.snapshotListeners.delete(listener)
    }
  }

  /**
   * Subscribe to recovery requests when a patch fails or revision gap occurs.
   */
  subscribeRecovery(listener: RecoveryListener): () => void {
    this.recoveryListeners.add(listener)
    return () => {
      this.recoveryListeners.delete(listener)
    }
  }

  /**
   * Backwards compatible dispatch entry point.
   */
  dispatch(event: StateDeltaEvent): void {
    this.applyDelta(event)
  }
}

export const agUiState = new AgUiStateManager()

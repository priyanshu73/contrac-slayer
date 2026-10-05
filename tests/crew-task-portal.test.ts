import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const board = readFileSync(new URL("../app/[locale]/tasks/page.tsx", import.meta.url), "utf8")
const portal = readFileSync(new URL("../app/[locale]/crew/portal/[uuid]/page.tsx", import.meta.url), "utf8")
const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8")

test("board posts a stable crew ID on assignment and clears scope on reassignment", () => {
  assert.match(board, /subcontractor_id: selected\?\.subcontractorId \?\? null/)
  assert.match(board, /assigned_trade_id: null/)
  assert.match(board, /id: `crew:\$\{item\.subcontractor_id\}`/)
})

test("portal renders direct tasks without scope and status update uses crew UUID", () => {
  assert.match(portal, /directTasks\.map\(\(task\)/)
  assert.match(portal, /trades\.length === 0 && directTasks\.length === 0/)
  assert.match(portal, /updatePublicCrewTaskStatus\(uuid, taskId, newStatus\)/)
  assert.match(api, /subcontractors\/public\/\$\{crewUuid\}\/tasks\/\$\{taskId\}/)
})

import assert from "node:assert/strict"
import { test } from "node:test"

import { taskMatchesAssigneeFilter } from "../lib/task-filters"

const tasks = [
  {
    title: "Install cabinets",
    assigned_to: "Alex Crew",
    subcontractor_id: 42,
  },
  {
    title: "Order materials",
    assigned_to: "Office Manager",
    subcontractor_id: null,
  },
]

test("crew assignee filter keeps tasks assigned to the selected crew member", () => {
  const renderedTasks = tasks.filter((task) => taskMatchesAssigneeFilter(task, "crew:42"))

  assert.deepEqual(
    renderedTasks.map((task) => task.title),
    ["Install cabinets"]
  )
})

test("crew assignee filter produces the empty state when that crew member has no tasks", () => {
  const renderedTasks = tasks.filter((task) => taskMatchesAssigneeFilter(task, "crew:99"))

  assert.equal(renderedTasks.length, 0)
})

test("employee assignee filters continue matching the display name", () => {
  const renderedTasks = tasks.filter((task) => taskMatchesAssigneeFilter(task, "Office Manager"))

  assert.deepEqual(
    renderedTasks.map((task) => task.title),
    ["Order materials"]
  )
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { formatCalendarDate, parseCalendarDate } from "../lib/utils"

test("a date-only SQL value renders as its exact calendar day", () => {
  // `new Date("2026-09-28")` is midnight UTC — Sep 27 in the Americas. The
  // calendar-date path must show Sep 28 in every viewer timezone.
  assert.equal(formatCalendarDate("2026-09-28"), "Sep 28, 2026")
  assert.equal(formatCalendarDate("2026-01-01"), "Jan 1, 2026")
  assert.equal(formatCalendarDate("2026-12-31"), "Dec 31, 2026")
})

test("custom format options are honored", () => {
  assert.equal(
    formatCalendarDate("2026-09-28", { month: "numeric", day: "numeric", year: "numeric" }),
    "9/28/2026",
  )
})

test("full timestamps stay on the instant path", () => {
  assert.equal(parseCalendarDate("2026-09-28T03:00:00+00:00"), null)
  assert.equal(
    formatCalendarDate("2026-09-28T03:00:00+00:00", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    "Sep 28, 2026",
  )
})

test("missing and invalid input render as a dash", () => {
  assert.equal(formatCalendarDate(null), "—")
  assert.equal(formatCalendarDate(""), "—")
  assert.equal(formatCalendarDate("not a date"), "—")
  assert.equal(parseCalendarDate("not a date"), null)
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { virtualMeetingDetails } from "../lib/calendar-meeting"

test("Outlook calendar offers Teams with an account-support caveat", () => {
  const meeting = virtualMeetingDetails("outlook")
  assert.equal(meeting.label, "Microsoft Teams")
  assert.match(meeting.note, /supports Teams meetings/)
  assert.doesNotMatch(meeting.note, /Google Meet/)
})

test("Google calendar offers Google Meet", () => {
  const meeting = virtualMeetingDetails("google")
  assert.equal(meeting.label, "Google Meet")
  assert.match(meeting.note, /Google Meet link/)
})

test("An unresolved or disconnected calendar never advertises a provider", () => {
  const meeting = virtualMeetingDetails(null)
  assert.equal(meeting.label, "Video meeting")
  assert.match(meeting.note, /Connect Google or Outlook/)
})

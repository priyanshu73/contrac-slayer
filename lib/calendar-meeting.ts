export type CalendarProvider = "google" | "outlook" | null

export function virtualMeetingDetails(provider: CalendarProvider) {
  if (provider === "outlook") {
    return {
      label: "Microsoft Teams",
      note: "A Teams link will be added to the Outlook calendar invite if your connected Microsoft account supports Teams meetings. Otherwise, the invite will not include a meeting link.",
    }
  }
  if (provider === "google") {
    return {
      label: "Google Meet",
      note: "A Google Meet link will be automatically generated and added to the calendar invite.",
    }
  }
  return {
    label: "Video meeting",
    note: "Connect Google or Outlook in Settings to create a calendar invite with a video meeting link.",
  }
}

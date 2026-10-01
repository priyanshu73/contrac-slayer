import { createTranslator } from "next-intl"
import messages from "@/messages/en.json"

// Public websites currently use English independently of the editor locale.
// Keeping a shared translator makes the preview match the published website.
export const websitePublicText = createTranslator({
  locale: "en",
  messages: { website: messages.website },
  namespace: "website.public",
})

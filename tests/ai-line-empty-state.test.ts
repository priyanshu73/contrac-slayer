import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createTranslator } from "next-intl"

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("unprovisioned surfaces use the shared number-picker recovery with retry and refresh", () => {
  for (const path of ["components/auto-reply-settings.tsx", "components/followup-settings.tsx", "components/scheduled-followups-list.tsx", "components/frontline/frontline-page.tsx"]) {
    const code = source(path)
    assert.match(code, /<AiLineEmptyState/)
    assert.match(code, /onRetry=/)
    assert.match(code, /onConnected=/)
    assert.match(code, /not linked\|messaging service\|contact not found/)
  }
  const empty = source("components/ai-line-empty-state.tsx")
  assert.match(empty, /setPickerOpen\(true\)/)
  assert.match(empty, /<OpsAiNumberPickerDialog/)
  assert.match(empty, /onSuccess=\{onConnected\}/)
})

test("all new recovery copy exists in English and Spanish without internal admin directions", () => {
  for (const locale of ["en", "es"]) {
    const messages = JSON.parse(source(`messages/${locale}.json`))
    for (const namespace of ["autoReplySettings", "frontline.page", "scheduling.settings", "scheduling.list"]) {
      const t = createTranslator({ locale, messages, namespace })
      for (const key of ["noNumberTitle", "noNumberDesc", "noNumberCta", "noNumberRetry"]) {
        const value = t(key)
        assert.notEqual(value, `${namespace}.${key}`)
        assert.doesNotMatch(value, /Contractor AI admin|contractor profile not linked/i)
      }
    }
  }
  const autoReply = source("components/auto-reply-settings.tsx")
  assert.match(autoReply, /useTranslations\("autoReplySettings"\)/)
  assert.match(autoReply, /t\("recoveryDescription"\)/)
})

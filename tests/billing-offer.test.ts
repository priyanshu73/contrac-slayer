import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("billing UI keeps confirmed production pricing, not sandbox pricing", () => {
  const page = readFileSync(new URL("../app/[locale]/billing/page.tsx", import.meta.url), "utf8")
  assert.match(page, /\$99<\/span>/)
  assert.match(page, /\$85<\/span>/)
  assert.doesNotMatch(page, /\$75|\$900|Save \$24/)
  for (const key of ["monthlyIntroTerm", "monthlyAfterIntro", "yearlySavings"]) {
    assert.ok(page.includes(`t("${key}")`))
  }
  for (const locale of ["en", "es"]) {
    const { billing } = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
    assert.match(billing.monthlyIntroTerm, /3/)
    assert.match(billing.monthlyAfterIntro, /139/)
    assert.match(billing.yearlySavings, /168/)
    assert.match(billing.billedAnnually, /1,020/)
    assert.match(billing.freeTrial, /14/) // Existing frontend trial copy is unchanged.
  }
})

import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import en from '../messages/trade-schools/en.json'
import es from '../messages/trade-schools/es.json'

for (const [locale, data] of [['en', en], ['es', es]] as const) {
  test(`school sample keeps one job and total (${locale})`, () => {
    assert.equal(data.stages.length, 5)
    for (const stage of data.stages) assert.match(stage.html, /Morgan/)
    assert.match(data.stages[3].html, /\$900/)
    assert.match(data.stages[3].html, /\$450/)
    assert.match(data.stages[3].html, /\$1,350/)
    assert.match(data.stages[4].html, /SAMPLE-001/)
    assert.match(data.stages[4].html, /\$0/)
    assert.doesNotMatch(data.stages[1].html, /CALL SUMMARY/)
    assert.doesNotMatch(data.markup, /hero-ctas|mock-note|site-nav/)
    assert.match(data.markup, /\/trade-school-workshop.jpg/)
  })
}
test('inspection occupies only Thursday in the same fictional week', () => {
  assert.equal(new Date('2026-10-12T12:00:00Z').getUTCDay(), 1)
  assert.equal(new Date('2026-10-15T12:00:00Z').getUTCDay(), 4)
  assert.equal(new Date('2026-10-16T12:00:00Z').getUTCDay(), 5)
  assert.match(en.stages[2].html, /THU<small>15/)
  assert.match(en.stages[2].html, /9-10 AM/)
  assert.match(en.stages[3].html, /Thu, Oct 15/)
  assert.match(en.stages[4].html, /Fri, Oct 16/)
  const css = fs.readFileSync('app/[locale]/trade-schools/trade-schools.css', 'utf8')
  assert.match(css, /grid-column:4/)
})
test('public school routes bypass auth and product shell', () => {
  for (const file of ['components/auth-guard.tsx', 'components/conditional-shell.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /enterprise\|trade-schools\|blog/)
  }
})

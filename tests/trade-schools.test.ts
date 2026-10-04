import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import en from '../messages/trade-schools/en.json'
import es from '../messages/trade-schools/es.json'

for (const [locale, data] of [['en', en], ['es', es]] as const) {
  test(`school translations contain text, not markup (${locale})`, () => {
    for (const value of Object.values(data)) {
      assert.equal(typeof value, 'string')
      assert.doesNotMatch(value, /<\/?[a-z][^>]*>/i)
    }
    for (let index = 0; index < 5; index++) {
      for (const field of ['label', 'title', 'desc', 'learn']) assert.ok(data[`stage${index}${field}` as keyof typeof data])
    }
    const text = Object.values(data).join(' ')
    for (const amount of ['$900', '$450', '$1,350', '$0']) assert.ok(text.includes(amount))
    assert.ok(text.includes('Q-001'))
    assert.ok(text.includes('INV-001'))
  })
}
test('sample week aligns Thursday inspection and Friday completion', () => {
  assert.equal(new Date('2026-10-12T12:00:00Z').getUTCDay(), 1)
  assert.equal(new Date('2026-10-15T12:00:00Z').getUTCDay(), 4)
  assert.equal(new Date('2026-10-16T12:00:00Z').getUTCDay(), 5)
  assert.match(en.stage2desc, /Thursday, October 15, 9-10 AM/)
  assert.match(en.stage4desc, /Friday, October 16/)
  assert.match(en.approval, /Sent to Morgan.*approves/)
})
test('page is React rendered, state-driven and non-live', () => {
  const source = fs.readFileSync('components/trade-schools.tsx', 'utf8')
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML|querySelector|aria-live/)
  assert.match(source, /useState/)
  assert.match(source, /aria-selected=\{current===index\}/)
  assert.match(source, /aria-labelledby=\{`tab-\$\{current\}`\}/)
  assert.match(source, /ArrowRight/)
  assert.match(source, /focus\(\{preventScroll:true\}\)/)
})
test('public school routes bypass auth and product shell', () => {
  for (const file of ['components/auth-guard.tsx', 'components/conditional-shell.tsx']) assert.match(fs.readFileSync(file, 'utf8'), /enterprise\|trade-schools\|blog/)
})

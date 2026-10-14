import assert from "node:assert/strict"
import { test } from "node:test"
import { JSDOM } from "jsdom"
import { animateLandingChat } from "../lib/landing-chat"
import { WORK_HTML, RECEP_HTML } from "../components/landing/landing-markup"

function preview(reduce = false, customerLabel = "Customer is typing...") {
  const dom = new JSDOM(`<main>${WORK_HTML}${RECEP_HTML}</main>`)
  const root = dom.window.document.querySelector<HTMLElement>("main")!
  let now = 0
  let id = 0
  let reduced = reduce
  let disconnected = false
  let intersection: IntersectionObserverCallback
  const timers = new Map<number, { at: number; callback: () => void }>()
  const motionListeners = new Set<() => void>()
  Object.defineProperty(dom.window, "matchMedia", { value: () => ({
    get matches() { return reduced },
    addEventListener: (_: string, callback: () => void) => motionListeners.add(callback),
    removeEventListener: (_: string, callback: () => void) => motionListeners.delete(callback),
  }) })
  Object.defineProperty(dom.window, "IntersectionObserver", { value: class {
    constructor(callback: IntersectionObserverCallback) { intersection = callback }
    observe() {}
    disconnect() { disconnected = true }
  } })
  dom.window.setTimeout = ((callback: () => void, delay: number) => {
    timers.set(++id, { at: now + delay, callback })
    return id
  }) as typeof dom.window.setTimeout
  dom.window.clearTimeout = (timerId: number) => { timers.delete(timerId) }
  const advance = (milliseconds: number) => {
    const end = now + milliseconds
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
      if (!next || next[1].at > end) break
      now = next[1].at
      timers.delete(next[0])
      next[1].callback()
    }
    now = end
  }
  const cleanup = animateLandingChat(root, { ai: "Bob is typing...", customer: customerLabel })
  const workspace = root.querySelector<HTMLElement>(".pn[data-seq]")!
  const receptionist = root.querySelector<HTMLElement>(".tr[data-seq]")!
  const enter = (panel: HTMLElement, ratio = 1) => intersection([
    { target: panel, isIntersecting: ratio > 0, intersectionRatio: ratio, boundingClientRect: panel.getBoundingClientRect(), intersectionRect: panel.getBoundingClientRect(), rootBounds: null, time: now },
  ], {} as IntersectionObserver)
  const visible = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>(".lp-msg-visible")].map((el) => el.textContent)
  const typing = (panel: HTMLElement) => panel.querySelector<HTMLElement>(".lp-typing")!
  const motion = (value: boolean) => { reduced = value; motionListeners.forEach((callback) => callback()) }
  return { root, workspace, receptionist, enter, advance, visible, typing, motion, cleanup, timers, motionListeners, disconnected: () => disconnected, close: () => dom.window.close() }
}

test("landing conversation alternates typing and replies, then replays after a readable pause", () => {
  const p = preview(false, "Karen is typing...")
  try {
    assert.deepEqual(p.visible(p.workspace), ["Can we pour the east slab a day early?"])
    p.enter(p.workspace, 0.1)
    p.advance(10000)
    assert.equal(p.visible(p.workspace).length, 1, "does not start before the panel is readable")
    p.enter(p.workspace)
    p.advance(650)
    assert.equal(p.typing(p.workspace).hidden, false)
    assert.match(p.typing(p.workspace).textContent!, /Bob is typing/)
    assert.ok(p.typing(p.workspace).classList.contains("lp-typing-right"))
    p.advance(2549)
    assert.equal(p.visible(p.workspace).length, 1)
    p.advance(1)
    assert.match(p.visible(p.workspace)[1]!, /Sam and Ben/)
    assert.equal(p.typing(p.workspace).hidden, true)
    p.advance(650)
    assert.match(p.typing(p.workspace).textContent!, /Bob is typing/)
    p.advance(2550)
    assert.equal(p.visible(p.workspace)[2], "Reminder: rebar inspection is Wed 8am.")
    p.advance(650)
    assert.match(p.typing(p.workspace).textContent!, /Karen is typing/)
    assert.ok(!p.typing(p.workspace).classList.contains("lp-typing-right"))
    p.advance(2550)
    assert.equal(p.visible(p.workspace)[3], "Got it, see you on site.")
    assert.equal(p.visible(p.workspace).length, 4)
    assert.equal(p.workspace.querySelectorAll(".cb.r").length, 0)
    p.advance(5499)
    assert.equal(p.visible(p.workspace).length, 4)
    p.advance(1)
    assert.equal(p.visible(p.workspace).length, 1)
  } finally { p.cleanup(); p.close() }
})

test("scrolling away cancels queued replies; re-entry and cleanup restore the transcript safely", () => {
  const p = preview()
  try {
    p.enter(p.workspace)
    p.advance(650)
    p.enter(p.workspace, 0)
    assert.equal(p.timers.size, 0)
    assert.equal(p.typing(p.workspace).hidden, true)
    p.advance(20000)
    assert.equal(p.visible(p.workspace).length, 1)
    p.enter(p.workspace)
    p.advance(3200)
    assert.equal(p.visible(p.workspace).length, 2)
    p.cleanup()
    assert.equal(p.timers.size, 0)
    assert.equal(p.motionListeners.size, 0)
    assert.ok(p.disconnected())
    assert.equal(p.root.querySelectorAll(".lp-typing, .lp-msg").length, 0)
    assert.ok([...p.root.querySelectorAll(".cb, .tr > div")].every((message) => !message.hasAttribute("aria-hidden")))
    assert.equal(p.workspace.querySelectorAll(".cb").length, 4)
  } finally { p.close() }
})

test("both examples stay fully readable with reduced motion, including changes during playback", () => {
  const p = preview(true)
  try {
    p.enter(p.workspace)
    p.enter(p.receptionist)
    assert.equal(p.visible(p.workspace).length, 4)
    assert.equal(p.visible(p.receptionist).length, 4)
    assert.equal(p.timers.size, 0)
    p.motion(false)
    p.advance(650)
    assert.equal(p.typing(p.workspace).hidden, false)
    assert.equal(p.typing(p.receptionist).hidden, false)
    p.motion(true)
    assert.equal(p.timers.size, 0)
    assert.equal(p.visible(p.workspace).length, 4)
    assert.equal(p.visible(p.receptionist).length, 4)
    assert.equal(p.typing(p.workspace).hidden, true)
  } finally { p.cleanup(); p.close() }
})

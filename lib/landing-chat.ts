interface ChatLabels {
  ai: string
  customer: string
}

interface ChatPanel {
  element: HTMLElement
  messages: HTMLElement[]
  originalAria: (string | null)[]
  typing: HTMLElement
  label: HTMLElement
  next: number
  timer?: number
  visible: boolean
  running: boolean
}

const TYPING_START_MS = 650
const REPLY_DELAY_MS = 3200
const REPLAY_PAUSE_MS = 5500

/** Plays the landing examples while visible, keeping the complete transcript's layout. */
export function animateLandingChat(root: HTMLElement, labels: ChatLabels): () => void {
  const win = root.ownerDocument.defaultView
  if (!win || !win.IntersectionObserver) return () => {}
  const motion = win.matchMedia("(prefers-reduced-motion: reduce)")
  let reducedMotion = motion.matches
  const panels: ChatPanel[] = []

  root.querySelectorAll<HTMLElement>("[data-seq]").forEach((element) => {
    const messages = Array.from(element.querySelectorAll<HTMLElement>(".cb, .tr > div"))
    if (!messages.length) return
    const typing = root.ownerDocument.createElement("span")
    typing.className = "lp-typing"
    typing.hidden = true
    typing.setAttribute("aria-hidden", "true")
    typing.innerHTML = '<span class="lp-typing-dots"><i></i><i></i><i></i></span>'
    const label = root.ownerDocument.createElement("span")
    label.className = "lp-typing-label"
    typing.append(label)
    element.append(typing)
    element.classList.add("lp-chat")
    panels.push({ element, messages, originalAria: messages.map((message) => message.getAttribute("aria-hidden")), typing, label, next: 1, visible: false, running: false })
    messages.forEach((message) => message.classList.add("lp-msg"))
  })
  if (!panels.length) return () => {}

  const reveal = (panel: ChatPanel, count: number) => {
    panel.messages.forEach((message, index) => {
      message.classList.toggle("lp-msg-visible", index < count)
      message.setAttribute("aria-hidden", String(index >= count))
    })
  }
  const clear = (panel: ChatPanel) => {
    win.clearTimeout(panel.timer)
    panel.timer = undefined
    panel.typing.hidden = true
    panel.running = false
  }
  const positionTyping = (panel: ChatPanel) => {
    const message = panel.messages[panel.next]
    if (!message) return
    const right = message.matches(".bai, .r, .a")
    panel.typing.classList.toggle("lp-typing-right", right)
    panel.typing.style.top = `${message.offsetTop}px`
    panel.typing.style.left = right ? "auto" : `${message.offsetLeft}px`
    panel.typing.style.right = right ? `${panel.element.clientWidth - message.offsetLeft - message.offsetWidth}px` : "auto"
    panel.label.textContent = message.matches(".bai, .a") ? labels.ai : labels.customer
  }
  const queueReply = (panel: ChatPanel) => {
    if (panel.next >= panel.messages.length) {
      panel.timer = win.setTimeout(() => {
        reveal(panel, 1)
        panel.next = 1
        queueReply(panel)
      }, REPLAY_PAUSE_MS)
      return
    }
    panel.timer = win.setTimeout(() => {
      positionTyping(panel)
      panel.typing.hidden = false
      panel.timer = win.setTimeout(() => {
        panel.typing.hidden = true
        reveal(panel, ++panel.next)
        queueReply(panel)
      }, REPLY_DELAY_MS - TYPING_START_MS)
    }, TYPING_START_MS)
  }
  const start = (panel: ChatPanel) => {
    if (reducedMotion || panel.running) return
    panel.running = true
    panel.next = 1
    reveal(panel, 1)
    queueReply(panel)
  }
  panels.forEach((panel) => reveal(panel, reducedMotion ? panel.messages.length : 1))

  const observer = new win.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const panel = panels.find((candidate) => candidate.element === entry.target)
      if (!panel) return
      if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
        panel.visible = true
        start(panel)
      } else if (!entry.isIntersecting) {
        panel.visible = false
        clear(panel)
        reveal(panel, reducedMotion ? panel.messages.length : 1)
      }
    })
  }, { threshold: [0, 0.35] })
  panels.forEach((panel) => observer.observe(panel.element))

  const onMotionChange = () => {
    reducedMotion = motion.matches
    panels.forEach((panel) => {
      clear(panel)
      reveal(panel, reducedMotion ? panel.messages.length : 1)
      if (panel.visible) start(panel)
    })
  }
  const onResize = () => panels.forEach((panel) => {
    if (!panel.typing.hidden) positionTyping(panel)
  })
  motion.addEventListener("change", onMotionChange)
  win.addEventListener("resize", onResize)

  return () => {
    observer.disconnect()
    motion.removeEventListener("change", onMotionChange)
    win.removeEventListener("resize", onResize)
    panels.forEach((panel) => {
      clear(panel)
      panel.typing.remove()
      panel.element.classList.remove("lp-chat")
      panel.messages.forEach((message, index) => {
        message.classList.remove("lp-msg", "lp-msg-visible")
        const original = panel.originalAria[index]
        if (original === null) message.removeAttribute("aria-hidden")
        else message.setAttribute("aria-hidden", original)
      })
    })
  }
}

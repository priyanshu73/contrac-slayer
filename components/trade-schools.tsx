'use client'

import { useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type Stage = { label: string; title: string; desc: string; learn: string; note: string; html: string }

/** Read-only illustrative workflow. Content comes only from bundled translations. */
export function TradeSchools() {
  const t = useTranslations('tradeSchools')
  const locale = useLocale()
  const root = useRef<HTMLDivElement>(null)
  const markup = t.raw('markup') as string
  const stages = t.raw('stages') as Stage[]
  const nextLabels = t.raw('next') as string[]

  useEffect(() => {
    const el = root.current
    if (!el) return
    let current = 0
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-stage]'))
    const show = (index: number, focus = false) => {
      current = index
      const stage = stages[index]
      buttons.forEach((button, n) => {
        button.setAttribute('aria-selected', String(index === n))
        button.tabIndex = index === n ? 0 : -1
      })
      if (focus) buttons[index].focus({ preventScroll: true })
      if (window.innerWidth < 760) buttons[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
      el.querySelector('#stage-panel')?.setAttribute('aria-labelledby', `tab-${index}`)
      const fields = [
        ['.stage-label', stage.label], ['.stage-copy h3', stage.title],
        ['.stage-desc', stage.desc], ['.stage-learn', stage.learn],
        ['.stage-note', stage.note], ['.screen-top span:last-child', `0${index + 1} / 05`],
        ['.next-step', nextLabels[index]],
      ]
      fields.forEach(([selector, text]) => {
        const node = el.querySelector(selector)
        if (node) node.textContent = text
      })
      const screen = el.querySelector('.screen-content')
      if (screen) screen.innerHTML = stage.html
    }
    const handlers = buttons.map((button, index) => {
      button.tabIndex = index === 0 ? 0 : -1
      const handler = () => show(index)
      button.addEventListener('click', handler)
      return handler
    })
    const onKey = (event: KeyboardEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="tab"]')) return
      let index = current
      if (event.key === 'ArrowRight') index = (current + 1) % stages.length
      else if (event.key === 'ArrowLeft') index = (current + stages.length - 1) % stages.length
      else if (event.key === 'Home') index = 0
      else if (event.key === 'End') index = stages.length - 1
      else return
      event.preventDefault()
      show(index, true)
    }
    const next = el.querySelector('.next-step')
    const advance = () => show((current + 1) % stages.length)
    next?.addEventListener('click', advance)
    el.addEventListener('keydown', onKey)
    return () => {
      buttons.forEach((button, index) => button.removeEventListener('click', handlers[index]))
      next?.removeEventListener('click', advance)
      el.removeEventListener('keydown', onKey)
    }
  }, [stages, nextLabels, locale])

  return <div className="trade-school" ref={root} dangerouslySetInnerHTML={{ __html: markup.replaceAll('{locale}', locale) }} />
}

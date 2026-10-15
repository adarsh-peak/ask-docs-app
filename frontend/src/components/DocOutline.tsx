import { useState, useEffect, useRef, type RefObject } from 'react'
import { Popover, Button } from '@radix-ui/themes'
interface Heading { level: number; text: string; id: string }
interface Props { scrollRef: RefObject<HTMLDivElement | null>; contentRef: RefObject<HTMLDivElement | null>; content: string | null }
export function DocOutline({ scrollRef, contentRef, content }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)
  const activeTabRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const counts = new Map<string, number>()
    const found = Array.from(contentRef.current?.querySelectorAll('h1,h2,h3') ?? []).map((el, index) => {
      const text = el.textContent ?? ''
      const base = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || `section-${index}`
      const count = counts.get(base) ?? 0
      counts.set(base, count + 1)
      el.id = `doc-${base}${count ? `-${count}` : ''}`
      return { text, id: el.id, level: Number(el.tagName[1]) }
    })
    setHeadings(found)
    setActive(found[0]?.id ?? '')
  }, [content, contentRef, scrollRef])
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const update = () => {
      const top = scroller.getBoundingClientRect().top + 100
      let current = headings[0]?.id ?? ''
      for (const heading of headings) {
        const element = contentRef.current?.querySelector(`#${CSS.escape(heading.id)}`)
        if (element && element.getBoundingClientRect().top <= top) current = heading.id
      }
      setActive(current)
    }
    scroller.addEventListener('scroll', update, { passive: true })
    update()
    return () => scroller.removeEventListener('scroll', update)
  }, [headings, scrollRef, contentRef])
  const primary = headings.filter(h => h.level === 2)
  const tabs = primary.length ? primary : headings
  const currentIndex = headings.findIndex(h => h.id === active)
  const currentSection = [...(primary.length ? primary : headings)].reverse().find(h => headings.indexOf(h) <= currentIndex)
  const activeTab = currentSection?.id
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [activeTab])
  if (!headings.length) return null
  const navigate = (id: string) => {
    const el = contentRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    if (el) { el.tabIndex = -1; el.focus({ preventScroll: true }) }
    setOpen(false)
  }
  return <nav className="section-rail" aria-label="Document sections">
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button className="section-contents" variant="ghost" color="gray" aria-label="All document sections" title="All document sections">
          <svg className="section-contents-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3.5h10M3 8h10M3 12.5h10" />
            <circle cx="1.5" cy="3.5" r=".6" /><circle cx="1.5" cy="8" r=".6" /><circle cx="1.5" cy="12.5" r=".6" />
          </svg>
        </Button>
      </Popover.Trigger>
      <Popover.Content maxWidth="340px" className="section-menu">
        {headings.map(h => <button key={h.id} onClick={() => navigate(h.id)} aria-current={h.id === active ? 'location' : undefined} style={{ paddingLeft: 12 + (h.level - 1) * 12 }}>{h.text}</button>)}
      </Popover.Content>
    </Popover.Root>
    <div className="section-tabs">
      {tabs.map((h, i) => <button ref={h.id === activeTab ? activeTabRef : undefined} key={h.id} className={`section-tab section-tab--${i % 4}`} onClick={() => navigate(h.id)} title={h.text} aria-current={h.id === activeTab ? 'location' : undefined}><span>{h.level === 1 && h === headings[0] ? 'Overview' : h.text}</span></button>)}
    </div>
  </nav>
}

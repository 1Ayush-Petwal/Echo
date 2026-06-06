import { useState } from 'react'
import Button from '../components/Button'
import ScreenScaffold from '../components/ScreenScaffold'

const TABS = [
  { id: 'reel', label: 'Reel' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'thread', label: 'Thread' },
]

/*
 * Results (§5 + §6). The kit arrives as one JSON object from POST /api/generate
 * (fetched in Loading, passed down via App) and we render each format the way
 * its platform actually looks: Reel as a script block + numbered shot list,
 * Carousel as swipeable IG slides (horizontal snap-scroll), Thread as stacked X
 * cards. Copy-to-clipboard on each. The endpoint returns mock JSON until the
 * event; these renderers don't change when the real model lands.
 */
export default function Results({ onNew, kit }) {
  const [tab, setTab] = useState('reel')

  // Defensive empty state (§7, CP6). The mock always provides a full kit, but
  // CP7 passes a real /api/generate response — a partial/empty one shows this
  // instead of a broken screen.
  if (!kit?.reel || !kit?.carousel || !kit?.thread) {
    return <ResultsEmpty onNew={onNew} />
  }

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Your kit is ready
        </h1>
        <p className="text-sm text-muted">
          Three platform-ready posts, in your voice.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Content formats"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={[
                'rounded-xl py-2 text-sm font-semibold transition duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                active ? 'bg-accent text-white' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div
        key={tab}
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="flex-1 animate-rise"
      >
        {tab === 'reel' && <ReelView reel={kit.reel} />}
        {tab === 'carousel' && <CarouselView carousel={kit.carousel} />}
        {tab === 'thread' && <ThreadView thread={kit.thread} />}
      </div>

      <Button variant="secondary" onClick={onNew}>
        Start a new kit
      </Button>
    </section>
  )
}

/* ---------- Reel: hook + script block + numbered shot list ---------- */

function ReelView({ reel }) {
  const copyText = [
    `Hook: ${reel.hook}`,
    '',
    'Script:',
    reel.script,
    '',
    'Shot list:',
    ...reel.shotList.map((shot, i) => `${i + 1}. ${shot}`),
  ].join('\n')

  return (
    <div className="space-y-4">
      <SectionBar copyText={copyText} copyLabel="script">
        Reel · script + shots
      </SectionBar>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
          Hook
        </p>
        <p className="mt-1.5 text-lg font-semibold leading-snug text-ink text-balance">
          {reel.hook}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Script
        </p>
        <p className="mt-1.5 leading-relaxed text-ink/90">{reel.script}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Shot list
        </p>
        <ol className="space-y-2">
          {reel.shotList.map((shot, i) => {
            const match = shot.match(/^(\d+:\d{2})\s+(.*)$/)
            const time = match?.[1]
            const text = match?.[2] ?? shot
            return (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {time && (
                    <span className="font-mono text-[11px] text-muted">
                      {time}
                    </span>
                  )}
                  <span className="text-sm leading-snug text-ink">{text}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/* ---------- Carousel: swipeable IG slides (horizontal snap-scroll) ---------- */

function CarouselView({ carousel }) {
  const { slides } = carousel
  const total = slides.length
  const copyText = slides
    .map((s, i) => `Slide ${i + 1} — ${s.title}\n${s.body}`)
    .join('\n\n')

  return (
    <div className="space-y-3">
      <SectionBar copyText={copyText} copyLabel="carousel">
        Instagram · {total} slides
      </SectionBar>

      <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((slide, i) => (
          <article
            key={i}
            className="flex aspect-[4/5] shrink-0 basis-[80%] snap-center flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface p-5"
          >
            <span className="text-xs font-semibold tracking-wide text-muted">
              {String(i + 1).padStart(2, '0')}
              <span className="text-muted/50">
                {' '}
                / {String(total).padStart(2, '0')}
              </span>
            </span>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold leading-tight tracking-tight text-ink text-balance">
                {slide.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{slide.body}</p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted/60">
              echo
            </span>
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-muted/70">
        Swipe to see all {total} slides →
      </p>
    </div>
  )
}

/* ---------- Thread: stacked tweet-style cards ---------- */

function ThreadView({ thread }) {
  const { tweets } = thread
  const copyText = tweets.join('\n\n')

  return (
    <div className="space-y-3">
      <SectionBar copyText={copyText} copyLabel="thread">
        X · {tweets.length} posts
      </SectionBar>

      <ol className="rounded-2xl border border-border bg-surface px-4 py-4">
        {tweets.map((tweet, i) => {
          const last = i === tweets.length - 1
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar />
                {!last && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className={['min-w-0 flex-1', last ? 'pb-0' : 'pb-5'].join(' ')}>
                <div className="flex items-center gap-1 text-sm leading-none">
                  <span className="font-semibold text-ink">You</span>
                  <span className="truncate text-muted">@yourhandle · now</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                  {tweet}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------- shared bits ---------- */

// Eyebrow label + the format's copy-to-clipboard button, one per renderer.
function SectionBar({ children, copyText, copyLabel }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {children}
      </p>
      <CopyButton text={copyText} label={copyLabel} />
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }) {
  const [state, setState] = useState('idle') // 'idle' | 'copied' | 'error'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      // Clipboard blocked (insecure context / denied) — surface it instead of
      // failing silently, so the creator knows to select the text by hand.
      setState('error')
    }
    // Revert after a beat. React 18+ no-ops a setState on an unmounted component
    // (tab switch), so no cleanup needed.
    setTimeout(() => setState('idle'), 1800)
  }

  const copied = state === 'copied'
  const failed = state === 'error'

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : failed ? 'Copy failed' : `Copy ${label}`}
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5',
        'text-xs font-medium transition duration-150 active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        copied
          ? 'border-accent/50 bg-accent/10 text-accent'
          : failed
            ? 'border-border bg-surface text-ink'
            : 'border-border bg-surface text-muted hover:border-accent/40 hover:text-ink',
      ].join(' ')}
    >
      {copied ? <CheckIcon /> : failed ? <WarnIcon /> : <CopyIcon />}
      {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy'}
    </button>
  )
}

function Avatar() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" aria-hidden="true">
        <g fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="7" strokeWidth="1.4" opacity="0.4" />
          <circle cx="12" cy="12" r="3.4" strokeWidth="1.7" />
        </g>
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      </svg>
    </span>
  )
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

// Defensive fallback (§7, CP6): shown when no renderable kit arrives. The mock
// always provides one, so this is for CP7's real responses.
function ResultsEmpty({ onNew }) {
  return (
    <ScreenScaffold
      icon={
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      }
      title="Nothing to show yet"
      subtitle="Your kit didn't come through. Start a new one and Echo will rebuild your Reel, carousel, and thread."
    >
      <Button onClick={onNew}>Start a new kit</Button>
    </ScreenScaffold>
  )
}

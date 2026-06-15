import { useEffect, useState } from 'react'
import Button from '../components/Button'
import ImportPosts from '../components/ImportPosts'
import {
  SOURCES,
  TONE_PRESETS,
  hasVoice,
  loadBrandVoice,
  saveBrandVoice,
} from '../lib/brandVoice'

/*
 * Brand Voice Setup (§5, CP3 — redesigned light). The creator teaches Echo how
 * they sound: paste a few posts, say where they're from (optional), and/or pick
 * a tone. Order mirrors how creators think — their words first, then the source
 * label, then the tone that fills the gaps (§7.2). Persisted to localStorage on
 * every change (via the brandVoice lib) and re-loaded on launch.
 */
export default function BrandVoiceSetup({ onContinue }) {
  // Lazy init so a returning creator sees their saved voice on launch.
  const [voice, setVoice] = useState(loadBrandVoice)

  // Persist on every change — a refresh keeps the voice even without Continue.
  useEffect(() => {
    saveBrandVoice(voice)
  }, [voice])

  const setSamples = (samples) => setVoice((v) => ({ ...v, samples }))

  // Imported posts fill the samples field (appended if the creator already
  // pasted something) and auto-set the source to the platform they came from.
  const handleImported = ({ posts, source }) => {
    const text = posts.join('\n\n')
    setVoice((v) => ({
      ...v,
      samples: v.samples.trim() ? `${v.samples.trim()}\n\n${text}` : text,
      source: source ?? v.source,
    }))
  }

  // Source + tone are single-select and tap-to-clear, so both stay optional.
  const toggleSource = (id) =>
    setVoice((v) => ({ ...v, source: v.source === id ? null : id }))
  const toggleTone = (id) =>
    setVoice((v) => ({ ...v, tone: v.tone === id ? null : id }))

  return (
    <section className="flex flex-1 flex-col gap-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Set your brand voice
        </h1>
        <p className="text-pretty leading-relaxed text-muted">
          Teach Echo how you sound. Paste a few posts, pick a tone, or both —
          we&apos;ll match it on every platform.
        </p>
      </div>

      {/* Import recent posts to learn the voice automatically. */}
      <ImportPosts onImported={handleImported} />

      {/* 1 — Their words first (imported posts land here; editable). */}
      <div className="space-y-2.5">
        <label htmlFor="samples" className="text-sm font-semibold text-ink">
          Your posts <span className="font-normal text-muted">· optional</span>
        </label>
        <textarea
          id="samples"
          value={voice.samples}
          onChange={(e) => setSamples(e.target.value)}
          rows={4}
          placeholder={'Paste 2–4 of your posts here.\nEcho learns your phrasing, rhythm, and go-to words.'}
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base leading-relaxed text-ink shadow-card placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />

        {/* 2 — Where those posts came from (labels the samples; optional). */}
        <div className="space-y-2 pt-1.5">
          <p className="text-sm font-medium text-muted">Where are these from?</p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => {
              const active = voice.source === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  aria-pressed={active}
                  className={[
                    'rounded-full border px-4 py-2 text-sm font-medium transition duration-150 active:scale-95',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                    active
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-surface text-ink shadow-card hover:border-accent/40',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3 — Tone fills the gaps the samples don't cover (§7.2). */}
      <fieldset className="space-y-3">
        <legend className="pb-1 text-sm font-semibold text-ink">Tone</legend>
        <div className="grid grid-cols-2 gap-3">
          {TONE_PRESETS.map((preset) => {
            const active = voice.tone === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => toggleTone(preset.id)}
                aria-pressed={active}
                className={[
                  'rounded-2xl border p-4 text-left shadow-card transition duration-150 active:scale-[0.99]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                  'focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  active
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-surface hover:border-accent/40',
                ].join(' ')}
              >
                <span className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{preset.label}</span>
                  <CheckDot active={active} />
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted">
                  {preset.blurb}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-auto space-y-3 pt-2">
        <Button onClick={onContinue}>Continue</Button>
        <p className="text-center text-xs text-muted">
          {hasVoice(voice)
            ? 'Saved on this device.'
            : 'Pick a tone or add a post to personalize your kit.'}
        </p>
      </div>
    </section>
  )
}

// Small accent check that fills in when a tone card is selected.
function CheckDot({ active }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'flex h-5 w-5 items-center justify-center rounded-full border transition',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-border text-transparent',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

import { useEffect, useState } from 'react'
import Button from '../components/Button'
import {
  TONE_PRESETS,
  hasVoice,
  loadBrandVoice,
  saveBrandVoice,
} from '../lib/brandVoice'

/*
 * Brand Voice Setup (§5, CP3). The creator teaches Echo how they sound by
 * picking a tone preset and/or pasting a few of their posts. The voice is
 * persisted to localStorage on every change (via the brandVoice lib) and
 * re-loaded on launch — so a refresh keeps the saved voice, the CP3 done-bar.
 */
export default function BrandVoiceSetup({ onContinue }) {
  // Lazy init so a returning creator sees their saved voice on launch.
  const [voice, setVoice] = useState(loadBrandVoice)

  // Persist on every change — guarantees a refresh keeps the voice even if the
  // creator never taps Continue.
  useEffect(() => {
    saveBrandVoice(voice)
  }, [voice])

  const toggleTone = (id) =>
    setVoice((v) => ({ ...v, tone: v.tone === id ? null : id }))

  const setSamples = (samples) => setVoice((v) => ({ ...v, samples }))

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Set your brand voice
        </h1>
        <p className="text-pretty leading-relaxed text-muted">
          Teach Echo how you sound. Pick a tone, paste a few posts, or both —
          we'll match it on every platform.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="pb-1 text-sm font-medium text-muted">Tone</legend>
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
                  'rounded-2xl border p-4 text-left transition duration-150 active:scale-[0.99]',
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

      <div className="space-y-2">
        <label htmlFor="samples" className="text-sm font-medium text-muted">
          Sample posts <span className="text-muted/70">· optional</span>
        </label>
        <textarea
          id="samples"
          value={voice.samples}
          onChange={(e) => setSamples(e.target.value)}
          rows={4}
          placeholder={'Paste 2–4 of your posts here.\nEcho learns your phrasing, rhythm, and go-to words.'}
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base leading-relaxed text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </div>

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

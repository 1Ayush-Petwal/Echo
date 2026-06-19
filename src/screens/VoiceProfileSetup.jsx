import { useMemo, useRef, useState } from 'react'
import Button from '../components/Button'
import ImportPosts from '../components/ImportPosts'
import { TONE_PRESETS, saveBrandVoice, toneLabel } from '../lib/brandVoice'
import { distillVoiceProfile, normalisePosts } from '../lib/api'
import { passThroughPosts } from '../lib/posts'
import {
  ENGINE_LABEL,
  buildLocalProfile,
  composeProfile,
  loadVoiceProfile,
  saveVoiceProfile,
} from '../lib/voiceProfile'

// Where the pasted posts came from (feature-optimisation Phase 2). Ids match the
// posts.json contract's PLATFORMS; the choice tunes how the distiller reads the
// voice and is stored on the profile. Optional — left unset reads as "other".
const PLATFORMS_UI = [
  { id: 'x', label: 'X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'other', label: 'Other' },
]
const labelFor = (id) => PLATFORMS_UI.find((p) => p.id === id)?.label ?? 'posts'

// Live-preview copy: the same message, rendered four ways. Purely illustrative —
// it shows what "matching your voice" looks like before the creator builds. Keyed
// by the tone-preset ids so the active tone card drives the preview instantly.
const VOICES = {
  playful: {
    txt: 'ok we did a thing 👀 just shipped our biggest update yet and honestly? a little obsessed. go poke around and tell us what you break 🙃✨',
    likes: '2.1k',
    comments: '184',
  },
  professional: {
    txt: 'Excited to share that our biggest update is now live. We focused on speed, clarity, and the small details that make everyday work feel effortless. We’d love to hear what you think.',
    likes: '1.4k',
    comments: '92',
  },
  bold: {
    txt: 'Our biggest update ever is here. Faster. Sharper. Built for people who don’t wait around. Go see what changed. 🚀',
    likes: '3.6k',
    comments: '241',
  },
  minimal: {
    txt: 'New update is live. Faster, cleaner, sharper. Take a look.',
    likes: '980',
    comments: '63',
  },
}

// How the preview card chrome reads per platform (the "preview as" switcher).
const PLAT = {
  x: { name: 'Your brand', handle: '@yourbrand · now', av: 'Y' },
  instagram: { name: 'yourbrand', handle: 'Original audio · now', av: 'y' },
  linkedin: { name: 'Your Brand', handle: 'You · 1st · Founder · now', av: 'Y' },
}
const PLAT_LABEL = { x: 'X', instagram: 'Instagram', linkedin: 'LinkedIn' }

const SAMPLE =
  "Spent the weekend rewriting our onboarding from scratch. Smaller steps, fewer words, way less friction. Shipping it Monday — can't wait for you all to try it.\n\nBuilding in public hits different when the feedback is this good. 🙏"

/*
 * Voice Profile builder (CP12) — the spine, and the first-run setup step (§0.1).
 *
 * The creator pastes a few of their posts (tone preset is an optional cold-start
 * scaffold). On "Build my voice," Echo distills them into an editable `voice.md`
 * — the cloud engine (/api/voice) when available, the on-device engine as the
 * always-works fallback. The result is shown, editable, and persisted locally;
 * the boot gate then sends returning creators straight to Capture.
 */
export default function VoiceProfileSetup({ onDone, onCancel }) {
  const existing = useMemo(() => loadVoiceProfile(), [])

  // 'input' (paste posts) → 'review' (see/edit the voice.md). Returning creators
  // editing their profile start in review with what's saved.
  const [phase, setPhase] = useState(existing ? 'review' : 'input')
  const [samples, setSamples] = useState('')
  const [tone, setTone] = useState(existing?.source?.tone ?? null)
  const [platform, setPlatform] = useState(existing?.source?.platform ?? null)
  const [profile, setProfile] = useState(existing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Presentational only: which platform the live preview is rendered as, and the
  // "learned" story circles that light up after a successful import.
  const [previewPlat, setPreviewPlat] = useState('x')
  const [learned, setLearned] = useState([])
  const [toastMsg, setToastMsg] = useState(null)
  const toastTimer = useRef(null)

  const toggleTone = (id) => setTone((t) => (t === id ? null : id))
  const togglePlatform = (id) => setPlatform((p) => (p === id ? null : id))

  const wordCount = useMemo(() => {
    const t = samples.trim()
    return t ? t.split(/\s+/).length : 0
  }, [samples])

  function toast(msg) {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 1900)
  }

  // Imported posts (a platform export, parsed in-browser) append into the paste
  // box just like a manual paste, then feed the distiller and the audit bridge.
  // We also record a "learned" entry so the story circle for that platform lights.
  const handleImported = ({ posts, source }) => {
    const text = posts.join('\n\n')
    setSamples((s) => (s.trim() ? `${s.trim()}\n\n${text}` : text))
    if (source) setPlatform(source)
    const key = source || 'other'
    setLearned((l) => [...l.filter((x) => x.source !== key), { source: key, count: posts.length }])
    toast(`Read ${posts.length} ${posts.length === 1 ? 'post' : 'posts'} from your ${labelFor(key)}`)
  }

  // One-shot ripple from the click point, then select the tone (kept optional —
  // clicking the active tone clears it, as before).
  function selectTone(e, id) {
    const btn = e.currentTarget
    const r = btn.getBoundingClientRect()
    const splash = document.createElement('span')
    splash.className = 'tone-splash'
    splash.style.left = `${e.clientX - r.left}px`
    splash.style.top = `${e.clientY - r.top}px`
    btn.appendChild(splash)
    requestAnimationFrame(() => splash.classList.add('go'))
    setTimeout(() => splash.remove(), 600)
    toggleTone(id)
  }

  async function build() {
    const text = samples.trim()
    if (text.length < 40) {
      setError('Paste a bit more — two or three of your posts works best.')
      return
    }
    setError(null)
    setBusy(true)
    // Bridge to the Audit (Feature 3): persist the raw posts as brandVoice
    // samples so the always-on audit can critique the creator's actual posts.
    // The distilled voiceProfile stays the first-class artifact for synthesis.
    saveBrandVoice({ tone, samples: text, source: platform })
    let artifact
    try {
      // Smart paste (Phase 1): clean + structure the raw paste into posts.json
      // BEFORE distilling, so the voice profile is learned from the creator's
      // actual words — not "1.2K", "Show more", or timestamps. The cloud
      // normaliser does the cleaning; the deterministic splitter is the
      // never-fail fallback when it's unavailable.
      let postsJson
      try {
        postsJson = await normalisePosts({ raw: text, platform, source: 'paste' })
      } catch {
        postsJson = passThroughPosts(text, { platform, source: 'paste' })
      }
      // Cloud distiller (richer) on the clean posts; the on-device heuristic
      // engine is the reliable fallback below — either way, a real voice.md.
      // `platform` (Phase 2) lets the distiller read the voice in context.
      const remote = await distillVoiceProfile({ posts: postsJson.posts, tone, platform })
      artifact = composeProfile({
        profileMarkdown: remote.profileMarkdown,
        traits: remote.traits,
        samples: text,
        tone,
        platform,
        engine: 'echo-cloud',
      })
    } catch {
      artifact = buildLocalProfile({ samples: text, tone, platform })
    }
    setProfile(artifact)
    setBusy(false)
    setPhase('review')
  }

  function save() {
    if (!profile) return
    saveVoiceProfile({
      ...profile,
      updatedAt: new Date().toISOString(),
      revisions: existing ? (profile.revisions ?? 0) + 1 : profile.revisions ?? 0,
    })
    onDone()
  }

  const editMarkdown = (val) =>
    setProfile((p) => (p ? { ...p, profileMarkdown: val } : p))

  if (busy) return <BuildingView />

  if (phase === 'review' && profile) {
    return (
      <ReviewView
        profile={profile}
        onEditMarkdown={editMarkdown}
        onSave={save}
        onRebuild={() => {
          setError(null)
          setPhase('input')
        }}
      />
    )
  }

  const previewTone = tone ?? 'professional'
  const v = VOICES[previewTone]
  const p = PLAT[previewPlat]
  const canBuild = samples.trim().length >= 40

  return (
    <section className="pb-[132px]">
      {/* Lede */}
      <div className="mb-7 mt-1.5 max-w-[640px]">
        <h1 className="font-display text-[clamp(30px,5.4vw,46px)] font-bold leading-[1.02] tracking-tight text-ink">
          Set your{' '}
          <span className="bg-gradient-to-r from-accent to-violet bg-clip-text text-transparent">
            brand voice
          </span>
        </h1>
        <p className="mt-3 text-[clamp(15px,2.2vw,17.5px)] font-medium leading-relaxed text-muted">
          Teach Echo how you sound. Connect an account, paste a few posts, or
          both — and we’ll match it on every platform.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-[clamp(18px,3vw,26px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* LEFT — configuration */}
        <div className="flex flex-col gap-[22px]">
          {/* Import */}
          <section>
            <SecHead
              title="Import your posts"
              sub="Connect an account and Echo learns your voice from recent posts. It’s read right here in your browser — your file never leaves your device, and there’s no login."
            />
            <ImportPosts hideHeader onImported={handleImported} />
            {learned.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-4" aria-live="polite">
                {learned.map((it) => (
                  <div
                    key={it.source}
                    className="flex animate-pop flex-col items-center gap-[7px]"
                  >
                    <div className="relative grid h-[54px] w-[54px] place-items-center rounded-full bg-gradient-to-br from-accent to-violet p-[2.5px]">
                      <div className="grid h-full w-full place-items-center rounded-full bg-surface text-ink">
                        <PlatformGlyph id={it.source} />
                      </div>
                      <span className="absolute bottom-px right-px h-[13px] w-[13px] rounded-full border-[2.5px] border-surface bg-good" />
                    </div>
                    <div className="text-center">
                      <b className="block text-[12px] font-bold text-ink">{labelFor(it.source)}</b>
                      <span className="block text-[10.5px] font-semibold text-faint">
                        {it.count} posts read
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Paste posts */}
          <section>
            <SecHead
              title="Your posts"
              tag="· optional"
              sub="Prefer to paste? Drop in a few examples and Echo will study the rhythm, slang, and structure you use."
            />
            <div className="rounded-3xl border border-border bg-surface p-1.5 shadow-card">
              <textarea
                id="samples"
                value={samples}
                onChange={(e) => setSamples(e.target.value)}
                placeholder={'Paste a few of your best posts here…\n\nThe more you give Echo, the closer the match.'}
                className="min-h-[128px] w-full resize-y rounded-2xl border-[1.6px] border-dashed border-border bg-surface-2 px-4 py-4 text-[15.5px] font-medium leading-relaxed text-ink transition placeholder:text-faint focus:border-solid focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/35"
              />
              <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSamples(SAMPLE)
                    toast('Example added')
                  }}
                  className="inline-flex items-center gap-[7px] rounded-full border border-border bg-surface-2 px-[13px] py-2 text-[13px] font-bold text-muted transition hover:-translate-y-px hover:text-ink active:scale-95"
                >
                  <SparkIcon className="h-[15px] w-[15px]" />
                  Paste example
                </button>
                <button
                  type="button"
                  onClick={() => setSamples('')}
                  className="inline-flex items-center gap-[7px] rounded-full border border-border bg-surface-2 px-[13px] py-2 text-[13px] font-bold text-muted transition hover:-translate-y-px hover:text-ink active:scale-95"
                >
                  <TrashIcon className="h-[15px] w-[15px]" />
                  Clear
                </button>
                <span className="ml-auto text-[12px] font-bold tabular-nums text-faint">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
              </div>
            </div>
            {error && <p className="mt-2 text-[13px] font-semibold text-red-500">{error}</p>}
          </section>

          {/* Sources */}
          <section>
            <SecHead
              title="Where are these from?"
              sub="Tag the source so Echo learns the conventions of each platform."
            />
            <div className="flex flex-wrap gap-[10px]" role="group" aria-label="Source platforms">
              {PLATFORMS_UI.map((pf) => {
                const on = platform === pf.id
                return (
                  <button
                    key={pf.id}
                    type="button"
                    onClick={() => togglePlatform(pf.id)}
                    aria-pressed={on}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-5 py-[11px] text-[14.5px] font-bold transition active:scale-[0.97]',
                      on
                        ? 'border-ink bg-ink text-surface dark:border-accent dark:bg-accent dark:text-white'
                        : 'border-border bg-surface text-ink shadow-sm hover:-translate-y-0.5 hover:shadow-md',
                    ].join(' ')}
                  >
                    {pf.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Tone */}
          <section>
            <SecHead
              title="Tone"
              tag="· optional"
              sub="Pick a starting point. Watch the preview rewrite itself instantly."
            />
            <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2" role="radiogroup" aria-label="Tone">
              {TONE_PRESETS.map((preset) => {
                const on = tone === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={(e) => selectTone(e, preset.id)}
                    className={[
                      'relative overflow-hidden rounded-2xl border-[1.6px] p-[18px] text-left transition active:translate-y-[-1px]',
                      on
                        ? 'border-accent bg-accent-soft shadow-md'
                        : 'border-border bg-surface shadow-sm hover:-translate-y-[3px] hover:shadow-md',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-[10px]">
                      <span className="text-[16.5px] font-extrabold tracking-tight text-ink">
                        {preset.label}
                      </span>
                      <span
                        className={[
                          'grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-2 transition',
                          on ? 'border-accent bg-accent' : 'border-border',
                        ].join(' ')}
                      >
                        <CheckIcon
                          className={[
                            'h-3 w-3 text-white transition',
                            on ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                          ].join(' ')}
                        />
                      </span>
                    </div>
                    <p
                      className={[
                        'mt-1.5 text-[13px] font-semibold leading-snug',
                        on ? 'text-accent/80' : 'text-muted',
                      ].join(' ')}
                    >
                      {preset.blurb}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* RIGHT — live preview (signature) */}
        <div className="lg:sticky lg:top-[96px]">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-[18px] shadow-card">
            <div className="mb-3.5 flex items-center gap-2.5">
              <span className="inline-flex items-center gap-2.5 text-[12.5px] font-extrabold tracking-tight text-ink">
                <span className="eq" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                Live preview · in your voice
              </span>
              <div className="ml-auto flex gap-1.5 rounded-full border border-border bg-surface-2 p-1">
                {['x', 'instagram', 'linkedin'].map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => setPreviewPlat(pl)}
                    aria-label={`Preview as ${PLAT_LABEL[pl]}`}
                    aria-pressed={previewPlat === pl}
                    className={[
                      'grid h-[30px] w-[30px] place-items-center rounded-full transition',
                      previewPlat === pl
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-muted hover:text-ink',
                    ].join(' ')}
                  >
                    <PlatformGlyph id={pl} className="h-[15px] w-[15px]" />
                  </button>
                ))}
              </div>
            </div>

            <article className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm">
              <div className="flex items-center gap-[11px] px-[15px] pb-[11px] pt-[15px]">
                <div className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full bg-gradient-to-br from-accent to-violet font-display text-[15px] font-extrabold text-white">
                  {p.av}
                </div>
                <div className="min-w-0">
                  <b className="flex items-center gap-1.5 text-[14.5px] font-extrabold tracking-tight text-ink">
                    {p.name}
                    <span className="rounded-full bg-accent-soft px-[7px] py-0.5 text-[10px] font-extrabold tracking-wide text-accent">
                      PREVIEW
                    </span>
                  </b>
                  <span className="mt-px block truncate text-[12px] font-semibold text-faint">
                    {p.handle}
                  </span>
                </div>
                <div className="ml-auto flex gap-[3px] text-faint" aria-hidden="true">
                  <i className="block h-1 w-1 rounded-full bg-current" />
                  <i className="block h-1 w-1 rounded-full bg-current" />
                  <i className="block h-1 w-1 rounded-full bg-current" />
                </div>
              </div>

              <div
                key={`${previewTone}-${previewPlat}`}
                className="min-h-[88px] animate-swap px-[15px] pb-[13px] pt-0.5 text-[15px] font-medium leading-relaxed text-ink"
              >
                {v.txt}
              </div>

              <div className="preview-media relative mx-[15px] mb-[13px] h-[150px] overflow-hidden rounded-[14px]">
                <span className="absolute bottom-2.5 left-[11px] flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-[5px] text-[11.5px] font-extrabold text-white backdrop-blur">
                  ✨ Generated by Echo
                </span>
              </div>

              <div className="flex items-center gap-[18px] border-t border-border px-[15px] pb-3.5 pt-[11px] text-muted">
                <span className="inline-flex items-center gap-[7px] text-[13px] font-extrabold tabular-nums">
                  <HeartIcon className="h-[17px] w-[17px] text-[#f2547d]" />
                  {v.likes}
                </span>
                <span className="inline-flex items-center gap-[7px] text-[13px] font-extrabold tabular-nums">
                  <CommentIcon className="h-[17px] w-[17px]" />
                  {v.comments}
                </span>
                <ShareIcon className="h-[17px] w-[17px]" />
                <BookmarkIcon className="ml-auto h-[17px] w-[17px]" />
              </div>
            </article>

            <div className="mt-3.5 flex items-start gap-2.5 text-[12px] font-semibold leading-snug text-faint">
              <SparkIcon className="mt-px h-[15px] w-[15px] flex-none text-accent" />
              <span>
                This is a sample. Echo writes from <em>your</em> imported posts and
                tone — you approve every post before it goes out.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA — the build action lives here (mockup signature). */}
      <div className="fixed inset-x-0 bottom-0 z-[45] bg-gradient-to-t from-bg-2/95 to-transparent px-[clamp(1rem,4vw,1.75rem)] pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3.5">
        <div className="mx-auto flex max-w-[1080px] items-center gap-4">
          <span className="hidden items-center gap-2 text-[13px] font-semibold text-muted sm:flex">
            <b className="font-extrabold text-ink">{toneLabel(tone) ?? 'Professional'}</b> voice ·{' '}
            {PLAT_LABEL[previewPlat]} preview
          </span>
          {existing && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[13px] font-bold text-muted transition hover:text-ink"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={build}
            disabled={!canBuild}
            className="ml-auto inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-accent to-[#5b82ff] px-[30px] py-4 text-[16.5px] font-extrabold tracking-tight text-white shadow-[0_12px_30px_-10px_var(--color-accent)] transition hover:-translate-y-0.5 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 max-sm:ml-0 max-sm:w-full max-sm:justify-center"
          >
            Build my voice
            <ArrowIcon className="h-[19px] w-[19px]" />
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-[96px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink px-[18px] py-3 text-[13.5px] font-bold text-surface shadow-card">
          <CheckIcon className="h-4 w-4 text-good" />
          {toastMsg}
        </div>
      )}
    </section>
  )
}

// Section heading — title (+ optional muted tag) and a supporting line.
function SecHead({ title, tag, sub }) {
  return (
    <div className="mb-3 px-0.5">
      <div className="flex items-center gap-2 text-[16px] font-extrabold tracking-tight text-ink">
        {title}
        {tag && <span className="text-[13px] font-semibold tracking-normal text-faint">{tag}</span>}
      </div>
      {sub && (
        <p className="mt-1 max-w-[48ch] text-[13.5px] font-medium leading-relaxed text-muted">
          {sub}
        </p>
      )}
    </div>
  )
}

// Shown while a profile is being distilled (cloud round-trip or local compute).
function BuildingView() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span className="flex gap-1.5" aria-hidden="true">
        <Dot />
        <Dot delay="0.15s" />
        <Dot delay="0.3s" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-xl font-semibold text-ink">Distilling your voice…</h1>
        <p className="text-sm text-muted">Cleaning your posts and learning how you write.</p>
      </div>
    </section>
  )
}

function Dot({ delay = '0s' }) {
  return (
    <span
      className="h-2.5 w-2.5 rounded-full bg-accent animate-ripple"
      style={{ animationDelay: delay, animationDuration: '1.1s' }}
    />
  )
}

// The payoff: render the learned voice.md, editable. This is the literal
// "skills.md for you."
function ReviewView({ profile, onEditMarkdown, onSave, onRebuild }) {
  const t = profile.traits ?? {}
  const chips = [...(t.vocabulary ?? []), ...(t.topics ?? [])].slice(0, 8)
  const engineLabel = ENGINE_LABEL[profile.source?.engine] ?? 'Built on your device'

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5">
      <div className="space-y-2">
        <h1 className="font-display text-[clamp(26px,4vw,38px)] font-bold tracking-tight text-ink">
          Echo learned your voice
        </h1>
        <p className="text-pretty font-medium leading-relaxed text-muted">
          This is your <span className="text-ink">voice.md</span> — injected into
          everything you make. Tweak anything that doesn&apos;t sound like you.
        </p>
      </div>

      {t.voiceOneLiner && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
          <p className="text-sm leading-relaxed text-ink">{t.voiceOneLiner}</p>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="voicemd" className="text-sm font-medium text-muted">
            Your voice profile
          </label>
          <span className="text-xs font-semibold text-accent">{engineLabel}</span>
        </div>
        <textarea
          id="voicemd"
          value={profile.profileMarkdown}
          onChange={(e) => onEditMarkdown(e.target.value)}
          rows={12}
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 font-mono text-[13px] leading-relaxed text-ink focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/35"
        />
      </div>

      <div className="mt-auto space-y-3 pt-2">
        <Button onClick={onSave}>Save &amp; start creating</Button>
        <Button variant="ghost" onClick={onRebuild}>
          Rebuild from posts
        </Button>
      </div>
    </section>
  )
}

/* ---------- Inline icons (token-coloured via currentColor) ---------- */

function PlatformGlyph({ id, className = 'h-[22px] w-[22px]' }) {
  if (id === 'x') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M17.6 3h3l-6.6 7.5L21.8 21h-5.9l-4.6-6-5.3 6H3l7-8L2.6 3h6l4.2 5.5L17.6 3zm-1 16h1.6L8 5h-1.7l10.3 14z" />
      </svg>
    )
  }
  if (id === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.5 8.65 22 10.6 22 14v7h-4v-6.2c0-1.5-.03-3.4-2.07-3.4-2.07 0-2.39 1.62-2.39 3.3V21H9z" />
      </svg>
    )
  }
  if (id === 'other') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    )
  }
  // Instagram
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SparkIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function HeartIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-10-9.3C.4 8.3 2 5 5.2 5c2 0 3.2 1.1 3.8 2 .6.6 1.4 1.6 3 1.6S15.4 7.6 16 7c.6-.9 1.8-2 3.8-2C23 5 24.6 8.3 22 11.7 19.5 16.4 12 21 12 21z" />
    </svg>
  )
}

function CommentIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8 8 0 0 1-11.3 7.3L3 21l2.2-6.7A8 8 0 1 1 21 11.5z" />
    </svg>
  )
}

function ShareIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
    </svg>
  )
}

function BookmarkIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}

function ArrowIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

import { useState } from 'react'
import { IMPORT_PLATFORMS, importPosts } from '../lib/socialImport'

/*
 * "Import your posts" — connect Instagram or X and pull recent posts so Echo
 * learns the creator's voice. Phase 1 runs against the mock connector; the UI
 * contract is final, so Phase 2's real OAuth slots in behind importPosts(). On
 * success it hands cleaned samples + the source up to Brand Voice, which fills
 * the "Your posts" field so the creator can review/edit before generating.
 */
export default function ImportPosts({ onImported }) {
  const [busy, setBusy] = useState(null) // platform id while loading
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'err', text }

  const connect = async (platform) => {
    if (busy) return
    setBusy(platform)
    setStatus(null)
    try {
      const { posts, handle, platform: p } = await importPosts(platform)
      onImported({ posts, source: p })
      const n = posts.length
      setStatus({
        kind: 'ok',
        text: `Imported ${n} ${n === 1 ? 'post' : 'posts'} from ${handle} — review below.`,
      })
    } catch (e) {
      setStatus({
        kind: 'err',
        text:
          e?.code === 'no-posts'
            ? 'Couldn’t find posts to learn from — paste a few below instead.'
            : 'Couldn’t connect just now — try again, or paste a few posts below.',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">Import your posts</p>
        <p className="text-xs leading-relaxed text-muted">
          Connect an account and Echo learns your voice from your recent posts.
          We read them once — we don’t store your login.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {IMPORT_PLATFORMS.map((pf) => {
          const loading = busy === pf.id
          return (
            <button
              key={pf.id}
              type="button"
              onClick={() => connect(pf.id)}
              disabled={Boolean(busy)}
              aria-busy={loading}
              className={[
                'flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3',
                'text-sm font-semibold text-ink shadow-card transition duration-150 active:scale-[0.99]',
                'hover:border-accent/40 disabled:pointer-events-none disabled:opacity-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                'focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              ].join(' ')}
            >
              {loading ? <Spinner /> : <PlatformGlyph id={pf.id} />}
              <span>{loading ? 'Connecting…' : pf.label}</span>
            </button>
          )
        })}
      </div>

      {status && (
        <p
          aria-live="polite"
          className={[
            'text-xs leading-relaxed',
            status.kind === 'ok' ? 'text-accent' : 'text-red-500',
          ].join(' ')}
        >
          {status.text}
        </p>
      )}
    </div>
  )
}

function PlatformGlyph({ id }) {
  if (id === 'x') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 4l16 16M20 4 4 20" />
      </svg>
    )
  }
  // Instagram
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.6" cy="7.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] animate-spin"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

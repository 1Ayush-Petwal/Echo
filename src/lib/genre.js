/*
 * Genre / niche selection (Page 2's Genre Selector). The creator can name the
 * niche their content lives in so the audit (Feature 3) measures against the
 * right trend slice; skipping it lets the server infer the niche from the posts
 * (the always-on default). Persisted like reference text — and for the same
 * reason: returning creators boot straight to the Audit (skipping Page 2), so
 * their pick has to survive a reload to still apply.
 *
 * Stored shape: { value, other }
 *   value: '' (auto-detect, the default) · a known niche id · OTHER_VALUE
 *   other: the free-text entry, used only when value === OTHER_VALUE
 * The "Other" free-text is resolved to a niche id server-side by
 * trends.normalizeNiche, so any phrasing still lands on a usable trend slice.
 */
const STORAGE_KEY = 'echo.genre.v1'

// Sentinel for the "Something else…" option that reveals the free-text field.
export const OTHER_VALUE = '__other__'

export const EMPTY_GENRE = { value: '', other: '' }

export function loadGenre() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_GENRE }
    const parsed = JSON.parse(raw)
    return {
      value: typeof parsed.value === 'string' ? parsed.value : '',
      other: typeof parsed.other === 'string' ? parsed.other : '',
    }
  } catch {
    return { ...EMPTY_GENRE }
  }
}

export function saveGenre({ value, other } = {}) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ value: value ?? '', other: other ?? '' }),
    )
  } catch {
    // Private mode / quota — non-fatal; in-session state still works.
  }
}

/*
 * The niche string to send to the audit, or null to let the server infer it
 * from the posts. '' ⇒ auto-detect (null); OTHER_VALUE ⇒ the trimmed free-text
 * (or null if blank); otherwise the chosen niche id.
 */
export function resolveNiche({ value, other } = {}) {
  if (value === OTHER_VALUE) {
    const t = typeof other === 'string' ? other.trim() : ''
    return t || null
  }
  return value || null
}

/**
 * Brand voice persistence (§5 + CP3). The creator's voice — a tone preset
 * and/or a few sample posts — lives in localStorage so it survives refreshes and
 * is ready for the synthesis call later (CP7 sends it to /api/generate). This is
 * the single place that touches storage, so screens never poke localStorage
 * directly.
 */

const STORAGE_KEY = 'echo.brandVoice.v1'

// Tone presets offered on the setup screen (§5). `id` is what we persist/send.
export const TONE_PRESETS = [
  { id: 'playful', label: 'Playful', blurb: 'Fun, casual, emoji-friendly' },
  { id: 'professional', label: 'Professional', blurb: 'Polished, clear, trustworthy' },
  { id: 'bold', label: 'Bold', blurb: 'Punchy, confident, high-energy' },
  { id: 'minimal', label: 'Minimal', blurb: 'Clean, concise, no fluff' },
]

export const EMPTY_VOICE = { tone: null, samples: '' }

// True once the creator has given us something to actually learn from.
export function hasVoice(voice) {
  return Boolean(voice && (voice.tone || voice.samples.trim()))
}

export function loadBrandVoice() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_VOICE }
    const parsed = JSON.parse(raw)
    return {
      tone: parsed.tone ?? null,
      samples: typeof parsed.samples === 'string' ? parsed.samples : '',
    }
  } catch {
    // Corrupt or blocked storage shouldn't break the app — start fresh.
    return { ...EMPTY_VOICE }
  }
}

export function saveBrandVoice(voice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voice))
  } catch {
    // Private mode / quota errors are non-fatal; in-memory state still works.
  }
}

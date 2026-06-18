import { samplesToArray } from './brandVoice'

// Defensive normalize of the optional inspiration payload to a stable shape:
// trimmed reference text + image descriptors (no bytes/urls), capped at a few.
function normalizeInspiration(inspiration) {
  if (!inspiration || typeof inspiration !== 'object') return { refs: '', visuals: [] }
  const refs = typeof inspiration.refs === 'string' ? inspiration.refs.trim() : ''
  const visuals = Array.isArray(inspiration.visuals)
    ? inspiration.visuals
        .slice(0, 6)
        .map((v) => ({ name: v?.name, type: v?.type, size: v?.size }))
    : []
  return { refs, visuals }
}

/*
 * Client → synthesis endpoint (§7, CP7). The single place that knows how to call
 * POST /api/generate. The endpoint returns the §6 mock kit today; the real
 * vision+text model is wired in server-side at the event — never in the client.
 *
 * The request shape { input, image, brandVoice } is the seam: when the event
 * swaps the server's mock for real synthesis, this client code never changes.
 * We normalize brandVoice to the §6 contract here (samples → string[]) so the
 * server always receives the same shape the prompt builder expects.
 */
export async function generateKit({ input, image, brandVoice, inspiration } = {}) {
  const payload = {
    input,
    image,
    brandVoice: {
      tone: brandVoice?.tone ?? null,
      samples: samplesToArray(brandVoice?.samples),
      // Where the samples are from (§ source selector) — a platform hint the
      // server uses to pick a sharper default register.
      source: brandVoice?.source ?? null,
    },
    // Optional reference material (the Inspiration step). Images travel as
    // descriptors only until real bytes are wired in at the event.
    inspiration: normalizeInspiration(inspiration),
  }
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`generate failed: ${res.status}`)
  }

  const kit = await res.json()
  // Guard the shape so a bad response surfaces as the error screen, not a crash.
  if (!kit?.reel || !kit?.carousel || !kit?.thread) {
    throw new Error('generate: malformed kit')
  }
  return kit
}

/*
 * Client → audit endpoint (Feature 3). The single place that calls POST
 * /api/audit. Sends the brand voice (samples normalized to the §6 string[]
 * shape, same as generate), the parsed historical posts (Feature 2 output), an
 * optional niche (the Page 2 Genre Selector pick / "Other" text), and any
 * inspiration. The server reads today's trends from its own cache and returns
 * the § Page-3 critique { markdown, sections, hashtags, meta }.
 *
 * Like generateKit, this request shape is the seam: when the real model is wired
 * in server-side, this client code never changes.
 */
export async function requestAudit({ brandVoice, posts, niche, inspiration } = {}) {
  const payload = {
    brandVoice: {
      tone: brandVoice?.tone ?? null,
      samples: samplesToArray(brandVoice?.samples),
      source: brandVoice?.source ?? null,
    },
    posts: Array.isArray(posts) ? posts.filter((p) => typeof p === 'string') : [],
    niche: niche ?? null,
    inspiration: normalizeInspiration(inspiration),
  }
  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`audit failed: ${res.status}`)
  }

  const audit = await res.json()
  // Guard the shape so a bad response surfaces cleanly rather than crashing.
  if (!audit?.markdown || !audit?.sections) {
    throw new Error('audit: malformed response')
  }
  return audit
}

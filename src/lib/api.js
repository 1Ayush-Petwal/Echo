import { samplesToArray } from './brandVoice'

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
export async function generateKit({ input, image, brandVoice } = {}) {
  const payload = {
    input,
    image,
    brandVoice: {
      tone: brandVoice?.tone ?? null,
      samples: samplesToArray(brandVoice?.samples),
    },
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

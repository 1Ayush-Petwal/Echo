/*
 * POST /api/generate — Echo's synthesis endpoint (§7, CP7).
 *
 * Accepts { input, image, brandVoice } and returns the §6 content kit. This is
 * still a MOCK — no model call, no secret — but it is now input-aware: the kit
 * is templated from the creator's brief (or the photo's filename) and their
 * brand-voice tone, so the output actually reflects what they asked for instead
 * of one canned demo. Any real model call and any secret stays server-side —
 * never in the client (§2: "No API keys in client code, ever").
 *
 * TODO (event): replace this deterministic templating with the real LLM
 *   vision+text call. Read `image` (vision), `input`, and `brandVoice`, call the
 *   model, and return the SAME { reel, carousel, thread } shape so the client
 *   never changes. The templating below is the placeholder, not the contract.
 */

// Per-tone writing style (§5 tone presets). `emoji` gates the playful flourishes;
// `cta` + `spark` flavor the copy. Unknown/absent tone falls back to the house
// "playful" style for the writing, while the tone CHIP stays hidden (see below).
const TONE_STYLE = {
  playful: { label: 'Playful', emoji: true, spark: '✨', cta: 'grab yours 👇' },
  professional: { label: 'Professional', emoji: false, spark: '', cta: 'Learn more.' },
  bold: { label: 'Bold', emoji: true, spark: '⚡️', cta: 'Get it now. 👇' },
  minimal: { label: 'Minimal', emoji: false, spark: '', cta: 'See it.' },
}

// Filenames that carry no real subject — don't mine these for a product name.
const GENERIC_FILE = /^(?:img|image|photo|pic|pxl|dsc|screenshot|untitled)[\W_]*\d*$/i
// Light lead-in trim so "New matte bottle" → "matte bottle" reads cleanly mid-sentence.
const LEAD_IN = /^(?:new|a|an|the|my|our|this|introducing|promoting|launch(?:ing)?|selling)\s+/i
const STOP = new Set([
  'for', 'the', 'a', 'an', 'with', 'and', 'your', 'new', 'of', 'to',
  'in', 'on', 'that', 'this', 'my', 'our', 'is', 'it', 'made', 'built',
])

const cap = (s) => {
  const t = String(s).trim()
  return t ? t[0].toUpperCase() + t.slice(1) : t
}
const clamp = (s, n) => {
  const t = String(s).trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

// What is this kit about? The brief wins; otherwise mine the photo's filename;
// otherwise a neutral placeholder so the copy still reads naturally.
function deriveSubject({ input, image }) {
  const brief = (input || '').replace(/\s+/g, ' ').trim()
  if (brief) return brief.replace(LEAD_IN, '') || brief

  const name = image?.name
  if (name) {
    const base = name.replace(/\.[a-z0-9]+$/i, '')
    if (!GENERIC_FILE.test(base)) {
      const words = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
      if (words) return words
    }
  }
  return 'your product'
}

// Split "<product> for <audience>" so we can target the audience in the copy.
function splitAudience(subject) {
  const m = subject.match(/^(.*?)\s+(?:for|aimed at|made for|built for)\s+(.+)$/i)
  if (m) return { product: m[1].trim(), audience: m[2].trim() }
  return { product: subject, audience: null }
}

// The voice to write in: the picked tone, Professional when only samples were
// given (§7.2), else null — null means "house default copy, no tone chip".
function resolveTone(brandVoice) {
  const id = brandVoice?.tone ? String(brandVoice.tone).toLowerCase() : null
  if (id && TONE_STYLE[id]) return id
  const samples = brandVoice?.samples
  const hasSamples = Array.isArray(samples)
    ? samples.length > 0
    : Boolean(samples && String(samples).trim())
  return hasSamples ? 'professional' : null
}

// 3–5 hashtags mined from the product words (IG rule §9.2), padded with safe
// evergreens if the brief was too thin to yield three.
function buildHashtags(product) {
  const tokens = product.toLowerCase().match(/[a-z0-9]+/g) || []
  const tags = []
  for (const t of tokens) {
    if (t.length < 3 || STOP.has(t)) continue
    const tag = `#${t}`
    if (!tags.includes(tag)) tags.push(tag)
    if (tags.length >= 4) break
  }
  for (const pad of ['#musthave', '#worththehype', '#newdrop']) {
    if (tags.length >= 3) break
    if (!tags.includes(pad)) tags.push(pad)
  }
  return tags.slice(0, 5)
}

function buildHook(product, toneId, style) {
  switch (toneId) {
    case 'professional':
      return `Here's why ${product} is worth a closer look.`
    case 'bold':
      return `Stop scrolling. ${cap(product)} is the upgrade you didn't know you needed.${style.emoji ? ' 🔥' : ''}`
    case 'minimal':
      return `${cap(product)}. Done right.`
    default:
      return `i tried ${product} for 30 days${style.emoji ? ' 😅' : ''}`
  }
}

// Reel: hook + script + a real call sheet (§8). ≤30s, a cut every 2–4s.
function buildReel({ product, audience, toneId, style }) {
  const hook = buildHook(product, toneId, style)
  const aud = audience ? ` for ${audience}` : ''
  const sp = style.spark ? ` ${style.spark}` : ''

  return {
    hook,
    script: `Open on the hook, then a fast montage of ${product} in real use${aud}; keep cuts every 2–4 seconds, land the one detail people miss, and close on the offer. Keep it under 30 seconds.`,
    shotList: [
      {
        time: '0:00–0:02',
        shot: 'CU talking head, push-in',
        inFrame: `you, holding ${product}`,
        onScreenText: clamp(hook, 42),
      },
      {
        time: '0:02–0:05',
        shot: 'Jump-cut montage, handheld',
        inFrame: `${product} in everyday use`,
        onScreenText: `the real-life test${sp}`,
      },
      {
        time: '0:05–0:09',
        shot: 'Medium, demo the main benefit',
        inFrame: `${product}, up close`,
        onScreenText: 'wait for it…',
      },
      {
        time: '0:09–0:13',
        shot: 'CU detail, slow pan',
        inFrame: 'the detail people miss',
        onScreenText: 'this is the part that sells it',
      },
      {
        time: '0:13–0:17',
        shot: 'Top-down whip-pan',
        inFrame: audience ? `${product} + your ${audience} setup` : `${product}, all angles`,
        onScreenText: 'and it just… works',
      },
      {
        time: '0:17–0:22',
        shot: 'Medium, direct to camera',
        inFrame: 'you, smiling',
        onScreenText: style.cta,
      },
    ],
  }
}

// Carousel: 5 swipeable IG slides + caption + 3–5 hashtags (§9).
function buildCarousel({ product, audience, style }) {
  const P = cap(product)
  const save = style.emoji ? ' 🔖' : ''
  return {
    slides: [
      { title: `Meet ${product}.`, body: "Here's the case for it. Swipe →" },
      { title: '1. Made to last', body: `${P} is built for daily use — not a one-week novelty.` },
      { title: '2. Genuinely easy', body: `No learning curve. ${P} just fits into your routine.` },
      {
        title: '3. Looks the part',
        body: audience
          ? `Design you'll want to show off — made with ${audience} in mind.`
          : `Design you'll actually want to show off.`,
      },
      { title: 'Get yours', body: `Save this${save} · ${style.cta}` },
    ],
    caption: `${P} — here's the case for it${audience ? `, especially for ${audience}` : ''}. Save this for when you're shopping${save}.`,
    hashtags: buildHashtags(product),
  }
}

// Thread: 5 stacked X posts, 0 hashtags (X rule §10.2). Carries its own tone.
function buildThread({ product, audience, toneId, style }) {
  const aud = audience ? ` for ${audience}` : ''
  const lead = style.emoji ? ' 🧵' : ''
  return {
    tweets: [
      `Most people settle for less than ${product} delivers. Here's what changes once you don't.${lead}`,
      `Start with the basics: ${product} does the one job it promises, every single time. No asterisks.`,
      `The details are where it wins${aud} — the small stuff everyone else skips, done right.`,
      `It's not about hype. It's that ${product} keeps working long after the novelty wears off.`,
      `If you've been on the fence, this is your sign. ${cap(style.cta)}`,
    ],
    // Present only when a real voice was declared, so the client can fall back
    // to the kit's effective tone when none was chosen (Results.jsx).
    ...(toneId ? { tone: TONE_STYLE[toneId].label } : {}),
  }
}

function buildKit({ input, image, brandVoice }) {
  const subject = deriveSubject({ input, image })
  const { product, audience } = splitAudience(clamp(subject, 80))
  const toneId = resolveTone(brandVoice)
  const style = TONE_STYLE[toneId] || TONE_STYLE.playful
  const ctx = { product, audience, toneId, style }

  return {
    reel: buildReel(ctx),
    carousel: buildCarousel(ctx),
    thread: buildThread(ctx),
  }
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { input, image, brandVoice } = req.body ?? {}
  console.log('[generate] received', {
    hasInput: Boolean(input),
    hasImage: Boolean(image),
    tone: brandVoice?.tone ?? null,
  })

  // TODO (event): real vision+text synthesis goes here, returning this shape.
  res.status(200).json(buildKit({ input, image, brandVoice }))
}

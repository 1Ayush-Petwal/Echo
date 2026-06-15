/*
 * Social import connector.
 *
 * Phase 1: a MOCK that returns fixture posts so the whole
 * connect → clean → samples → generate flow works offline. Phase 2 replaces
 * importPosts() with the real serverless OAuth redirect — the UI contract
 * (call → loading → { platform, handle, posts } → write samples) stays the same,
 * so the Brand Voice screen and ImportPosts component never change.
 */
import { cleanPosts } from './postClean'

export const IMPORT_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
]

// --- MOCK fixtures (Phase 1 only) -------------------------------------------
// Intentionally include junk (a retweet, a reply, a link-only post, a dup, a
// trailing URL) so the cleaning step visibly does its job.
const MOCK_POSTS = {
  instagram: [
    'sunrise runs hit different ☀️ 5k before the world wakes up. who’s with me? #morningrun #runtok',
    'new ceramic mug drop 🍵 small batch, hand-glazed, slightly imperfect on purpose. link in bio 👇',
    'behind the scenes of today’s shoot 📸 swipe for the bloopers 😅',
    'https://example.com/p/123',
    'grateful for this little community 🤍 can’t believe there are 200k of you now??',
  ],
  x: [
    'shipped a tiny feature today that I’ve wanted for months. small wins compound. 🚀',
    'hot take: your morning routine isn’t failing because you’re lazy. it’s built wrong.',
    'RT @someone: this is a retweet that should be dropped',
    '@friend totally agree with you',
    'spent the weekend rebuilding my site from scratch. worth every hour. more soon 👇 https://t.co/abc123',
  ],
}

const MOCK_HANDLE = { instagram: '@yourbrand', x: '@yourbrand' }

/*
 * Connect an account and return cleaned voice samples. Phase-1 mock: resolves
 * with fixtures after a short delay (the feel of a network round-trip). Throws
 * Error with code 'no-posts' when there's nothing usable to learn from.
 */
export async function importPosts(platform) {
  const raw = MOCK_POSTS[platform]
  if (!raw) throw new Error(`Unsupported platform: ${platform}`)
  await new Promise((resolve) => setTimeout(resolve, 900))
  const posts = cleanPosts(raw)
  if (!posts.length) {
    const err = new Error('No usable posts found')
    err.code = 'no-posts'
    throw err
  }
  return { platform, handle: MOCK_HANDLE[platform], posts }
}

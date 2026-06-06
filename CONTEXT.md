# Echo — Claude Code Project Context

> Drop this file in the repo root. Save it as **`CLAUDE.md`** so Claude Code auto-loads it as project memory (you can keep a copy named `CONTEXT.md` too). Build **checkpoint by checkpoint** — after each one, deploy, confirm the live URL works on a phone, commit, then move on.

---

## 1. What we're building

**Echo** — "the creator's digital twin." A mobile-first React PWA where one input (a product photo or a one-line brief) becomes a full multi-platform content kit: a **Reel script + shot list**, an **Instagram carousel**, and an **X thread**, all in the creator's brand voice.

**The demo moment (tomorrow):** snap a product on the phone → three platform-ready posts appear on screen.

## 2. CRITICAL CONSTRAINTS — read before writing any code

- **This is a PWA, NOT native and NOT React Native.** It must run in a mobile browser and be installable ("Add to Home Screen"), fullscreen, mobile-portrait.
- **Cloud-first + auto-deploy.** Every push to GitHub must auto-deploy to a live URL (Vercel). The phone must always have a working live URL to open.
- **THIS SESSION BUILDS ~50%: infrastructure + UI shell only.** Do **NOT** build the real LLM logic yet. The synthesis endpoint returns **hardcoded mock JSON** so the UI looks complete. Leave clear `// TODO (event):` markers where the real AI goes. (Reasons: the AI feature is built live at the hackathon; tonight is plumbing + polish.)
- **Secrets server-side only.** No API keys in client code, ever.

## 3. Tech stack (use exactly this — optimize for speed, not cleverness)

- **React 18 + Vite + JavaScript (JSX)** — plain JS, not TypeScript, to avoid type friction during a sprint.
- **Tailwind CSS** for styling.
- **vite-plugin-pwa** for installability (manifest + service worker).
- **Vercel** for hosting + serverless functions (`/api`). **GitHub** repo connected to Vercel for auto-deploy on push.
- **localStorage** for brand-voice persistence (no backend DB).

## 4. Design system (make it look premium — this is the demo)

- **Background:** near-black `#0B0B0F`. **Surface/cards:** `#15151C` with subtle border `#23232E`.
- **Accent (electric blue, nods to iQOO):** `#2F6BFF`, hover `#1E54E6`. Use for primary buttons, active tabs, highlights.
- **Text:** `#F4F4F6` primary, `#9A9AA6` secondary.
- **Font:** Inter (or system sans). Headings bold/tight; body comfortable.
- **Shape & motion:** rounded-2xl cards, generous padding, soft shadows, smooth 150–200ms transitions, a polished loading animation. Mobile portrait first; everything thumb-reachable.

## 5. Screens (state-based navigation, no router needed)

1. **Brand Voice Setup** — paste 2–4 sample posts OR pick a tone preset (Playful / Professional / Bold / Minimal). Save to localStorage. "Continue" → Capture.
2. **Capture** — a camera button (`<input type="file" accept="image/*" capture="environment">`) and a text-brief input. Either triggers generation. Calls the synthesis endpoint (mock for now) → Loading.
3. **Loading** — branded animation, ~1.5s simulated.
4. **Results** — three tabs/sections, each rendering from the JSON: **Reel**, **Carousel**, **X Thread**. Copy-to-clipboard on each. A "New" button returns to Capture.

## 6. Data contract (build the UI against THIS mock now)

The synthesis endpoint will eventually return this shape. For now, hardcode a realistic sample so the Results screen looks finished:

```json
{
  "reel": {
    "hook": "POV: you found the only water bottle you'll ever need.",
    "script": "Open on the bottle in morning light. Quick cuts: fill, sip, toss in bag. Voiceover on the 3 reasons it's different. End on logo + CTA.",
    "shotList": [
      "0:00 Close-up, bottle on windowsill, morning light",
      "0:03 Hand fills bottle at sink",
      "0:06 Sip, satisfied reaction",
      "0:09 Drop into gym bag",
      "0:12 Logo card + 'Link in bio'"
    ]
  },
  "carousel": {
    "slides": [
      { "title": "Meet your last water bottle.", "body": "Seriously. Here's why." },
      { "title": "1. Keeps cold 24h", "body": "Double-wall vacuum steel." },
      { "title": "2. Leak-proof, for real", "body": "Toss it in your bag. Trust." },
      { "title": "3. Looks good doing it", "body": "Six matte colorways." },
      { "title": "Get yours", "body": "Link in bio →" }
    ]
  },
  "thread": {
    "tweets": [
      "I tested 7 water bottles for 30 days. Only one survived my chaos. A thread 🧵",
      "1/ Most bottles fail the bag test. This one didn't leak once.",
      "2/ Cold water at hour 24. Genuinely didn't expect that.",
      "3/ The little things: one-hand cap, fits the cupholder, no rattle.",
      "4/ Verdict: the boring stuff done right. Link below."
    ]
  }
}
```

The **Carousel** must render as actual swipeable slides (horizontal snap-scroll), the **Thread** as stacked tweet-style cards, the **Reel** as a script block + numbered shot list. Make these look like the real platforms.

## 7. BUILD CHECKPOINTS — complete these tonight (the ~50%)

Do them in order. After each: deploy, open the live URL on a phone, commit.

- **CP0 — Repo + scaffold + first deploy.** `npm create vite@latest` (React + JS), add Tailwind, push to a new GitHub repo, connect to Vercel, confirm a live URL renders "Hello Echo" on the phone. *Done = live URL works on mobile.*
- **CP1 — PWA install.** Add vite-plugin-pwa, manifest, icons (placeholder is fine), service worker. *Done = "Add to Home Screen" works and opens fullscreen.*
- **CP2 — Design system + app shell.** Tailwind theme tokens from §4, base layout, the 4-screen state machine with nav. *Done = can move between all 4 empty screens.*
- **CP3 — Brand Voice Setup.** Inputs + tone presets, persist to localStorage, load on launch. *Done = refresh keeps the saved voice.*
- **CP4 — Capture screen.** Camera file input + text brief; either calls the (mock) endpoint and routes to Loading→Results. *Done = both inputs trigger the flow.*
- **CP5 — Results renderers.** Build Reel / Carousel / Thread from the mock JSON per §6. Polish them hard. *Done = all three look demo-ready.*
- **CP6 — Loading + copy + transitions.** Branded loader, copy-to-clipboard buttons, smooth transitions, empty/error states. *Done = the flow feels finished.*
- **CP7 — Serverless endpoint skeleton.** `/api/generate` accepts `{ input, image, brandVoice }` and returns the mock JSON. Wire the Capture screen to call it. Add `// TODO (event): replace mock with real LLM vision+text call + brand-voice prompt`. *Done = the app calls a real endpoint that returns mock data.*
- **CP8 — Final verify.** Full run-through on the phone, fix rough edges, final commit. *Done = end-to-end works on the phone from the live URL.*

## 8. DO NOT build tonight — this is tomorrow's live work

Leave these as clear `// TODO (event):` stubs:
- The real cloud LLM call (vision + text) inside `/api/generate`.
- The synthesis **prompt** (brand-voice injection + strict-JSON multi-format output).
- On-device WebLLM edge feature.
- Closed-loop "approve → improve voice" learning.

## 9. Working conventions for this session

- Build and **commit after every checkpoint** with a clear message (`feat: CP3 brand voice setup`).
- After each checkpoint, **deploy and confirm the live URL on a phone** — never batch this.
- Keep components small, one file per screen under `src/screens/`.
- Stop and show me the result at the end of each checkpoint before continuing.

## 10. Kickoff prompt (paste into Claude Code after it reads this file)

> Read CLAUDE.md. Complete **CP0** only: scaffold the Vite React + Tailwind app, set up the GitHub repo and Vercel deploy, and give me the live URL. Then stop so I can verify it on my phone before CP1.

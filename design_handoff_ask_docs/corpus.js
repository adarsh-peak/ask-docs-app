// Synthetic "second brain" corpus — realistic personal markdown files.
// Used as the retrieval pool for ask-docs. Each doc has a slug, title, type,
// last-updated date, and body. The actual RAG chunking happens server-side
// in real life; here we hand the whole corpus to Claude with a system prompt
// that constrains it to only answer from these documents.

window.CORPUS = [
  {
    slug: "goals-2026",
    title: "2026 — Annual goals",
    folder: "Goals",
    updated: "2026-01-08",
    body: `# 2026 — Annual goals

Three things, no more.

## 1. Ship \`ask-docs\` to v1
A working second-brain query layer. The bar: I can ask it "what did I conclude about X" and it returns a usable answer with the actual note linked.

- v0.1 — local-only, markdown folder ingest
- v0.5 — embeddings + retrieval, evals on 30 questions
- v1.0 — public, dark-first UI, source citations

## 2. Long-run habit: lift 4×/week
Trailing 30-day adherence > 80%. Not a number on the bar — adherence is the metric.

## 3. Read 24 books, write notes for each
Notes have to actually compress the book — if I can't get it on one screen it doesn't count.

## Non-goals
- Side projects beyond \`ask-docs\`
- Conference talks
- New language (deferring Japanese to 2027)
`,
  },
  {
    slug: "ask-docs-prd",
    title: "ask-docs — PRD",
    folder: "Projects/ask-docs",
    updated: "2026-03-14",
    body: `# ask-docs — Product requirements

## Problem
I have ~600 markdown notes across 4 years. Search is broken — grep is too literal, Notion search loses context, and I forget what I've written. I re-derive conclusions I already had.

## Target user
Me. v1 is single-user. v2 might be team-shared.

## What good looks like
- Ask a natural-language question, get a 3–5 sentence answer
- Every claim cites the source note + chunk
- "Open source" pulls up the markdown rendered, scrolled to the chunk
- Round-trip < 4 seconds for cached embeddings
- I trust it enough to stop opening Notion

## RAG architecture
- Chunk: ~512 tokens, 64-token overlap, split on headings first
- Embed: \`text-embedding-3-small\` (1536 dims, cheap, good enough)
- Store: pgvector on Neon
- Retrieve: top-8 chunks, MMR rerank to 5
- Generate: Claude Sonnet, low temp, structured output with citation indices

## Non-goals (v1)
- Multi-user
- Editing notes from the chat
- Voice
- Mobile-first (desktop only)
`,
  },
  {
    slug: "ddia-notes",
    title: "Designing Data-Intensive Applications — notes",
    folder: "Reading/Books",
    updated: "2026-02-19",
    body: `# Designing Data-Intensive Applications — notes

Re-read for the third time. Different things land each pass.

## Chapter 5 — Replication
The taxonomy I actually use now:
- **Single-leader** — default. Boring works.
- **Multi-leader** — only when you have geo-distribution constraints. Conflict resolution is the tax.
- **Leaderless** (Dynamo-style) — quorum reads/writes. Good for high write availability, weird for the rest.

> Replication lag is not a bug — it is a property of the system. Anyone who claims their replicas are "in sync" is lying or running single-node.

## Chapter 7 — Transactions
Serializability is what you want. Read committed is what you get. Snapshot isolation is the compromise most DBs ship.

## What changed my mind
For \`ask-docs\` I was going to use a separate vector DB. After re-reading ch.5–7, decided pgvector is fine — fewer moving parts, transactional guarantees with the rest of the data, and 600 docs doesn't justify Pinecone.
`,
  },
  {
    slug: "1on1-ankur-apr",
    title: "1:1 with Ankur — 2026-04-12",
    folder: "Work/1:1s",
    updated: "2026-04-12",
    body: `# 1:1 with Ankur — 2026-04-12

## Topics
- Q2 priorities for the platform team
- Hiring loop redesign — onsite is too long
- My promo case

## Decisions
- Cutting the systems-design round from 90 to 60 min. Two signals, not three.
- I'll write the promo doc by 04-26. Ankur wants concrete numbers, not narrative.
- Pause the migration to event-sourcing for now — too much in flight.

## What I'm taking away
The promo doc isn't about what I did, it's about scope and ambiguity. Ankur's exact phrasing: "tell me what you owned that nobody else would have."

## Follow-ups
- Send Ankur the hiring-loop redesign doc by Friday
- Ask Priya about the platform team's eng-week numbers
`,
  },
  {
    slug: "infra-services-idea",
    title: "Idea — personal infra services",
    folder: "Ideas",
    updated: "2026-02-02",
    body: `# Idea — personal infra services

The thesis: I keep rebuilding the same 4 services across side projects. Auth, payments, notifications, analytics. Build them once as branded services, reuse across everything I ship.

## The pitch to myself
- Saves ~2 weeks per side project
- Forces brand consistency (everything looks like *me*)
- If they're good enough, maybe public eventually — but solve my own problem first

## Stack
- TypeScript end-to-end
- Hono for the API surface (lightweight, edge-friendly)
- Postgres on Neon for storage
- Branded with \`@adarsh_goswami/brand\` so consuming projects look right out of the box

## Risk
Yak shaving. The whole point of side projects is to ship — building infra to ship faster is a meta-trap. Time-box: 2 weekends per service, max.

## Status
- Auth: 60% done, JWT + refresh works, OAuth pending
- Payments: not started
- Notifications: not started
- Analytics: probably never (PostHog is fine)
`,
  },
  {
    slug: "morning-routine",
    title: "Morning routine — experiment log",
    folder: "Habits",
    updated: "2026-03-30",
    body: `# Morning routine — experiment log

Running an N=1 experiment on what actually makes mornings work.

## Hypothesis
The first 90 minutes determine the day. If I get them right, the rest is downstream.

## What I'm testing (March)
1. Wake 6:30, no snooze
2. No phone for first 60 min
3. 20 min reading (paper book, not Kindle)
4. 20 min walk before coffee
5. Coffee + planning the day in a notebook (3 things)

## Results after 3 weeks
- Adherence: 17/21 days
- Days I felt "great": 14/21 — vs ~6/21 baseline
- The phone-free hour is the biggest lever. Drop it and everything else degrades.

## Surprises
- The walk-before-coffee thing is real. Sunlight before caffeine actually changes the curve of the day.
- I thought reading would feel forced. After day 4 it was the part I looked forward to.

## Sticking
Continuing through April. Adding: 5 min mobility before the walk (knees are complaining).
`,
  },
  {
    slug: "japan-itinerary",
    title: "Japan 2026 — itinerary draft",
    folder: "Travel",
    updated: "2026-03-22",
    body: `# Japan 2026 — itinerary draft

Two weeks, late October. Flying into Tokyo, out of Osaka.

## Skeleton
- Days 1–4: Tokyo (Shibuya base)
- Days 5–6: Hakone (ryokan, one night)
- Days 7–9: Kyoto
- Days 10–11: Nara + day trip Osaka
- Days 12–14: Osaka

## Must-do
- teamLab Planets (book ahead, sells out)
- Shinkansen Tokyo → Kyoto (JR Pass math: marginal at current pricing, skip)
- Fushimi Inari at dawn, not midday
- Standing sushi in Tsukiji outer market
- Day trip to Naoshima if Days 12–14 weather is bad in Osaka

## Costs (rough)
- Flights: ~$1,400 round trip from SFO
- Lodging: $180/night × 13 = $2,340
- Food + everything else: $80/day × 14 = $1,120
- Total est: ~$4,900

## Open questions
- Worth adding Kanazawa for the gardens?
- Pocket wifi vs. eSIM — leaning eSIM
`,
  },
  {
    slug: "dal-makhani",
    title: "Dal makhani — the recipe that works",
    folder: "Recipes",
    updated: "2025-12-08",
    body: `# Dal makhani — the recipe that works

After ~6 attempts, this is the one. The secret is *time*, not ingredients.

## Ingredients
- 1 cup whole urad dal
- 1/4 cup rajma (kidney beans)
- 1 large onion, finely chopped
- 4 tomatoes, pureed
- 2 tbsp ginger-garlic paste
- 2 tbsp butter (do not substitute)
- 1/4 cup cream
- Spices: cumin, garam masala, kashmiri chili, salt

## Method
1. Soak dal + rajma overnight (8+ hours, non-negotiable)
2. Pressure cook with salt, 6 whistles, simmer 30 min after
3. Tadka: butter, cumin seeds, ginger-garlic, onions until brown (15 min, slow)
4. Add tomatoes, cook until oil separates (10 min)
5. Combine, simmer 90 minutes on lowest flame, stirring every 10
6. Cream in at the very end, off heat

## What I learned
- "Slow cook on lowest flame" is the entire recipe. Everything else is a rounding error.
- Restaurants finish with a charcoal smoke. I tried it once. Worth it for guests, skip for weeknight.
- Day-2 dal is genuinely better than day-1. Make it the night before.
`,
  },
  {
    slug: "promo-doc",
    title: "Promo case — draft",
    folder: "Work/Career",
    updated: "2026-04-22",
    body: `# Promo case — draft (do not share)

For the L6 → L7 case, due 04-26. Ankur said: scope and ambiguity, not narrative.

## Scope
- Owned the migration of the billing pipeline from monolith → service. 14M events/day at peak.
- Designed and shipped the platform-team's deploy pipeline rewrite. Cut deploy time p50 from 22m → 4m.
- Mentored 3 engineers, one of whom got promoted to L5.

## Ambiguity
- Billing migration had no spec when I picked it up. Wrote it. Got buy-in from finance + data eng + my team across 6 weeks of pre-work before any code.
- Deploy pipeline — the previous attempt had failed. Diagnosed why (incremental redesign without retiring the old path), proposed a clean cutover, got it approved.

## What nobody else would have done
- Caught the silent double-billing bug in the migration before it hit prod. Three months of revenue at risk. Nobody asked me to write that shadow-traffic comparison.

## Risks in the case
- I can't claim sole credit for deploy pipeline — Maya did 40% of the work. Need to frame as "led" not "built."
- Mentorship is the weakest leg. May get pushed back on.

## TODO
- Ankur's review by 04-25
- Add the cost numbers from the billing migration (Priya has them)
`,
  },
  {
    slug: "books-2026",
    title: "Books read — 2026 log",
    folder: "Reading",
    updated: "2026-04-30",
    body: `# Books read — 2026 log

Goal: 24 books with notes. Tracker.

## January
1. *Designing Data-Intensive Applications* — Martin Kleppmann. Re-read #3. [notes](ddia-notes)
2. *The Goal* — Eli Goldratt. Bottleneck thinking. Genuinely good in a way self-help isn't.
3. *Piranesi* — Susanna Clarke. The first novel that made me stop and re-read sentences in a while.

## February
4. *Working in Public* — Nadia Eghbal. Why open-source maintainers burn out.
5. *Slouching Towards Bethlehem* — Joan Didion. Re-read.

## March
6. *Annihilation* — Jeff VanderMeer.
7. *Build* — Tony Fadell. Skim-read. Useful, but not as much as the hype.

## April
8. *Stoner* — John Williams. Quiet, devastating. Best of the year so far.
9. *The Three-Body Problem* — Liu Cixin. Re-read before the sequel.

## On pace?
On pace at 8/4 months = 24/year. Just barely.
`,
  },
  {
    slug: "workout-march",
    title: "Workout log — March 2026",
    folder: "Habits/Lifting",
    updated: "2026-04-01",
    body: `# Workout log — March 2026

Trailing 30-day adherence: 18/30 sessions = 60%. Below the 80% target.

## Numbers (working sets, top weight)
- Squat: 285 → 295 (+10)
- Bench: 205 → 210 (+5)
- Deadlift: 365 → 365 (no change, programmed deload week 3)
- OHP: 130 → 135 (+5)

## What went wrong on adherence
- Travel week 04-08 to 04-12: missed 4 sessions. No gym at the hotel and didn't pack bands.
- Knee acted up week 3, skipped one squat day deliberately.

## Adjustments for April
- Pack bands when traveling. Doing 30-min hotel-room session > skipping.
- Adding mobility work to morning routine — see [morning-routine].
- Programming: switching from 5/3/1 to a higher-frequency upper/lower split. Will revisit in 6 weeks.
`,
  },
];

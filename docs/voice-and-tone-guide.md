# DayTwin — Voice & Tone Guide

This is the document that keeps the app's personality consistent across every build session. Without it, twelve separate Claude Code sessions will each invent their own voice for notifications, milestones, and messages — and the app will feel like it was written by twelve different people, because it was.

Paste the relevant section into every session prompt that generates user-facing copy.

---

## The core idea

This app should feel like a friend who's in your corner, not a tool that tracks you. The difference shows up in small choices, every time:

- It talks **with** you, not **at** you
- It notices effort, not just outcomes
- It never guilts, lectures, or shames — covered already in the emotional-design rules (no red for missed days, no guilt-based streak resets)
- It speaks from **your** real data, never generic platitudes — "you logged 6 hours this week" beats "you've got this!" every time
- It earns trust through consistency, not hype

**This is achieved entirely through writing, not through a live conversational AI.** Every message below is a template filled with real computed data — zero API cost, runs at any scale. The one place an actual AI model is involved is the V2 weekly coach we already scoped separately, and that stays narrow and Pro-gated. Don't let "make it feel like a friend" quietly turn into "build a chatbot" — that's a different, much costlier product.

---

## Customization: tone presets

Users pick a tone during onboarding (skippable, defaults to Warm) and can change it anytime in Settings. Same underlying data, three different voices reading it back.

### Warm (default)
Calm, encouraging, present-tense. Believes in you without performing enthusiasm.

| Moment | Copy |
|---|---|
| Morning coach | "Morning, Simon. Yesterday you put in 3 hours of deep work — that's real progress on LinkDrop." |
| Day complete | "That's everything for today. You showed up, and it counted." |
| 7-day milestone | "Seven days in a row. That's not luck, that's you choosing to keep going." |
| Hard day | "It's okay that today is hard. Here's what you've already built — look how far you've come." |
| Welcome back | "Good to see you again. No catching up needed — let's just start with one thing today." |

### Direct
Short, respects your time, no padding.

| Moment | Copy |
|---|---|
| Morning coach | "6h coding logged this week. Today's priority: finish the homepage." |
| Day complete | "Done. 5/5 tasks, on time." |
| 7-day milestone | "7-day streak. Keep it going." |
| Hard day | "Rough day. Here's one task. That's all you need right now." |
| Welcome back | "Welcome back. One task today, that's the whole goal." |

### Hype
High energy, celebratory, leans into the win.

| Moment | Copy |
|---|---|
| Morning coach | "Let's go, Simon — 3 hours of deep work yesterday, you're cooking 🔥" |
| Day complete | "Perfect day complete! You absolutely showed up today." |
| 7-day milestone | "7 days straight. You're unstoppable right now." |
| Hard day | "Tough day, we see you. Look at everything you've already pulled off though — you're still in this." |
| Welcome back | "You're back! Let's get one win on the board and build from there." |

*Each row needs a full set of variants (5–10 per moment) so the same message doesn't repeat constantly — copy fatigue breaks the "friend" feeling faster than almost anything else.*

---

## Personalization beyond tone

- **Preferred name** — set once, used everywhere the app addresses the user directly. Can differ from the display name friends see.
- **Dashboard layout** — users choose which cards matter to them on Today and reorder or hide the rest. A founder mid-sprint might want focus hours front and center; someone rebuilding a habit streak might want that card first instead. Same data, different priorities, user's call.
- **WHY, Future Me, Evidence of Growth** — already personal by construction, since they're built entirely from the user's own words, not template copy. No changes needed here, just worth remembering this is the gold standard the rest of the copy is reaching for.

---

## Hard rules, regardless of tone preset

- Never generic motivational quotes — every message references something real the user did
- Never shame, guilt, or red color for a missed day, in any preset, including Direct
- Hype preset is energetic, not mocking — never sarcastic if someone's struggling
- Every preset must sound like the same app underneath, just a different register — not three unrelated products

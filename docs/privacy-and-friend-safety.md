# DayTwin — Privacy & Friend Safety

This is a build spec and internal policy reference — it defines exactly what's private, what's friend-visible, and what the app must support around data deletion and safety. **It is not a published Privacy Policy.** Before this goes beyond friends, the data classification below should turn into an actual privacy policy and terms of service, ideally reviewed by someone qualified — not generated from this doc directly.

---

## The core mental model

**Growth tab = your diary. Friends tab = your scoreboard.**

Everything under Growth (goals, the WHY screen, reflections, Future Me, the Evidence of Growth timeline) is private by default, always, with no exceptions or settings to change that. Everything under Friends is built entirely from aggregate numbers — never raw content. A friend can see that you're consistent. They can never see what you wrote, what you're working toward, or how you actually spent your time.

This single rule resolves almost every visibility question below.

---

## Data classification

### Private — owner only, never visible to friends, no setting changes this
- `reflections` — went_well, time_wasted, biggest_win
- `mood_logs`
- `intentions` — the morning intention text
- `goals` — including `why_text`; friends never see your goals through the app, even if you're friends
- `tasks` — titles and content; friends should never see *what* you're working on, only that you made progress
- `time_entries` — categories and durations (a friend seeing "social media: 9h" is a judgment risk, not a feature)
- `spark_transactions` — your spending history
- Future Me messages — already local-only, never touches the server at all

### Friend-visible — accepted friends only, aggregate numbers only
- `daily_scores.score_pct` — the number, never the breakdown
- `habit_streaks` — shown as an overall consistency figure, never tied to a specific habit's name (a habit literally called "no drinking" or "take medication" should never broadcast to a friends feed)
- `user_badges` — achievements are meant to be shown off, fine to share
- `sparks_lifetime` / Growth Level — a flex stat, safe to share
- Profile basics — display name, avatar, active theme

### Challenge-shared — visible only to participants of that specific challenge
- `challenge_participants.current_score` for that challenge, visible only to people in it
- A specific habit's name and progress *only* when it's the subject of an active habit-pact challenge — both people see it because they explicitly joined the pact together. Outside that challenge, the same habit is private again.

### Public / discoverable — minimal, before any friendship exists
- `username`, `display_name`, `avatar_url` — just enough for someone to find and add you. Nothing else is visible until a friend request is accepted.

This classification maps directly to RLS policy in Session 1 — anything not explicitly marked friend-visible or challenge-shared defaults to `user_id = auth.uid()` only, no exceptions.

---

## Friend safety mechanics

- **Adding friends** — username search returns only the public fields above; nothing more leaks pre-friendship. Worth keeping search to exact-match rather than a browsable directory in V1 — that alone removes most of the stranger-contact risk that comes with public social directories, while invite links still make it effortless for you to add the people you actually know.
- **Removing a friend** — silent, no notification to the other person. Matches how most social apps handle it; "X removed you" notifications create unnecessary conflict.
- **Blocking** — removes the friendship, prevents future friend requests from that user, and hides you from their search results.
- **Reporting** — not needed for a friend-circle launch, but worth having a plan for before this grows past people you know personally. A simple "report" action on a friend profile that flags to you (the operator) is enough for V1; a real moderation queue is a later problem.

---

## Deletion & export

- **Account deletion** must actually delete — reflections, mood logs, intentions, tasks, habits, time entries, and spark transactions are hard-deleted or irreversibly anonymized, not just hidden. Shared rows (a challenge the deleted user was part of) should degrade gracefully for the other participant — "former participant" rather than a broken reference — without retaining the deleted user's actual content.
- **Data export** — a JSON download of everything the user owns. Already in the Settings list; worth keeping, since it's also a real trust signal, not just a compliance checkbox.
- **Payments** — when Pro launches, Paystack handles card details directly (hosted fields / redirect flow). The app itself should never receive or store raw card numbers — this keeps you out of PCI-DSS scope entirely, which is the right call for a solo-founder product.

---

## Age policy

Given the reflective and social nature of the app (mood logs, friend visibility, challenges), a lightweight age gate is worth having — a simple self-certification at signup ("I'm 16 or older") rather than real identity verification. Sixteen is a common floor for apps with a social or emotional-content layer; thirteen is the more common floor for apps with neither. Worth deciding deliberately rather than defaulting to nothing.

---

## Before public launch (beyond friends)

- Register as a data controller with Ghana's Data Protection Commission, or get clarity directly from them on whether/how it applies at your scale
- Turn this document into an actual privacy policy and terms of service
- If usage ever extends meaningfully outside Ghana, revisit this — GDPR and other regional rules may apply and weren't evaluated here

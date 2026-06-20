# DayTwin — Code Quality Standards

This applies to every build session from here on, not just one — read it alongside `database-schema.md` and `privacy-and-friend-safety.md` before writing any code.

## Why this matters

Simon reads and modifies this code himself between Claude Code sessions, and each new session needs to understand past decisions without reverse-engineering them from scratch. Comments aren't decoration — they're how a solo founder stays in control of a codebase that's getting built in twelve separate sittings.

## Comments

- Every non-trivial function or component gets a short comment above it explaining what it does and *why* it exists — not just restating the code
- Inline comments on anything non-obvious, especially: the grace-day streak calculation, the elapsed-time validation for focus sessions, any RLS-adjacent business logic, and anywhere a specific number or threshold was chosen — explain the reasoning, e.g. `// 3+ tasks required so this bonus can't be farmed with one dummy task`
- Don't comment the obvious — `// increment counter` above `counter++` adds noise, not clarity

## TypeScript

- No `any` unless genuinely unavoidable — and if used, a comment explaining why
- Types/interfaces for every data shape, matching the field names and types in `database-schema.md` exactly

## Structure

- Small, focused functions and components — one clear responsibility each, not one function doing five things
- Shared logic lives in one reusable place (a single `formatScore()` utility, for example) — never duplicated across files
- Consistent folder structure: components, utilities, hooks, and app routes clearly separated
- No dead code, no commented-out code left behind

## Error handling

- Real, visible error states — not silent failures
- `try/catch` around anything that can fail: network calls, Supabase queries

## Example of the bar

```ts
// Bad — no context, unclear intent
function calc(a, b) {
  return a / b >= 0.8 ? true : false;
}

// Good — typed, named clearly, explains the threshold
/**
 * A day counts as "consistent" if 80%+ of planned habits were completed.
 * Used by the grace-day system — falling below this doesn't burn the weekly grace day.
 */
function isConsistentDay(completed: number, planned: number): boolean {
  return planned > 0 && completed / planned >= 0.8;
}
```

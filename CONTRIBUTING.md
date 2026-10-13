# Contributing to THE COMPOUND

The MVP is finished and frozen as a baseline (`docs/09-mvp-completion-report.md`, Vietnamese).
This file tells you how to continue the project without breaking the guarantees the MVP ships with.

Everything below is enforced by tests, so the short version is: **`node --test tests/*.test.mjs` must stay green.**

## Ground rules

- **Zero runtime dependencies.** Node ≥ 22, ESM `.mjs`, JSON content. No `npm install`, no build step, no framework. `src/engine/core.mjs` must keep running unmodified in the browser (no Node imports).
- **Deterministic.** No `Math.random`, no `Date.now`, no locale-dependent sort. Every run is a pure function of (content, role, decisions). The replay tests will catch you if you break this.
- **One mutation entry.** All state changes go through `apply()` inside a `transact()`. Never touch `GameState` directly.
- **Knowledge isolation.** `src/engine/projection.mjs` is the only thing a UI may read. Truth values, NPC beliefs, trust numbers and hidden flags never reach a view. `tests/session.test.mjs` (LEAK) checks this.
- **Never weaken a test.** If a test fails, the content or the code is wrong, not the test. Deleting or loosening a gate needs a written reason in the PR.
- **Content changes invalidate old saves.** `contentVersion` hashes the whole content bundle, so even a typo fix means old saves refuse to load. This is intended. Say so in the changelog.

## Workflow

```
node --test tests/*.test.mjs      # all 117 tests, ~60 s
node scripts/verify-mvp.mjs       # regenerates docs/07-mvp-verification.md
node src/cli/play.mjs --auto --role captive   # quick smoke run without a player
```

Before opening a PR:

1. Tests green.
2. If you touched `content/` or `src/`: run `node scripts/verify-mvp.mjs` and commit the regenerated `docs/07-mvp-verification.md`.
3. If you added content: add at least one scripted scenario to `tests/corpus.mjs` that reaches it, and a static gate in `tests/content-gates.test.mjs` for any new invariant (every event reachable, every choice has a target, every fact id exists, …).
4. Keep `docs/08-mvp-architecture.md` in sync if you changed engine semantics. It is the current spec; `docs/01`–`docs/06` are historical and are not edited.
5. Optionally regenerate the manifest: `sha256sum <files> > docs/mvp-checksums.txt` (see the header of that file for the list). It is a convenience for verifying a release, not a gate.

## Adding content

All content lives in `content/*.json`, documented in `README.md` → Layout and in `docs/08`. The type contracts are in `src/engine/types.ts` (not type-checked in the pipeline, but the tests compare constants against it). The important shapes:

- **Events** (`timeline.json`): `id`, `roles[]`, `trigger` (`forced` | `optional` | `scheduled`), `at: { day, segment }`, `location`, `summary.vi`, `observations[]` (text + `grants[]` the player witnesses) and `choices[]`. Each choice has `id`, `label.vi`, an optional `available` condition and `consequences[]`.
- **Condition AST**: every node is `{ "op": ... }`. Operators: `always`, `and`/`or` (`args[]`), `not` (`arg`), `role`, `segment`, `stat` (`stress` | `suspicion`, with `cmp` and `value`), `trust`, `tag`, `flag` (`equals`), `flagCmp`, `playerBelief`, `npcBelieves`, `npcKnowsTag`, `npcStatus`, `eventFired`. There is deliberately **no `fact` operator**: content can never read world truth, only what an agent believes.
- **Consequences**: `stat`, `setStat`, `trust`, `tag`, `witnessTag`, `flag`, `flagAdd`, `belief` (grant a belief to an agent at a rank) and the compound forms listed in `types.ts` §6. Consequences are the only way content mutates state.
- **NPC actions** (`npc.intents.json`): what an NPC does at the convergence point, from *its own beliefs only*. The visibility contract (`tests/intents.test.mjs`) rejects an action whose condition reads a fact the NPC has not been declared able to see.
- **Delayed rules** (`rules.delayed.json`): consequences that fire N segments later unless superseded by an NPC action.
- **Endings / epilogues**: endings are tag sets; epilogue variants are keyed by ending × role. Every ending must stay reachable for both roles (`tests/evaluator.test.mjs` witness paths).

All player-facing text is under a `vi` key. If you add a second language, add a parallel key (`en`, …) and a projection switch; do not interleave languages in one string.

## Where to pick up (open items from the MVP report, §6)

These were deliberately **not** done in the MVP because they need new content or a product decision. They are the best first contributions.

| Item | What is missing | Why it was left |
|---|---|---|
| **L-07 silent world changes** | Thạch takes the phone from the dorm ceiling on night D4 and Linh hands it up on morning D5 without any player-visible event. Needs two new events (one per occurrence) so the player can notice the world moved. | New content, out of MVP scope |
| **L-10 Mai recovers her own phone** | When Mai takes her phone back the world stays silent: no raid, no reaction. Decide whether that is a feature (a quiet ending path) or needs a consequence. | Design decision |
| **L-11 unread Operator knowledge** | The Operator's `pressure/point_mai` choice writes knowledge that nothing ever reads. Either add a reader (an event or NPC action keyed on it) or drop the write. | Design decision |
| **L-20 Operator phone branch funnels** | The Operator's phone branch is almost only reachable via `verify → discredit`. Consider a second route. | Design decision |
| **L-17 `npcStatus = gone` never written** | The epilogue card for a vanished NPC exists but no rule ever sets the status. Decide which event sets it. | Design decision |
| **Choice coverage 68 %** | The corpus reaches 89 of 131 choices. Adding scenarios that reach the rest tightens the "0 violations" claim. | Only a sampling, not a proof |
| **Session replay cost** | `Session` replays the whole decision log on every action (O(n²), ~45 ms at end of game). Fine for 21 segments; add checkpoints if you extend the calendar. | Not needed at MVP size |
| **`types.ts` is not type-checked** | There is no `tsc` in the pipeline. Adding a dev-only typecheck step (without making it a runtime dependency) would be welcome. | Zero-dependency rule |
| **Balance / playtest** | Stat thresholds have never been tuned with human players. | No players yet |
| **Second language** | All content is Vietnamese. | Scope |

Items L-07 … L-20 reference `docs/reviews/mvp-logic-review.md`, which has exact reproduction scripts for each.

## Reporting a bug

Open an issue with: role, the decision list (the `decisions` array from a save file is enough, saves contain no state), and what you expected. Because the engine is deterministic, that is a complete repro.

## License

By contributing you agree your contribution is released under the MIT License in `LICENSE`.

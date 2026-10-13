# THE COMPOUND

Psychological survival / social simulation. One world, two perspectives, incomplete information, real consequences. Seven days, three segments a day, at most one action per segment; five NPCs with their own drives who act whether or not you are watching.

**Status: MVP (2026-10-13).** Two playable roles, five autonomous NPCs, 7-day deterministic simulation, four reachable endings per role, replay-verified save/load, terminal and browser interfaces. Zero runtime dependencies (Node ≥ 22). All content is Vietnamese.

## Run it

```
node src/cli/play.mjs                       # terminal: choose a role, play; s = save, j/b/n = journal/beliefs/people, q = quit
node src/cli/play.mjs --load saves/x.json   # resume a save (replay-verified before it loads)
node src/cli/play.mjs --auto --role captive # zero-player run: the world without you
node src/server.mjs                         # browser: http://127.0.0.1:8787/  (loopback only; never a public deploy)

node --test tests/*.test.mjs                # 117 tests, 0 failures (~60 s)
node scripts/verify-mvp.mjs                 # regenerates docs/07-mvp-verification.md (executable evidence for the MVP DoD)
sha256sum -c docs/mvp-checksums.txt         # integrity of the delivered files (manifest of the MVP release)
```

`npm test`, `npm run play`, `npm start`, `npm run verify` are the same commands (no install needed; there is nothing to install).

## Layout

```
src/engine/core.mjs        ENGINE — state, Condition AST, apply() (single mutation entry), transact() (atomic steps),
                           segment lifecycle, convergence (propagation → NPC actions → delayed rules), policies,
                           deterministic replay, save/load. No Node imports: runs in node and in the browser.
src/engine/session.mjs     SESSION — interactive layer: state = replay(decisions); prompt / choose / pick / view / save
src/engine/projection.mjs  PLAYER VIEW — bands, beliefs, journal, epilogue; never reads truth values or NPC knowledge
src/engine/content.mjs     content bundle + contentVersion hash (Node and browser)     src/engine/hash.mjs  canonical JSON + FNV-1a 64
src/engine/evaluator.mjs   Node entry (loads content/*.json, re-exports core)         src/engine/types.ts  type contracts
src/cli/play.mjs           terminal interface      src/web/app.mjs + index.html  browser interface      src/server.mjs  local static server

content/truth.json         WORLD TRUTH — 29 immutable facts (+ decoys); never in GameState, never in a save
content/flags.json         25 contingent world flags (+ NPC visibility declarations, playerInitial stats)
content/npcs.json          5 NPCs, relationship graph, 8 knowledge-propagation rules
content/timeline.json      7-day canonical background (7 occurrences) + 49 events / 131 choices (17 forced, 21 optional, 11 scheduled)
content/rules.delayed.json 15 delayed-consequence rules (6 superseded by NPC actions)
content/npc.intents.json   8 NPC drives, 10 NPC actions, allowReadBeforeWrite declarations
content/endings.json       4 endings (THOÁT, PHƠI BÀY, ĐẢO VAI, CHUYỂN GIAO) + witness paths per role
content/epilogues.json     epilogue variants per ending × role + one card per NPC

tests/consistency.test.mjs   21 static invariants (Phase 2)        tests/intents.test.mjs      visibility contract, Gate C
tests/evaluator.test.mjs     T01–T10, corpus, witness paths         tests/content-gates.test.mjs audit §12 gates (T-B … T-O2, EPILOGUES)
tests/engine.test.mjs        ATOMIC, ORDER, REPLAY, IDEMPOTENT, CONFLICT, SAVE/LOAD, COUNTERFACTUAL, ZERO-PLAYER, COVERAGE, TYPES, INVARIANTS
tests/session.test.mjs       LEAK, PLAY, PROMPT, ENDINGS, EPILOGUE, DISTORTION, SAVE/LOAD via Session
tests/launch.test.mjs        server + CLI (auto, script, interactive over stdin, load, tampered save)
tests/corpus.mjs             24 scripted scenarios + witness-path policies (shared by tests and scripts)

scripts/verify-mvp.mjs       MVP evidence generator → docs/07-mvp-verification.md
scripts/trace.mjs            Phase 3 trace generator → docs/06-phase3-phone-scenario-trace.md (historical)
```

## Documents

| | |
|---|---|
| `docs/09-mvp-completion-report.md` | **MVP completion report (vi) — start here** |
| `docs/08-mvp-architecture.md` | MVP runtime architecture as implemented; ratified engine assumptions |
| `docs/07-mvp-verification.md` | generated evidence: tests, 34 runs, 861 save round-trips, 8 ending traces, NPC autonomy |
| `docs/reviews/mvp-architecture-review.md`, `docs/reviews/mvp-logic-review.md` | internal reviews of the MVP (independent passes) |
| `docs/01-phase1-gdd-lite.md` | GDD Lite (vi) — Phase 1, approved |
| `docs/02-phase2-architecture.md`, `docs/03-phase2-checkpoint.md` | Phase 2 architecture (historical; superseded where `docs/08` differs) |
| `docs/04-single-player-sim-evaluation.md` | NPC intent proposal (P1–P6) — approved → Phase 3 |
| `docs/05-independent-logic-audit.md`, `docs/05-doc-consistency-report.md` | independent logic audit (F-01…F-23) that the MVP content gates enforce |
| `docs/06-phase3-review-package.md`, `docs/06-phase3-phone-scenario-trace.md`, `docs/reviews/phase3-*.md` | Phase 3 review package (historical) |
| `docs/phase2-checksums.txt`, `docs/phase3-checksums.txt`, `docs/mvp-checksums.txt` | SHA-256 manifests per milestone |

## Guarantees (each backed by tests)

- **Deterministic.** No RNG, no clock, no locale-dependent ordering. A run is a pure function of (content, role, decisions); reversing every content array reproduces every run bit-for-bit.
- **Atomic.** Every event, propagation step, NPC action and delayed rule is applied in a transaction; a violated invariant rolls the step back entirely.
- **Replayable.** Saves hold the decision log plus hashes, not state. Loading replays and verifies; every prefix of a decision log is a valid resume point.
- **Isolated knowledge.** The player view is built only from the player's own knowledge, physically observable NPC status, the journal and content text. Truth values, NPC beliefs, trust numbers, hidden flags and misinformation attestations never reach a UI.
- **Autonomous NPCs.** Five NPCs act at the convergence point from their own beliefs (visibility contract enforced statically), at most one action per NPC per segment; conflicts resolve by priority and timing.

## Contributing

The MVP is a frozen baseline; the project is open for others to continue. `CONTRIBUTING.md` has the ground rules (zero dependencies, determinism, never weaken a test), the content schema, and a table of the open items that were deliberately left out of the MVP: they are the best first contributions. Bug reports only need the role and the decision list from a save, since every run is deterministic.

## License

MIT, see `LICENSE`. This covers the engine, the tooling and the Vietnamese game content alike.

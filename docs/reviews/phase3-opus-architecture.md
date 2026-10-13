# PHASE 3 — ARCHITECTURE REVIEW BRIEF (for Claude Opus)

Project: THE COMPOUND · PO: Huypkc · Prepared by: Claude Fable · Date: 2026-10-12
Your role: **independent Architecture Reviewer**. You are not asked to confirm the design. You are asked to break it.

## 0. What you are reviewing

Phase 3 added, on top of the Phase 2 architecture (`docs/02-phase2-architecture.md`):

1. A **reference evaluator** (`src/engine/evaluator.mjs`, 325 lines, test-only, zero deps) that executes the segment lifecycle literally.
2. An **NPC Intent Layer** (`src/engine/types.ts` §9b; `content/npc.intents.json`): `NpcAction = DelayedRule + {actor, drive, touches, supersedes}`, evaluated at a new convergence step 6a' between propagation and global rules.
3. A **visibility contract** (`content/flags.json` `visibleTo/visibleByValue`; `tests/static-checks.mjs` `visibilityViolations`).
4. A deterministic **test harness** (59 tests) and a **scenario corpus** (`tests/corpus.mjs`).

Full package: `docs/06-phase3-review-package.md`. Generated traces/dependency map: `docs/06-phase3-phone-scenario-trace.md`.

Reproduce first (Node ≥ 22, nothing to install, nothing privileged):

```
cd /root/working
node --test tests/*.test.mjs            # expect 59 pass
node scripts/trace.mjs                  # regenerates the trace doc byte-identically
sha256sum -c docs/phase3-checksums.txt
```

If you have `tsc`: `tsc --strict --noEmit src/engine/types.ts` — nobody has run this yet (assumption A1 is UNKNOWN).

## 1. Questions we want answered (please answer each with evidence, not opinion)

### Architectural integrity
- A1. `evaluator.mjs` is plain JS and does not import `types.ts`. The contract between them is checked only by tests. Is that acceptable for a reference evaluator, or does it let `types.ts` drift (e.g. `NpcAction.once: boolean` vs `DelayedRule.once: true`)? Propose the cheapest binding (JSON schema generated from TS? a `tsc` CI gate? `// @ts-check` + JSDoc?).
- A2. `apply()` is the single mutation entry point, but `start()` writes initial beliefs directly (no `apply`, cause `engine_init`). Is this a hole in the "every mutation goes through apply" invariant? Does it matter for replay?
- A3. `supersedes`: Phase 2 rules stay in `rules.delayed.json` and are disabled at runtime when intents load. Is "two sources of truth, one switched off by data" a maintainable design, or should superseded rules be deleted once PO approves? What breaks if someone forgets to list a rule?

### State model quality
- A4. `ENGINE_ORDERING` (types.ts bottom, evaluator.mjs top) pins six open spec points as constants marked ASSUMPTION. Are any of these the *wrong* default? In particular: clamp per-mutation vs per-convergence (audit F-08) and equal-rank belief grant = no-op (F-11, affects `acquiredAt` and `mutationLog` size).
- A5. `visibleByValue` on `phone.location` encodes "the holder knows they hold it" and "the hider knows where they hid it" (`dorm_ceiling → ['duc']`, `yard_cache → ['duc']`). This is a static approximation of a dynamic fact (Đức keeps "knowing" the ceiling location even after Vũ silently removes the phone — though no action currently exploits this). Is a static per-value whitelist the right primitive, or should location knowledge be a Belief like everything else?
- A6. `touches` lets an action's *resolution* read world flags its *decision* cannot. This is deliberate (physical contact) but it is also the only place an NPC reads hidden state. Is the boundary well-defined? Could content authors abuse it (e.g. `touches: ['evidence.outside']`)? Should `touches` be restricted to flags with a declared physical locus?

### Module boundaries & hidden coupling
- A7. `A_THACH_RAID_WHERE_I_BELIEVE` scapegoats Đức if Thạch `npcKnowsTag T_C_COVERED_DUC_SEARCH` — a tag relayed by `PR_LINH_RELAY_CAPTIVE_TAGS`. This silently made a previously inert propagation rule (audit F-16) load-bearing. Is the dependency discoverable? Does `reads` need a `tags` entry for `npcKnowsTag` (currently `reads.tags` only tracks player `tag`)?
- A8. `tests/corpus.mjs` is imported by both tests and `scripts/trace.mjs`; `tests/static-checks.mjs` is imported by tests only. Is the `tests/` directory doing double duty as a library? Suggest a layout.
- A9. The evaluator's `engineOptions.rulesBeforePropagation` exists only for sensitivity test CF-8. Is a test-only knob inside the engine acceptable, or should ordering be injected (strategy object)?

### Extensibility & complexity
- A10. "One action per NPC per convergence, sorted by (priority, id), evaluated sequentially so earlier effects are visible to later decisions" — this is the whole emergence mechanism (docs/04 R-E4). Is sequential evaluation (not simultaneous/commit-at-end) the right semantics? What ordering pathologies appear when two actions of *different* NPCs at the *same* priority write different flags that the other reads? (Test 57 only guards same-flag writes.)
- A11. Phase 2 → Phase 3 grew `types.ts` by 85 lines and added one content file. Where is the next 2× complexity going to come from, and is anything here (e.g. `visibilityExceptions`, `supersedes`, `touches`) a sign of a missing abstraction rather than a feature?
- A12. The projection layer (player-facing "Sổ ghi nhớ", NPC epilogues from `npc_action` causes, `PlayerVisibleBelief` for audit F-03) is NOT IMPLEMENTED. Does the current `CausalOrigin` carry enough for it, or will Phase 5 need to touch the log format (breaking replay)?

### Scalability risks
- A13. `stateBefore()` in tests replays the full log to reconstruct state before a mutation; `mutationLog` ~90–140 entries per run. At what content size does the test harness (36 runs, several replays each) stop being instant, and does it matter?
- A14. `GameState` has no `actionLog` in `types.ts` (the evaluator adds one ad hoc). Audit F-21 asked for it as the replay unit. Should it be formalised now?

## 2. Things we already know are wrong (do not spend time re-finding them)

See `docs/06-phase3-review-package.md` §9: F-01 (trust.vu ceiling), C2 (Mai has no observation seed), C3 (docs/04 row 5 assumes a non-existent rule), F-02/F-05/F-06/F-13/F-14/F-17/F-19/F-23 (Phase 2 content bugs, measured not fixed), A1/A2 (no tsc). If you find *more*, or find that one of these is mis-diagnosed, that is the most valuable output.

## 3. How to respond

- Number findings `OPUS-n`. For each: severity (HIGH/MED/LOW), file:line or test id, minimal reproduction, proposed fix, and whether it blocks Phase 5.
- Counterexamples > arguments. A 5-line scenario added to `tests/corpus.mjs` that makes a test fail is the best possible finding.
- Please state explicitly which of A1–A14 you did **not** examine.
- Do not implement gameplay. Do not modify content. Reviewer edits should be limited to tests/corpus.

The PO will read your findings alongside ChatGPT's logic review (`docs/reviews/phase3-chatgpt-logic.md`) before deciding on Phase 3b (content fixes) or Phase 5.

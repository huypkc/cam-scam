# PHASE 3 — LOGIC & CONSISTENCY VERIFICATION BRIEF (for ChatGPT)

Project: THE COMPOUND · PO: Huypkc · Prepared by: Claude Fable · Date: 2026-10-12
Your role: **independent Logic & Consistency Verifier**. Your Phase 2 audit (`docs/05-independent-logic-audit.md`, F-01…F-23, CF-1…CF-11) is the baseline. Phase 3 built the reference evaluator you asked for in Q3/P3 and turned your counterfactual spec (§10) into executable tests. Now break it.

## 0. Reproduce

```
cd /root/working
node --test tests/*.test.mjs            # 59 pass expected
node scripts/trace.mjs                  # docs/06-phase3-phone-scenario-trace.md (traces, dependency map, liveness, TAP)
sha256sum -c docs/phase3-checksums.txt
```

Your harness assumptions (audit Appendix A, A-1…A-10) were adopted verbatim as `ENGINE_ORDERING` (`src/engine/evaluator.mjs` top). Cross-check: evaluator **baseline mode** (`loadContent({intents:false})`) reproduces your S1/S2/CF-1…CF-5/CF-10 outcomes (see `docs/06-phase3-phone-scenario-trace.md` §1, "Phase 2 baseline" lines). If any differ from your harness, that discrepancy is finding #1.

## 1. What changed that could introduce new logic errors

| Change | Where | Why it is risky |
|---|---|---|
| New convergence step 6a' (NPC actions) between 6a and 6b | `evaluator.mjs` `convergence()` | Order-dependent: an action can consume state a global rule expected (e.g. Thạch's raid moves the phone before `R_SUSPICION_SWEEP` sees `player`) |
| 6 DelayedRules + 1 PropagationRule disabled by `supersedes` | `content/npc.intents.json` | A reader that assumed those rules (e.g. `PR_THACH_TELLS_VU_SCAPEGOAT` reads `duc.scapegoated`) may now never fire in some runs |
| Thạch scapegoats Đức **only** with a reason (belief TAKEN_BY_DUC or tag COVERED_DUC_SEARCH) | `A_THACH_RAID_WHERE_I_BELIEVE` | Passive Captive run no longer isolates Đức; `EV_S_D5A_DUC_TAKEN` rarer |
| Vũ's PROTECT_DUC split into `A_VU_SHIELD_PHONE` (prio 14) + `A_VU_HAND_UP` (prio 15) | same file | Depends on "one action per NPC per convergence" **and** on the `vu.shieldingPhone` flag — two mechanisms for one exclusion |
| Mai approaches Operator even after `point_mai` (she cannot know) | `A_MAI_APPROACH_OPERATOR` | Phase 2 blocked this; is the new behaviour consistent with `R_MAI_EXPOSED`? |
| Đức may call home by himself (`A_DUC_TRY_CALL`, seg 13, phone at `yard_cache`) | same | New writer of `duc.calledHome`; interacts with `EV_C_D5A_PHONE_CONTENTS` observation (which re-asserts `player`) |
| Relay inherits `misinformation` from the source belief (your F-10 proposal) | `evaluator.mjs` relay branch | A relayed truth from a liar is now marked misinformation? Check the predicate: it compares `believedValue` to truth, not the source's attestation |
| `visibleByValue`: `dorm_ceiling → [duc]`, `yard_cache → [duc]` | `content/flags.json` | Đức "knows" a location statically even after the phone silently leaves |
| `touches`: resolution may read hidden flags | `types.ts` §9b | The one sanctioned leak in the visibility contract |

## 2. Specific logical questions (answer each PASS / FAIL / UNKNOWN with evidence)

- L1. **Temporal causality across 6a → 6a' → 6b.** Enumerate every (writer, reader) pair across the three sub-steps in the same convergence (the Phase 2 table in your audit §4 had 13 rows; Phase 3 adds actions). Find a pair where the reader runs before the writer and the content *relies* on it. Candidate: `A_VU_SEES_DUC_CALL` (6a', seg 13–14) reads `duc.calledHome` written by `A_DUC_TRY_CALL` (6a', seg 13, prio 25 < 30 — same pass, earlier) **or** by the player's `duc_call` choice (step 4). Is there a path where Vũ sees the call before it happens?
- L2. **Impossible NPC knowledge via `touches`.** `A_VU_SEES_DUC_CALL` touches player tag `T_C_GAVE_DUC_CALL` ("Vũ asks Đức who gave it"). Construct a scenario where this leaks information Vũ could not have (e.g. Đức isolated/demoted at that moment, or the player gave the phone but Đức never called).
- L3. **The visibility contract vs. the evaluator.** `visibilityViolations()` is a *static* check on conditions. The evaluator itself does not enforce it at runtime. Write a content mutation (in `tests/corpus.mjs` style, using `loadContent({mutate})`) that passes every static test yet lets an NPC act on hidden state. Hint: `if` conditions nested inside `effects` of a **DelayedRule** (not an action) are unconstrained.
- L4. **Rumor → canonical.** T05 checks grants. Find a path by which a RUMOR with a *wrong* value ends up driving a CONFIRMED grant with the *right* value through an action's resolution (laundering). Candidate: Thạch RUMOR(HIDDEN_DORM_CEILING) from Linh → raid → CONFIRMED(self). Is "I searched where I was told and found it" a legitimate CONFIRMED? What if Linh had lied (misinformation RUMOR) and the phone happened to be there?
- L5. **Two incompatible states.** T04 checks 6 pairs. Propose pairs it misses. Candidates: `vu.shieldingPhone == true` while `phone.location != vu_locker`; `duc.calledHome` while `phone.location == thach`; `mai.dealActive` with `mai.exposed`; `escape.withDuc` with Đức isolated; `thach.hasCaptiveTip` after `clear`.
- L6. **Replay divergence.** T06 asserts byte-identical `mutationLog` for repeated runs and identical background mutations across runs. Is `JSON.stringify` order-stable for the state shapes used? Does `Object.fromEntries(NPC_IDS…)` guarantee NPC iteration order in `start()` and in `convergence()`? Find any iteration over an object whose key order could change with content edits (e.g. `st.flags`).
- L7. **Delayed consequence disappears.** T07 allows a scheduled event to vanish if the game ended first. Is there a path where a `schedule` lands on a segment whose forced events `endGame` before step 3 runs? (Ending check is step 5 — but `E_ESCAPE` at 17 ends before convergence; anything scheduled *at* 18 by a seg-17 rule is lost legitimately. Anything scheduled at 17 *by a seg-16 convergence* for a player who escapes?)
- L8. **Phone access.** T08's allowed-transition table was written by the author. Audit it: which rows are too permissive? (`vu_locker>thach` by `choice:EV_S_D5A_PHONE_FOUND_BY_VU` — the *player* moves the phone out of Vũ's locker into Thạch's hands with no Vũ consent flag.)
- L9. **Intention vs belief.** `A_THACH_RAID_WHERE_I_BELIEVE` requires `believedValue: true` on HIDDEN_DORM_CEILING. Thạch can also hold `F_SEARCH_IS_ABOUT_STOLEN_PHONE = CONFIRMED(false)` (he invented the pretext). Is there a run where Thạch searches for a phone he "knows" is a fiction, i.e. before he has any belief that a real phone exists (`F_PHONE_EXISTS`)? Should the action require `F_PHONE_EXISTS ≥ RUMOR`?
- L10. **Zero-player.** ZP runs use `first`/`last` policies. Your F-12 asked for `defaultChoice` in content; it is still absent. Show two default policies that give *different* NPC chains (not just different endings), proving the world is not yet "self-running" independent of policy.
- L11. **Your F-01/F-02/F-05/F-07 claims** are now encoded as tests ("F-01 ceiling", `KNOWN_MISS` in GATE F, `KNOWN_NEVER` in T07). Confirm or refute each encoding; in particular the F-01 bound computation (`tests/evaluator.test.mjs`, last test) is *loose* (ignores exclusivity) — is 1 actually the tight bound?
- L12. **Counterexample hunt.** Add scenarios to `tests/corpus.mjs` until something in T01–T10 fails. Priority targets: operator run with `o_take` at seg 13 then `to_mai` (phone `mai`, absorbing), captive `urge_return`, operator `name_duc` (dead per F-05b — confirm still dead), captive `expose` Linh then observe `R_LINH_PULLED_OUT`.

## 3. Known gaps — do not re-report, do challenge the diagnosis

`docs/06-phase3-review-package.md` §9: C1 (F-01 ceiling), C2 (Mai cannot act — no `BG_D3A_SEARCH`), C3 (docs/04 row 5 non-existent rule), C4 (behaviour shifts), `ENGINE_ORDERING` assumptions, F-02/F-05/F-06/F-13/F-14/F-17/F-19/F-23 still open.

## 4. How to respond

- Number findings `GPT-n`; severity; file:line or test id; minimal reproduction (ideally a corpus entry or a `loadContent({mutate})` snippet); whether it invalidates a PASS in the package §7.
- State which of L1–L12 you did **not** examine.
- Do not modify content or engine; limit edits to `tests/corpus.mjs` or new test files.
- The package claims **no** independent review has happened yet. Your reply is the first.

// THE COMPOUND — MVP engine tests (Stage 2/6): atomic transitions, rule-ordering independence, deterministic replay,
// delayed-rule idempotency, conflicting NPC actions, save/load integrity, counterfactual decisions, zero-player runs.
// Zero dependencies: `node --test tests/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, start, run, runSegment, apply, transact, convergence, replay, replayPolicy, scriptedPolicy, passivePolicy, serialize, deserialize, stateHash, fallbackChoice, NeedInput, NPC_IDS, seg, ENGINE_ORDERING, TOTAL_SEGMENTS, RANK } from '../src/engine/evaluator.mjs';
import { createRequire } from 'node:module';
const require_child_process = () => createRequire(import.meta.url)('node:child_process');
import { SCENARIOS, witnessPolicies } from './corpus.mjs';
import { hashValue } from '../src/engine/hash.mjs';

const C = loadContent();
const RUNS = [...SCENARIOS.map((sc) => ({ id: sc.id, role: sc.role, policy: sc.policy })), ...witnessPolicies(C).map((w) => ({ id: w.id, role: w.role, policy: w.policy })), ...['captive', 'operator'].map((role) => ({ id: `ZP_${role}`, role, policy: passivePolicy('default') }))]
  .map((r) => ({ ...r, st: run(C, r.role, r.policy) }));
const logJson = (st) => JSON.stringify(st.mutationLog.map((m) => [m.at, m.cause, m.consequence]));

// =====================================================================================================
test('ATOMIC — transact restores the exact pre-step state when a step throws (unit)', () => {
  const st = start(C, 'captive');
  const before = JSON.stringify(st);
  assert.throws(() => transact(st, (s) => { s.flags['phone.location'] = 'thach'; s.player.stress = 99; s.npcs.vu.knowledge.tags.X = { tag: 'X' }; s.mutationLog.push({ fake: true }); throw new Error('boom'); }), /boom/);
  assert.equal(JSON.stringify(st), before, 'state must be byte-identical after rollback');
  transact(st, (s) => { s.player.stress = 7; });
  assert.equal(st.player.stress, 7, 'successful steps commit');
});

test('ATOMIC — an event whose consequences violate an invariant leaves no trace (observations, tags, stats all rolled back)', () => {
  const bad = loadContent({ mutate: (b) => { const ch = b.events.find((e) => e.id === 'EV_S_D1M_INTAKE').choices.find((c) => c.id === 'c_sign'); ch.consequences.push({ type: 'belief', agent: 'player', factId: 'F_DUC_IS_THE_LEAK', status: 'OBSERVED', believedValue: true, source: 'self' }); return b; } });
  const st = start(bad, 'captive');
  const h = stateHash(st);
  assert.throws(() => runSegment(bad, st, scriptedPolicy({ EV_S_D1M_INTAKE: 'c_sign' })), /wrong value/);
  assert.equal(stateHash(st), h, 'the whole event (observation grants + partial consequences) must be rolled back');
  assert.deepEqual(st.firedEvents, []); assert.deepEqual(st.decisions, []); assert.equal(st.player.stress, 0);
});

test('ATOMIC — a failing NPC action rolls back only itself; earlier convergence steps stay committed', () => {
  const bad = loadContent({ mutate: (b) => { b.intents.actions.push({ id: 'A_BAD', actor: 'mai', drive: 'D_MAI_SELF_RESCUE', reads: {}, when: { op: 'always' }, earliest: 1, latest: 1, once: true, priority: 99, effects: [{ type: 'flag', flag: 'mai.exposed', value: true }, { type: 'belief', agent: 'mai', factId: 'F_DUC_IS_THE_LEAK', status: 'CONFIRMED', believedValue: true, source: 'self' }] }); return b; } });
  const st = run(bad, 'captive', passivePolicy('default'), 1); // segment 0 done, now at 1
  assert.throws(() => runSegment(bad, st, passivePolicy('default')), /wrong value/);
  assert.equal(st.flags['mai.exposed'], false, 'partial effects of the failing action rolled back');
  assert.ok(!st.firedActions.includes('A_BAD'));
  assert.ok(st.firedEvents.includes('EV_C_D1A_LINH_APPROACH'), 'the segment\'s events (earlier steps) stayed committed');
});

test('ATOMIC — apply() refuses undeclared flag values, unknown facts/flags/npcs and past-dated schedules', () => {
  const st = start(C, 'captive');
  assert.throws(() => apply(C, st, { type: 'flag', flag: 'phone.location', value: 'moon' }, { kind: 'engine_init' }), /not declared/);
  assert.throws(() => apply(C, st, { type: 'flag', flag: 'nope', value: true }, { kind: 'engine_init' }), /unknown flag/);
  assert.throws(() => apply(C, st, { type: 'belief', agent: 'vu', factId: 'F_NOPE', status: 'RUMOR', believedValue: true, source: 'self' }, { kind: 'engine_init' }), /unknown fact/);
  assert.throws(() => apply(C, st, { type: 'trust', npc: 'bob', delta: 1 }, { kind: 'engine_init' }), /unknown npc/);
  assert.throws(() => apply(C, st, { type: 'schedule', eventId: 'EV_S_D7M_RAID', at: 0 }, { kind: 'engine_init' }), /not in the future/);
  assert.equal(st.mutationLog.length, 0);
});

// =====================================================================================================
test('ORDER — results never depend on file order: reversing every content array reproduces every run exactly', () => {
  const rev = loadContent({ mutate: (b) => { for (const k of ['events', 'background', 'propagation', 'delayedRules', 'endings', 'flags', 'npcs']) b[k] = [...b[k]].reverse(); b.intents.actions = [...b.intents.actions].reverse(); return b; } });
  for (const r of RUNS) {
    const alt = run(rev, r.role, r.policy);
    assert.equal(logJson(alt), logJson(r.st), `${r.id}: mutation log differs under reversed content`);
    assert.equal(stateHash(alt), stateHash(r.st), `${r.id}: state hash differs under reversed content`);
  }
});

test('ORDER — forced events sharing a slot and a role carry distinct `order` values (so declaration order is never consulted)', () => {
  const forced = C.events.filter((e) => e.trigger === 'forced');
  for (let i = 0; i < forced.length; i++) for (let j = i + 1; j < forced.length; j++) {
    const a = forced[i], b = forced[j];
    const sa = a.at ? [seg(a.at)] : null, sb = b.at ? [seg(b.at)] : null;
    const overlap = (x, y) => { const sx = x.at ? seg(x.at) : seg(x.window.from), ex = x.at ? seg(x.at) : seg(x.window.to); const sy = y.at ? seg(y.at) : seg(y.window.from), ey = y.at ? seg(y.at) : seg(y.window.to); return sx <= ey && sy <= ex; };
    const roles = a.roles.filter((r) => b.roles.includes(r));
    if (roles.length && overlap(a, b)) assert.notEqual(a.order ?? 0, b.order ?? 0, `${a.id} and ${b.id} share a slot and a role without distinct order`);
    void sa; void sb;
  }
});

// =====================================================================================================
test('REPLAY — every run is reproduced bit-for-bit from its decision list; truncated logs stop at a committed point', () => {
  for (const r of RUNS) {
    const { st, complete } = replay(C, r.role, r.st.decisions);
    assert.ok(complete, `${r.id}: replay incomplete`);
    assert.equal(logJson(st), logJson(r.st), `${r.id}: replay log differs`);
    assert.equal(stateHash(st), stateHash(r.st), `${r.id}: replay hash differs`);
    const cut = Math.floor(r.st.decisions.length / 2);
    const part = replay(C, r.role, r.st.decisions.slice(0, cut));
    assert.ok(!part.complete && part.request, `${r.id}: truncated replay must stop with a request`);
    assert.deepEqual(part.st.decisions, r.st.decisions.slice(0, cut), `${r.id}: committed state holds exactly the consumed decisions`);
    const again = replay(C, r.role, r.st.decisions.slice(0, cut));
    assert.equal(stateHash(again.st), stateHash(part.st), `${r.id}: partial replay is deterministic`);
  }
});

test('REPLAY — every prefix of every corpus run is a committed point: replaying the first n decisions holds exactly those n and stops with a request (regression: optional picks used to be lost when the opened event was still pending)', () => {
  let checked = 0;
  for (const r of RUNS) {
    for (let i = 0; i <= r.st.decisions.length; i++) {
      const { st, complete, request } = replay(C, r.role, r.st.decisions.slice(0, i));
      assert.deepEqual(st.decisions, r.st.decisions.slice(0, i), `${r.id}@${i}: committed decisions differ from the prefix`);
      if (i < r.st.decisions.length) { assert.ok(!complete && request, `${r.id}@${i}: a strict prefix must stop with a request`); if (r.st.decisions[i].k === 'c') assert.equal(request.kind, 'choice', `${r.id}@${i}: next decision is a choice, engine asked for ${request.kind}`); else assert.equal(request.kind, 'optional', `${r.id}@${i}: next decision is an optional pick, engine asked for ${request.kind}`); }
      else assert.ok(complete, `${r.id}: full list must complete`);
      checked++;
    }
  }
  assert.ok(checked > 500, `only ${checked} prefixes checked`);
});

test('REPLAY — a decision list that does not match what the engine offers is rejected, never silently coerced', () => {
  assert.throws(() => replay(C, 'captive', [{ k: 'c', e: 'EV_S_D1M_INTAKE', c: 'o_plain' }]), /not available/);
  assert.throws(() => replay(C, 'captive', [{ k: 'c', e: 'EV_C_D1A_LINH_APPROACH', c: 'open' }]), /expected choice for EV_S_D1M_INTAKE/);
  assert.throws(() => replay(C, 'captive', [{ k: 'o', e: null }]), /expected choice/);
  const p = replayPolicy([]);
  assert.throws(() => p.choose(C.events[0], C.events[0].choices, start(C, 'captive')), NeedInput);
});

// =====================================================================================================
test('IDEMPOTENT — running the convergence point twice on the same state adds nothing (rules/actions once, relays no-op on equal rank)', () => {
  let checked = 0;
  for (const r of RUNS) {
    for (const cut of [4, 9, 12, 15]) {
      if (cut >= r.st.decisions.length) continue;
      const { st } = replay(C, r.role, r.st.decisions.slice(0, cut));
      if (st.ending) continue;
      const s1 = structuredClone(st); convergence(C, s1);
      const n = s1.mutationLog.length; const h = stateHash(s1);
      convergence(C, s1);
      assert.equal(s1.mutationLog.length, n, `${r.id}@${st.segment}: second convergence produced mutations`);
      assert.equal(stateHash(s1), h, `${r.id}@${st.segment}: second convergence changed the state`);
      checked++;
    }
  }
  assert.ok(checked >= 20, `only ${checked} convergence points checked`);
});

test('IDEMPOTENT — once-rules and once-actions never fire twice; relays never duplicate a tag or re-log an equal-rank belief', () => {
  for (const r of RUNS) {
    assert.equal(new Set(r.st.firedRules).size, r.st.firedRules.length, `${r.id}: rule fired twice`);
    assert.equal(new Set(r.st.firedActions).size, r.st.firedActions.length, `${r.id}: action fired twice`);
    const seen = new Set();
    for (const m of r.st.mutationLog) {
      if (m.consequence.type === 'npcTag') { const k = `${m.consequence.npc}:${m.consequence.tag}`; assert.ok(!seen.has(k), `${r.id}: ${k} granted twice`); seen.add(k); }
    }
  }
});

// =====================================================================================================
test('CONFLICT — three NPCs want the same phone; priority and timing decide, and changing them changes the winner', () => {
  const s7 = SCENARIOS.find((s) => s.id === 'S7_MAI_RECOVERS');
  const base = run(C, 'captive', s7.policy);
  assert.equal(base.flags['phone.location'], 'mai', 'base: Mai (D4 afternoon) beats Thạch (D4 night) and Vũ (D5 morning)');
  const late = loadContent({ mutate: (b) => { const a = b.intents.actions.find((x) => x.id === 'A_MAI_SEARCH_DORM'); a.earliest = 11; a.latest = 11; a.priority = 35; return b; } });
  const alt = run(late, 'captive', s7.policy);
  assert.equal(alt.flags['phone.location'], 'thach', 'Mai one convergence later and after Thạch: Thạch raids first (Linh relayed the location)');
  assert.ok(alt.firedActions.includes('A_MAI_SEARCH_DORM') && alt.firedActions.includes('A_THACH_RAID_WHERE_I_BELIEVE'), 'both still decide to act; only the second finds nothing');
  const s2 = SCENARIOS.find((s) => s.id === 'S2_COVER_WARN');
  const base2 = run(C, 'captive', s2.policy);
  assert.equal(base2.flags['phone.location'], 'thach'); assert.ok(base2.firedActions.includes('A_VU_HAND_UP'));
  const shieldFirst = loadContent({ mutate: (b) => { b.intents.actions.find((x) => x.id === 'A_VU_SHIELD_PHONE').when = { op: 'flag', flag: 'phone.location', equals: 'vu_locker' }; return b; } });
  const alt2 = run(shieldFirst, 'captive', s2.policy);
  assert.equal(alt2.flags['phone.location'], 'vu_locker', 'if Vũ\'s PROTECT_DUC drive needed no reason it would always beat STAY_ABOVE (priority 14 < 15)');
});

test('CONFLICT — at most one action per NPC per convergence point, and two NPCs never move the phone in the same pass', () => {
  for (const r of RUNS) {
    const perSeg = new Map();
    for (const m of r.st.mutationLog) if (m.cause.kind === 'npc_action') { const k = `${m.at}:${m.cause.actor}`; (perSeg.get(k) ?? perSeg.set(k, new Set()).get(k)).add(m.cause.actionId); }
    for (const [k, v] of perSeg) assert.equal(v.size, 1, `${r.id} ${k}: ${[...v].join(',')}`);
    const movers = new Map();
    for (const m of r.st.mutationLog) if (m.cause.kind === 'npc_action' && m.consequence.type === 'flag' && m.consequence.flag === 'phone.location') (movers.get(m.at) ?? movers.set(m.at, new Set()).get(m.at)).add(m.cause.actor);
    for (const [s, v] of movers) assert.equal(v.size, 1, `${r.id} seg ${s}: two NPCs moved the phone in one convergence`);
  }
});

// =====================================================================================================
test('SAVE/LOAD — a mid-game save reloads to the identical state and continues identically; a finished game reloads finished', () => {
  for (const r of RUNS) {
    const cut = Math.max(1, Math.floor(r.st.decisions.length * 0.6));
    const { st: mid } = replay(C, r.role, r.st.decisions.slice(0, cut));
    const save = serialize(C, mid, { savedAt: '2026-10-13T00:00:00Z', label: r.id });
    assert.equal(typeof save.checksum, 'string'); assert.equal(save.contentVersion, C.contentVersion);
    const loaded = deserialize(C, JSON.parse(JSON.stringify(save)));
    assert.equal(stateHash(loaded), stateHash(mid), `${r.id}: loaded state differs`);
    // continue both with the rest of the recorded decisions
    const rest = r.st.decisions.slice(cut);
    const a = replay(C, r.role, [...mid.decisions, ...rest]).st, b = replay(C, r.role, [...loaded.decisions, ...rest]).st;
    assert.equal(stateHash(a), stateHash(b)); assert.equal(stateHash(a), stateHash(r.st), `${r.id}: continuation after load diverged`);
    const fin = deserialize(C, serialize(C, r.st));
    assert.equal(fin.ending, r.st.ending); assert.equal(stateHash(fin), stateHash(r.st));
  }
});

test('SAVE/LOAD — tampered, foreign or stale saves are refused with a specific reason', () => {
  const st = run(C, 'operator', passivePolicy('default'), 9);
  const save = serialize(C, st);
  assert.throws(() => deserialize(C, { ...save, decisions: save.decisions.slice(0, -1) }), /checksum/);
  assert.throws(() => deserialize(C, { ...save, format: 'x' }), /unknown format/);
  const other = loadContent({ mutate: (b) => { b.flags.find((f) => f.id === 'quota.score').initial = 1; b.contentVersion = 'edited'; return b; } });
  assert.throws(() => deserialize(other, save), /content version/);
  // consistent checksum but a decision list that the engine cannot follow (an impossible choice) → replay error, not a corrupt state
  const forged = { ...save, decisions: [{ k: 'c', e: 'EV_S_D1M_INTAKE', c: 'c_sign' }] }; const { checksum, savedAt, label, ...body } = forged; forged.checksum = hashValue(body);
  assert.throws(() => deserialize(C, forged), /not available|different state/);
  // consistent checksum but a header that disagrees with what the decisions replay to (review L-3)
  for (const patch of [{ segment: 99 }, { ending: 'E_ESCAPE' }]) { const f = { ...save, ...patch }; const { checksum: c2, savedAt: s2, label: l2, ...b2 } = f; f.checksum = hashValue(b2); assert.throws(() => deserialize(C, f), /header says|incomplete for a finished game/, JSON.stringify(patch)); }
});

test('TYPES — src/engine/types.ts constants match core.mjs (imported with --experimental-strip-types; review M-3)', () => {
  const { execFileSync } = require_child_process();
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', "import * as T from './src/engine/types.ts'; console.log(JSON.stringify({ ENGINE_ORDERING: T.ENGINE_ORDERING, TOTAL_SEGMENTS: T.TOTAL_SEGMENTS, BELIEF_RANK: T.BELIEF_RANK, SEGMENT_ORDINAL: T.SEGMENT_ORDINAL }))"], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  const T = JSON.parse(out);
  assert.deepEqual(T.ENGINE_ORDERING, ENGINE_ORDERING);
  assert.equal(T.TOTAL_SEGMENTS, TOTAL_SEGMENTS);
  assert.deepEqual(T.BELIEF_RANK, RANK);
  assert.deepEqual(T.SEGMENT_ORDINAL, { morning: 0, afternoon: 1, night: 2 });
});

// =====================================================================================================
test('COUNTERFACTUAL — one different decision at the Day-4 interrogation flips the week (identical prefix, divergent suffix)', () => {
  const a = RUNS.find((r) => r.id === 'S4_TAKE_SWEEP').st, b = RUNS.find((r) => r.id === 'S4b_TAKE_CALL').st;
  const upTo = (st, s) => JSON.stringify(st.mutationLog.filter((m) => m.at < s).map((m) => [m.at, m.cause, m.consequence]));
  assert.equal(upTo(a, 9), upTo(b, 9), 'identical history before the interrogation');
  assert.notEqual(upTo(a, 11), upTo(b, 11));
  assert.equal(a.ending, 'E_TRANSFER'); assert.equal(b.ending, 'E_EXPOSURE');
  assert.ok(a.firedRules.includes('R_SUSPICION_SWEEP') && !b.firedRules.includes('R_SUSPICION_SWEEP'));
});

test('COUNTERFACTUAL — player decisions change NPC behaviour, not only text: Mai, Vũ and Thạch act differently across the corpus', () => {
  const by = (id) => RUNS.find((r) => r.id === id).st;
  assert.ok(by('S7_MAI_RECOVERS').firedActions.includes('A_MAI_SEARCH_DORM') && !by('S1_PASSIVE').firedActions.includes('A_MAI_SEARCH_DORM'), 'Mai searches only when Thạch has no suspect');
  assert.ok(by('S3_VU_TRUST').firedActions.includes('A_VU_SHIELD_PHONE') && by('S2_COVER_WARN').firedActions.includes('A_VU_HAND_UP'), 'Vũ shields or hands up depending on the player');
  assert.ok(by('S5_TELL_LINH').flags['duc.scapegoated'] && !by('S1_PASSIVE').flags['duc.scapegoated'], 'Thạch blames Đức only when he has a reason');
  assert.ok(by('S8_HAND_OVER_LINH').firedActions.includes('A_LINH_HANDS_PHONE_UP'), 'Linh hands the phone up when trusted with it');
});

// =====================================================================================================
test('ZERO-PLAYER — both roles complete without any player input; every fill-in is the declared defaultChoice; the NPC chain runs', () => {
  for (const role of ['captive', 'operator']) {
    const st = RUNS.find((r) => r.id === `ZP_${role}`).st;
    assert.ok(st.ending, `${role}: no ending`);
    for (const a of st.actionLog) {
      if (!a.choiceId || a.choiceId === 'skip') continue;
      const e = C.events.find((x) => x.id === a.eventId);
      const d = typeof e.defaultChoice === 'string' ? e.defaultChoice : e.defaultChoice[role];
      assert.equal(a.choiceId, d, `${role}: ${e.id} fell back to ${a.choiceId} instead of its default ${d}`);
    }
    const npcMoves = st.mutationLog.filter((m) => ['npc_action', 'propagation', 'delayed_rule'].includes(m.cause.kind)).length;
    assert.ok(npcMoves >= 10, `${role}: world barely moved without the player (${npcMoves} mutations)`);
    assert.ok(st.firedActions.includes('A_THACH_RAID_WHERE_I_BELIEVE'), `${role}: Thạch never looked for the phone`);
  }
  // fallbackChoice honours per-role maps
  const e = C.events.find((x) => x.id === 'EV_S_D1M_INTAKE');
  assert.equal(fallbackChoice(e, e.choices.filter((c) => c.available.is === 'operator')), 'o_plain');
  assert.equal(fallbackChoice(e, e.choices.filter((c) => c.available.is === 'captive')), 'c_sign');
});

test('COVERAGE — every event fires for every role it serves in at least one corpus run (review L-01: a structurally unreachable event is a content bug, not "rare")', () => {
  const missing = [];
  for (const e of C.events) for (const role of e.roles) if (!RUNS.some((r) => r.role === role && r.st.firedEvents.includes(e.id))) missing.push(`${e.id}@${role} (${e.trigger})`);
  assert.deepEqual(missing, [], 'uncovered event×role: ' + missing.join(', '));
  // choices are reported, not gated: the corpus is a sample, not the whole decision space (see docs/09 §limitations)
  const choices = C.events.reduce((n, e) => n + e.choices.length, 0);
  const covered = C.events.reduce((n, e) => n + e.choices.filter((c) => RUNS.some((r) => r.st.actionLog.some((a) => a.eventId === e.id && a.choiceId === c.id))).length, 0);
  assert.ok(covered / choices >= 0.6, `choice coverage ${covered}/${choices} fell below 60%`);
});

test('INVARIANTS — on every run: stats within bounds, trust within bounds, phone value declared, no mutation after the ending, NPC ids fixed', () => {
  const values = C.flags.find((f) => f.id === 'phone.location').values;
  for (const r of RUNS) {
    const st = r.st;
    assert.ok(st.player.stress >= 0 && st.player.stress <= 100 && st.player.suspicion >= 0 && st.player.suspicion <= 100, r.id);
    for (const n of NPC_IDS) assert.ok(st.npcs[n].trustToPlayer >= -3 && st.npcs[n].trustToPlayer <= 3, r.id);
    assert.ok(values.includes(st.flags['phone.location']), r.id);
    const endSeq = st.mutationLog.findIndex((m) => m.consequence.type === 'endGame');
    if (endSeq >= 0) assert.equal(endSeq, st.mutationLog.length - 1, `${r.id}: mutations after endGame`);
    assert.deepEqual(Object.keys(st.npcs).sort(), [...NPC_IDS].sort());
    assert.ok(st.segment <= 21);
  }
});

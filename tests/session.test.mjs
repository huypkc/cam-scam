// THE COMPOUND — MVP session & projection tests: the interactive layer never leaks WorldTruth, every corpus run can be
// played through the Session API with identical results, prompts are validated, both roles reach all four endings
// through the UI path, epilogues render for every ending × role, perception distortion surfaces as `uncertain`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadContent, run, passivePolicy, scriptedPolicy, stateHash, NPC_IDS } from '../src/engine/evaluator.mjs';
import { Session, autoplay } from '../src/engine/session.mjs';
import { playerView, epilogue, visibleBeliefs, band } from '../src/engine/projection.mjs';
import { SCENARIOS, witnessPolicies } from './corpus.mjs';

const C = loadContent();
const ALL = [...SCENARIOS, ...witnessPolicies(C)];

test('LEAK — the player view never contains canonical values, misinformation attestations, NPC knowledge, trust numbers or hidden flags', () => {
  const forbidden = ['misinformation', 'trustToPlayer', '"knowledge"', '"flags"', 'believedValue":false,"source":"self","acquiredAt":0', 'initialHolders', '"decoy"'];
  for (const sc of ALL) {
    const s = new Session(C, sc.role); autoplay(s, sc.policy);
    for (let i = 0; i <= s.decisions.length; i += 7) {
      const v = new Session(C, sc.role, s.decisions.slice(0, i)).view();
      const txt = JSON.stringify(v);
      for (const f of forbidden) assert.ok(!txt.includes(f), `${sc.id}@${i}: view leaks '${f}'`);
      assert.deepEqual(Object.keys(v).sort(), ['beliefs', 'day', 'ending', 'epilogue', 'journal', 'npcs', 'prompt', 'role', 'roleLabel', 'segment', 'segmentOfDay', 'stats', 'tags', 'timeLabel'].sort());
      for (const b of v.beliefs) { assert.deepEqual(Object.keys(b).sort(), ['acquiredAt', 'believedValue', 'factId', 'rank', 'source', 'sourceLabel', 'statement', 'status', 'statusLabel', 'uncertain', 'when'].sort()); assert.ok(!('value' in b)); }
      for (const n of v.npcs) assert.deepEqual(Object.keys(n).sort(), ['id', 'name', 'status', 'statusLabel']);
      assert.ok(['Vô hình', 'Để ý', 'Theo dõi', 'Đánh dấu'].includes(v.stats.suspicion.label));
    }
  }
  // the projection module never reads truth values: it imports no classifier and no fact.value access
  const src = readFileSync(new URL('../src/engine/projection.mjs', import.meta.url), 'utf8') + readFileSync(new URL('../src/engine/session.mjs', import.meta.url), 'utf8') + readFileSync(new URL('../src/web/app.mjs', import.meta.url), 'utf8') + readFileSync(new URL('../src/cli/play.mjs', import.meta.url), 'utf8');
  assert.ok(!/classifyBelief|\.value\b|misinformation|trustToPlayer/.test(src.replace(/e\.target\.value|\.value\s*=/g, '')), 'UI layer must not touch canonical values');
});

test('PLAY — every corpus scenario played through the Session API reproduces the engine run (same decisions, same hash, same ending)', () => {
  for (const sc of ALL) {
    const direct = run(C, sc.role, sc.policy);
    const s = new Session(C, sc.role);
    const end = autoplay(s, sc.policy);
    assert.equal(end.kind, 'ended'); assert.equal(end.ending, direct.ending, sc.id);
    assert.deepEqual(s.decisions, direct.decisions, `${sc.id}: decision lists differ`);
    assert.equal(s.hash, stateHash(direct), `${sc.id}: hashes differ`);
    assert.equal(s.view().journal.length, direct.actionLog.filter((a) => a.kind !== 'scheduled-skipped' && a.eventId !== null).length);
  }
});

test('PROMPT — the engine only accepts what it offered; the preview equals what then actually fires', () => {
  const s = new Session(C, 'captive');
  let p = s.prompt();
  assert.equal(p.kind, 'choice'); assert.equal(p.eventId, 'EV_S_D1M_INTAKE');
  assert.deepEqual(p.choices.map((c) => c.id), ['c_sign', 'c_protest'], 'operator choices are not offered to a captive');
  assert.throws(() => s.choose('o_plain'), /not offered/);
  assert.throws(() => s.pick(null), /no optional pending/);
  const obsBefore = p.observations.map((o) => o.text);
  p = s.choose('c_sign');
  const last = s.view().journal.at(-1);
  assert.deepEqual(last.observations, obsBefore, 'journal shows exactly the observations the prompt previewed');
  assert.equal(last.choice, 'Ký không nói gì');
  // walk to the first optional prompt and exercise pick()
  while (p.kind === 'choice') p = s.choose(p.choices[0].id);
  assert.equal(p.kind, 'optional');
  assert.throws(() => s.pick('EV_S_D7M_RAID'), /not offered/);
  const before = s.state.segment;
  p = s.pick(null);
  assert.ok(s.state.segment > before, 'skipping an optional lets time pass');
  const fin = autoplay(s, passivePolicy('default'));
  assert.equal(fin.kind, 'ended');
  assert.throws(() => s.choose('x'), /no choice pending/);
  assert.throws(() => s.pick(null), /no optional pending/);
});

test('ENDINGS — all four endings are reachable for both roles through the interactive path (eight live playthroughs)', () => {
  const reached = {};
  for (const w of witnessPolicies(C)) {
    const s = new Session(C, w.role); const end = autoplay(s, w.policy);
    assert.equal(end.ending, w.ending, `${w.id}`);
    (reached[w.ending] ??= new Set()).add(w.role);
    const v = s.view();
    assert.ok(v.epilogue && v.epilogue.id === w.ending && v.epilogue.text.length > 40, `${w.id}: epilogue text`);
    for (const n of v.epilogue.npcs) assert.ok(n.text.length > 20, `${w.id}: empty card for ${n.id}`);
    assert.equal(v.epilogue.npcs.length, 5);
  }
  for (const en of C.endings) for (const role of ['captive', 'operator']) assert.ok(reached[en.id]?.has(role), `${en.id} unreachable for ${role}`);
});

test('EPILOGUE — a pure function of the final state: identical states give identical epilogues; distinct outcomes give distinct NPC cards', () => {
  const by = (id) => { const sc = SCENARIOS.find((s) => s.id === id); return run(C, sc.role, sc.policy); };
  const a = epilogue(C, by('S9_ESCAPE_WITH_DUC')), b = epilogue(C, by('S9_ESCAPE_WITH_DUC'));
  assert.deepEqual(a, b);
  const duc = (id) => epilogue(C, by(id)).npcs.find((n) => n.id === 'duc').text;
  assert.notEqual(duc('S9_ESCAPE_WITH_DUC'), duc('S5_TELL_LINH'));
  assert.notEqual(duc('S5_TELL_LINH'), duc('S6_MOVE_YARD_DUC_CALLS'));
  const mai = (id) => epilogue(C, by(id)).npcs.find((n) => n.id === 'mai').text;
  assert.notEqual(mai('S7_MAI_RECOVERS'), mai('O5_NAME_MAI'));
  assert.ok(epilogue(C, by('S9_ESCAPE_WITH_DUC')).npcs.find((n) => n.id === 'vu').text.includes('nhìn đi chỗ khác'));
  assert.equal(epilogue(C, run(C, 'captive', passivePolicy('default'), 3)), null, 'no epilogue before an ending');
});

test('DISTORTION — at STRESS ≥ threshold a Captive receives the misleading search observation, marked uncertain in the prompt', () => {
  const tense = scriptedPolicy({ EV_S_D1M_INTAKE: 'c_protest', EV_C_D1A_LINH_APPROACH: 'guarded', EV_C_D1A_DUC_FOOD: 'share', EV_C_D1N_PATROL: 'watch', EV_S_QUOTA_SHIFT: 'sabotage', EV_C_D2A_DUC_CONFIDES: 'warn', EV_C_D2N_LINH_PROBE: 'deflect' }, ['EV_C_D1A_DUC_FOOD', 'EV_C_D1N_PATROL', 'EV_C_D2A_DUC_CONFIDES']);
  const s = new Session(C, 'captive');
  let p = s.prompt();
  while (!(p.kind === 'choice' && p.eventId === 'EV_C_D3A_SEARCH')) {
    if (p.kind === 'optional') { const e = tense.pickOptional(p.options.map((o) => C.events.find((x) => x.id === o.id))); p = s.pick(e ? e.id : null); }
    else { const e = C.events.find((x) => x.id === p.eventId); p = s.choose(tense.choose(e, p.choices.map((c) => e.choices.find((x) => x.id === c.id)))); }
  }
  assert.ok(s.state.player.stress >= 45, `stress ${s.state.player.stress}`);
  const u = p.observations.find((o) => o.uncertain);
  assert.ok(u && /Hình như/.test(u.text), 'misleading observation shown and flagged uncertain');
  p = s.choose('aside');
  const v = s.view();
  const belief = v.beliefs.find((b) => b.factId === 'F_VU_FOUND_PHONE_D3');
  assert.ok(belief && belief.status === 'RUMOR' && belief.uncertain === true && belief.believedValue === true, 'the player now holds an uncertain rumor — and is never told it is false');
  // the calm counterpart sees the plain paper
  const calm = new Session(C, 'captive'); let q = calm.prompt();
  while (!(q.kind === 'choice' && q.eventId === 'EV_C_D3A_SEARCH')) q = q.kind === 'optional' ? calm.pick(null) : calm.choose(q.choices.at(-1).id === 'c_protest' ? 'c_sign' : (q.eventId === 'EV_S_QUOTA_SHIFT' ? 'comply' : q.choices[0].id));
  assert.ok(q.observations.every((o) => !o.uncertain) && q.observations.some((o) => /Chỉ là tờ giấy/.test(o.text)));
});

test('SAVE/LOAD via Session — browser/CLI saves round-trip through fromSave with identical views', () => {
  const sc = SCENARIOS.find((s) => s.id === 'O4_EXPOSURE');
  const s = new Session(C, sc.role);
  for (let i = 0; i < 9; i++) { const p = s.prompt(); if (p.kind === 'optional') s.pick(p.options[0].id); else { const e = C.events.find((x) => x.id === p.eventId); s.choose(sc.policy.choose(e, p.choices.map((c) => e.choices.find((x) => x.id === c.id)), s.state)); } }
  const save = JSON.parse(JSON.stringify(s.save({ savedAt: 'now', label: 'mid' })));
  const t = Session.fromSave(C, save);
  assert.equal(JSON.stringify(t.view()), JSON.stringify(s.view()));
  assert.equal(t.hash, s.hash);
  assert.throws(() => Session.fromSave(C, { ...save, role: 'captive' }), /checksum/);
});

test('PROJECTION helpers — bands, beliefs ordering, statement text come from content, never from truth values', () => {
  assert.deepEqual(band('suspicion', 0), { label: 'Vô hình', level: 0 }); assert.deepEqual(band('suspicion', 40), { label: 'Để ý', level: 1 });
  assert.deepEqual(band('suspicion', 89), { label: 'Theo dõi', level: 2 }); assert.deepEqual(band('suspicion', 90), { label: 'Đánh dấu', level: 3 });
  assert.deepEqual(band('stress', 60), { label: 'Méo', level: 2 }); assert.deepEqual(band('stress', 80), { label: 'Gãy', level: 3 });
  const st = run(C, 'captive', SCENARIOS.find((s) => s.id === 'S4b_TAKE_CALL').policy);
  const bs = visibleBeliefs(C, st);
  for (let i = 1; i < bs.length; i++) assert.ok(bs[i - 1].acquiredAt <= bs[i].acquiredAt);
  for (const b of bs) assert.equal(b.statement, C.truth.facts[b.factId].statement.vi);
  const v = playerView(C, st);
  assert.equal(v.ending, 'E_EXPOSURE'); assert.ok(v.journal.some((j) => j.choice === 'Gọi số đó. Nói tất cả.'));
  assert.ok(NPC_IDS.every((n) => v.npcs.some((x) => x.id === n)));
});

test('SESSION — a decision the engine rejects at replay is never kept: the session stays at its last good state and keeps working (review M-1)', () => {
  const bad = loadContent({ mutate: (b) => { const ch = b.events.find((e) => e.id === 'EV_S_D1M_INTAKE').choices.find((c) => c.id === 'c_sign'); ch.consequences.push({ type: 'belief', agent: 'player', factId: 'F_DUC_IS_THE_LEAK', status: 'OBSERVED', believedValue: true, source: 'self' }); return b; } });
  const s = new Session(bad, 'captive');
  const before = JSON.stringify(s.view()), h = s.hash;
  assert.throws(() => s.choose('c_sign'), /wrong value/);
  assert.deepEqual(s.decisions, [], 'rejected decision must not be kept');
  assert.equal(s.hash, h); assert.equal(JSON.stringify(s.view()), before, 'view unchanged after the failed step');
  const p = s.choose('c_protest');
  assert.equal(s.decisions.length, 1); assert.ok(p.kind === 'choice' || p.kind === 'optional', 'session continues normally');
  assert.equal(s.view().epilogue, null);
  for (const n of s.view().npcs) assert.deepEqual(Object.keys(n).sort(), ['id', 'name', 'status', 'statusLabel']);
});

test('EPILOGUE view — NPC cards carry text and status only, never engine action ids (review L-4)', () => {
  const w = witnessPolicies(C)[0]; const s = new Session(C, w.role); autoplay(s, w.policy);
  for (const n of s.view().epilogue.npcs) assert.deepEqual(Object.keys(n).sort(), ['id', 'name', 'status', 'statusLabel', 'text']);
  assert.ok(!JSON.stringify(s.view()).includes('A_THACH'), 'no action ids in the view');
});

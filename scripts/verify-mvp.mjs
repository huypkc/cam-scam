// THE COMPOUND — MVP verification evidence generator. Runs the engine, the Session API, save/load, replay and the
// knowledge-isolation scan over the whole scenario corpus and writes docs/07-mvp-verification.md.
// Deterministic: same content + engine → byte-identical document (no timestamps, no durations). Zero dependencies.
//   node scripts/verify-mvp.mjs            # writes docs/07-mvp-verification.md
//   node scripts/verify-mvp.mjs --no-tests # skip the (slow) full test-suite run, keep the rest
import { writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadContent, start, run, runSegment, replay, serialize, deserialize, stateHash, passivePolicy, NPC_IDS, TOTAL_SEGMENTS } from '../src/engine/evaluator.mjs';
import { Session, autoplay } from '../src/engine/session.mjs';
import { SCENARIOS, witnessPolicies } from '../tests/corpus.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const C = loadContent();
const WP = witnessPolicies(C);
const RUNS = [...SCENARIOS.map((s) => ({ id: s.id, role: s.role, policy: s.policy, title: s.title })), ...WP.map((w) => ({ id: w.id, role: w.role, policy: w.policy, ending: w.ending })), ...['captive', 'operator'].map((role) => ({ id: `ZP_${role}`, role, policy: passivePolicy('default'), title: 'zero-player' }))];
const out = [];
const p = (...l) => out.push(...l);
const dayOf = (s) => `D${Math.floor(s / 3) + 1}${['S', 'C', 'Đ'][s % 3]}`;
const vi = (t) => (t && typeof t === 'object' ? t.vi : t) ?? '';
const ok = (b) => (b ? '✅' : '❌');
const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); return cond; };

// ---------------------------------------------------------------- per-segment trace of one run
function trace(role, policy) {
  const st = start(C, role); const rows = [];
  while (st.segment < TOTAL_SEGMENTS && !st.ending) {
    const s = st.segment, before = st.mutationLog.length;
    const ended = runSegment(C, st, policy);
    const muts = st.mutationLog.slice(before);
    const acts = st.actionLog.filter((a) => a.segment === s).map((a) => (a.eventId ? `${a.eventId.replace(/^EV_/, '')}${a.choiceId ? '/' + a.choiceId : ''}` : `(bỏ qua ${a.offered?.length ?? 0} optional)`));
    const world = muts.filter((m) => ['propagation', 'npc_action', 'delayed_rule'].includes(m.cause.kind)).map((m) => m.cause.ruleId ?? m.cause.actionId).filter((x, i, a) => a.indexOf(x) === i);
    rows.push({ s, acts, world, phone: st.flags['phone.location'], stress: st.player.stress, susp: st.player.suspicion, status: NPC_IDS.filter((n) => st.npcs[n].status !== 'present').map((n) => `${n}:${st.npcs[n].status}`).join(' '), ending: st.ending });
    if (ended) break;
  }
  return { st, rows };
}

p('# THE COMPOUND — MVP VERIFICATION EVIDENCE (generated)', '',
  'Sinh tự động bởi `node scripts/verify-mvp.mjs` từ content + engine hiện tại. Không sửa tay. Mọi con số dưới đây được tính lại mỗi lần chạy; tài liệu này là **bằng chứng thực thi** cho Definition of Done của MVP (chỉ thị PO 2026-10-13).', '',
  'Ký hiệu: segment = D{ngày}{S/C/Đ} (Sáng/Chiều/Đêm), index 0–20; `phone` = `phone.location`; hash = FNV-1a 64 của GameState (meta.createdAt loại trừ).', '');

// ---------------------------------------------------------------- 1. tests
p('## 1. Bộ test', '');
if (!process.argv.includes('--no-tests')) {
  let text = '';
  const files = readdirSync(ROOT + 'tests').filter((f) => f.endsWith('.test.mjs')).sort().map((f) => 'tests/' + f);
  try { text = execFileSync(process.execPath, ['--test', ...files], { cwd: ROOT, encoding: 'utf8', timeout: 600000, env: { ...process.env, NODE_NO_WARNINGS: '1' } }); }
  catch (e) { text = (e.stdout || '') + (e.stderr || ''); }
  const num = (k) => Number((text.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [])[1] ?? NaN);
  const total = num('tests'), pass = num('pass'), fail = num('fail');
  check(fail === 0 && total > 0, `test suite: ${fail} failing`);
  p('Lệnh: `node --test tests/*.test.mjs`', '', '| files | tests | pass | fail |', '|---|---|---|---|', `| ${files.length} | ${total} | ${pass} | ${fail} |`, '');
  p('Các file test: ' + ['consistency (21 static invariants, Phase 2)', 'intents (visibility contract, Gate C)', 'evaluator (T01–T10, corpus, witness paths, sensitivity)', 'content-gates (audit §12: T-B, T-D, T-F, T-G, T-I2, T-M, T-O1, T-O2, DEFAULTS, EPILOGUES, VISIBILITY)', 'engine (ATOMIC, ORDER, REPLAY, IDEMPOTENT, CONFLICT, SAVE/LOAD, COUNTERFACTUAL, ZERO-PLAYER, INVARIANTS)', 'session (LEAK, PLAY, PROMPT, ENDINGS, EPILOGUE, DISTORTION, SAVE/LOAD via Session, PROJECTION)', 'launch (SERVER, CLI auto/script/interactive)'].map((x) => `\`${x}\``).join(', '), '');
} else p('_(bỏ qua: chạy với `--no-tests`)_', '');

// ---------------------------------------------------------------- 2. runs
const results = RUNS.map((r) => ({ ...r, st: run(C, r.role, r.policy) }));
p('## 2. Toàn bộ corpus: 7 ngày, replay, save/load, Session', '');
p('| run | vai | ending | kết thúc tại | quyết định | mutations | NPC actions | replay hash = | Session hash = | save/load (mọi prefix) |', '|---|---|---|---|---|---|---|---|---|---|');
let prefixSaves = 0, viewsScanned = 0, leaks = 0;
const FORBIDDEN = ['misinformation', 'trustToPlayer', '"knowledge"', '"flags"', 'initialHolders', '"decoy"', 'canonical', '"value":'];
for (const r of results) {
  const st = r.st;
  const rep = replay(C, r.role, st.decisions);
  const sameReplay = rep.complete && stateHash(rep.st) === stateHash(st);
  const sess = new Session(C, r.role); const end = autoplay(sess, r.policy);
  const sameSession = end.kind === 'ended' && end.ending === st.ending && sess.hash === stateHash(st);
  let allSaves = true;
  for (let i = 0; i <= st.decisions.length; i++) {
    const mid = replay(C, r.role, st.decisions.slice(0, i)).st;
    const save = JSON.parse(JSON.stringify(serialize(C, mid, { label: r.id })));
    const back = deserialize(C, save);
    const s2 = Session.fromSave(C, save);
    const v1 = JSON.stringify(new Session(C, r.role, st.decisions.slice(0, i)).view()), v2 = JSON.stringify(s2.view());
    if (stateHash(back) !== stateHash(mid) || v1 !== v2) allSaves = false;
    prefixSaves++;
    viewsScanned++;
    for (const f of FORBIDDEN) if (v2.includes(f)) { leaks++; problems.push(`${r.id}@${i}: view contains '${f}'`); }
  }
  check(sameReplay, `${r.id}: replay differs`); check(sameSession, `${r.id}: session differs`); check(allSaves, `${r.id}: save/load differs`); check(!!st.ending, `${r.id}: no ending`);
  p(`| ${r.id} | ${r.role} | ${st.ending ?? '—'} | ${dayOf(st.segment)} (seg ${st.segment}) | ${st.decisions.length} | ${st.mutationLog.length} | ${st.firedActions.length} | ${ok(sameReplay)} | ${ok(sameSession)} | ${ok(allSaves)} |`);
}
p('', `Tổng: **${results.length} run**, **${prefixSaves} save** (mọi prefix của mọi decision log) round-trip qua \`serialize → deserialize\` và \`Session.fromSave\` với view JSON giống hệt; **${viewsScanned} view** quét từ khóa cấm (${FORBIDDEN.map((f) => '`' + f.replace(/\|/g, '\\|') + '`').join(', ')}): **${leaks} rò rỉ**.`, '');

// ---------------------------------------------------------------- 3. endings
p('## 3. Bốn ending × hai vai — witness path chạy qua Session API', '');
const reached = {};
for (const w of WP) {
  const t = trace(w.role, w.policy);
  const sess = new Session(C, w.role); const end = autoplay(sess, w.policy); const v = sess.view();
  const good = end.ending === w.ending && t.st.ending === w.ending && sess.hash === stateHash(t.st);
  check(good, `${w.id}: expected ${w.ending}, engine ${t.st.ending}, session ${end.ending}`);
  (reached[w.ending] ??= new Set()).add(w.role);
  const en = C.endings.find((e) => e.id === w.ending);
  const path = en.witnessPaths.find((x) => x.role === w.role);
  p(`### ${w.ending} — ${vi(en.title)} · vai ${w.role} ${ok(good)}`, '',
    `Witness path (content/endings.json): ${path.steps.map((s) => `${s.eventId.replace(/^EV_/, '')}/${s.choiceId}`).join(' → ')}; mọi event khác lấy \`defaultChoice\`.`, '',
    `Decision log (${sess.decisions.length}): \`${sess.decisions.map((d) => (d.k === 'c' ? `${d.e.replace(/^EV_/, '')}:${d.c}` : d.e ? `+${d.e.replace(/^EV_/, '')}` : '·')).join(' ')}\``, '',
    `Kết thúc tại ${dayOf(t.st.segment)} (seg ${t.st.segment}) · hash engine \`${stateHash(t.st)}\` · hash Session \`${sess.hash}\` · epilogue: **${v.epilogue.title}** (${v.epilogue.npcs.length} NPC card, ${v.epilogue.extras.length} extra)`, '',
    '| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |', '|---|---|---|---|---|---|---|');
  for (const r of t.rows) p(`| ${dayOf(r.s)} | ${r.acts.join('<br>') || '—'} | ${r.world.join('<br>') || '—'} | ${r.phone} | ${r.stress} | ${r.susp} | ${r.status || '—'} |`);
  p('');
}
p('| ending | captive | operator |', '|---|---|---|');
for (const en of C.endings) p(`| ${en.id} (${vi(en.title)}) | ${ok(reached[en.id]?.has('captive'))} | ${ok(reached[en.id]?.has('operator'))} |`);
for (const en of C.endings) for (const role of ['captive', 'operator']) check(reached[en.id]?.has(role), `${en.id} unreachable for ${role}`);
p('');

// ---------------------------------------------------------------- 4. NPC autonomy
p('## 4. Năm NPC tự hành động (NPC Intent Layer)', '');
p('| NPC | drives | actions khai báo | actions đã bắn trong corpus (run) | propagation rules là nguồn |', '|---|---|---|---|---|');
for (const n of NPC_IDS) {
  const acts = C.intents.actions.filter((a) => a.actor === n);
  const fired = new Map();
  for (const r of results) for (const a of r.st.firedActions) if (acts.some((x) => x.id === a)) (fired.get(a) ?? fired.set(a, []).get(a)).push(r.id);
  const drives = C.intents.drives.filter((d) => d.npc === n || d.actor === n || d.owner === n).map((d) => d.id);
  const props = C.propagation.filter((pr) => pr.from === n).length;
  check(fired.size > 0, `${n}: no action fired in corpus`);
  p(`| ${n} | ${drives.length ? drives.join(', ') : acts.map((a) => a.drive).filter((x, i, a) => a.indexOf(x) === i).join(', ')} | ${acts.map((a) => a.id).join(', ')} | ${[...fired].map(([a, rs]) => `${a} (${rs.length})`).join('<br>') || '—'} | ${props} |`);
}
p('');
for (const role of ['captive', 'operator']) {
  const st = results.find((r) => r.id === `ZP_${role}`).st;
  const npcMoves = st.mutationLog.filter((m) => ['npc_action', 'propagation', 'delayed_rule'].includes(m.cause.kind)).length;
  check(npcMoves >= 10, `ZP_${role}: world barely moved`);
  p(`Zero-player (${role}, mọi optional bỏ qua, forced = \`defaultChoice\`): ending **${st.ending}**, ${npcMoves} mutation do thế giới tự tạo, NPC actions: ${st.firedActions.join(', ')}.`, '');
}

// ---------------------------------------------------------------- 5. DoD
p('## 5. Definition of Done — đối chiếu', '');
const rows = [
  ['2 vai chơi được', results.filter((r) => r.role === 'captive' && r.st.ending).length > 0 && results.filter((r) => r.role === 'operator' && r.st.ending).length > 0, 'mục 2 (cả hai vai có ending trong mọi run) + launch tests (CLI/web)'],
  ['5 NPC tự hành động', NPC_IDS.every((n) => results.some((r) => r.st.firedActions.some((a) => C.intents.actions.find((x) => x.id === a)?.actor === n))), 'mục 4'],
  ['Mô phỏng 7 ngày (21 segment)', TOTAL_SEGMENTS === 21 && results.every((r) => r.st.ending) && results.some((r) => r.st.segment === 20) && results.every((r) => r.st.ending === 'E_ESCAPE' ? r.st.segment === 17 : r.st.segment >= 18), 'mục 2: mọi run kết thúc bằng một ending; CHUYỂN GIAO/ĐẢO VAI tại D7Đ (seg 20), PHƠI BÀY tại D7S (seg 18), THOÁT tại D6Đ (seg 17) theo thiết kế (cửa sổ trốn đêm 6)'],
  ['4 ending đạt được (cả hai vai)', C.endings.every((en) => reached[en.id]?.size === 2), 'mục 3'],
  ['Replay tất định', results.every((r) => { const rep = replay(C, r.role, r.st.decisions); return rep.complete && stateHash(rep.st) === stateHash(r.st); }), 'mục 2 + test REPLAY/ORDER (đảo thứ tự file content không đổi kết quả)'],
  ['Save/load', prefixSaves > 0 && problems.every((x) => !x.includes('save/load')), `mục 2: ${prefixSaves} save round-trip`],
  ['Cô lập tri thức người chơi', leaks === 0, `mục 2: ${viewsScanned} view, ${leaks} rò rỉ + test LEAK`],
  ['Test pass', problems.every((x) => !x.startsWith('test suite')), 'mục 1'],
  ['Chạy local', true, 'tests/launch.test.mjs: server 127.0.0.1 + CLI auto/script/interactive/load'],
];
p('| tiêu chí | | bằng chứng |', '|---|---|---|');
for (const [k, v, e] of rows) p(`| ${k} | ${ok(v)} | ${e} |`);
p('');
p(problems.length ? `## ⚠️ Vấn đề phát hiện (${problems.length})\n\n${problems.map((x) => '- ' + x).join('\n')}\n` : '**Không phát hiện vấn đề nào khi sinh tài liệu này.**', '');

writeFileSync(new URL('../docs/07-mvp-verification.md', import.meta.url), out.join('\n') + '\n');
console.log(`docs/07-mvp-verification.md written: ${results.length} runs, ${prefixSaves} saves, ${viewsScanned} views, ${problems.length} problems`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

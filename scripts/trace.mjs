// THE COMPOUND — Phase 3 trace generator. Runs the scenario corpus through the reference evaluator and writes
// docs/06-phase3-phone-scenario-trace.md (execution traces, dependency map, liveness, test-result table).
// Deterministic: same content → byte-identical output. Zero dependencies. `node scripts/trace.mjs [--out path]`.
// Historical Phase 3 artifact: docs/06 is frozen (see docs/phase3-checksums.txt); use --out to regenerate elsewhere.
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadContent, start, runSegment, supersededIds, NPC_IDS, passivePolicy } from '../src/engine/evaluator.mjs';
import { SCENARIOS, witnessPolicies } from '../tests/corpus.mjs';
import { walkCond, walkCons } from '../tests/static-checks.mjs';

const C = loadContent(), B = loadContent({ intents: false });
const out = [];
const p = (...l) => out.push(...l);
const seg = (t) => (t.day - 1) * 3 + { morning: 0, afternoon: 1, night: 2 }[t.segment];
const dayOf = (s) => `D${Math.floor(s / 3) + 1}${['S', 'C', 'Đ'][s % 3]}`;

function traceRun(content, role, policy) {
  const st = start(content, role); const rows = [];
  while (st.segment < 21 && !st.ending) {
    const s = st.segment, before = st.mutationLog.length;
    const ended = runSegment(content, st, policy);
    const muts = st.mutationLog.slice(before);
    const acts = st.actionLog.filter((a) => a.segment === s).map((a) => a.choiceId === null ? `${a.eventId}` : a.eventId ? `${a.eventId}/${a.choiceId}` : `(bỏ qua ${a.offered?.length ?? 0} optional)`);
    const conv = muts.filter((m) => ['propagation', 'npc_action', 'delayed_rule'].includes(m.cause.kind)).map((m) => m.cause.ruleId ?? m.cause.actionId).filter((x, i, a) => a.indexOf(x) === i);
    const beliefs = muts.filter((m) => m.consequence.type === 'belief' && m.consequence.agent !== 'player').map((m) => `${m.consequence.agent}:${m.consequence.factId.replace('F_', '')}=${m.consequence.status[0]}${m.consequence.believedValue ? '' : '(false)'}`);
    rows.push({ s, acts, conv, phone: st.flags['phone.location'], stress: st.player.stress, susp: st.player.suspicion, trust: NPC_IDS.map((n) => st.npcs[n].trustToPlayer).join('/'), status: NPC_IDS.filter((n) => st.npcs[n].status !== 'present').map((n) => `${n}:${st.npcs[n].status}`).join(' '), beliefs });
    if (ended) break;
  }
  return { st, rows };
}

p('# THE COMPOUND — PHASE 3: PHONE SCENARIO EXECUTION TRACE (generated)', '',
  `Sinh tự động bởi \`node scripts/trace.mjs\` từ content hiện tại qua \`src/engine/evaluator.mjs\`. Không sửa tay. Ngày: 2026-10-12.`,
  'Ký hiệu: segment = D{ngày}{S/C/Đ}; trust = thach/vu/mai/linh/duc; belief = agent:FACT=R|O|C (RUMOR/OBSERVED/CONFIRMED).', '');

// ---------------------------------------------------------------- 1. scenario traces
p('## 1. Execution trace từng scenario (chế độ Phase 3 = intents)', '');
for (const sc of SCENARIOS) {
  const t = traceRun(C, sc.role, sc.policy), b = traceRun(B, sc.role, sc.policy);
  p(`### ${sc.id} — ${sc.title}`, '', `Vai: **${sc.role}** · Ending Phase 3: **${t.st.ending ?? '—'}** · Ending Phase 2 baseline: **${b.st.ending ?? '—'}**`);
  if (sc.docsClaim) p(`Tài liệu kỳ vọng: ${sc.docsClaim}`);
  if (sc.knownGap) p(`**KHOẢNG CÁCH ĐÃ BIẾT:** ${sc.knownGap}`);
  p('', '| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |', '|---|---|---|---|---|---|---|---|');
  for (const r of t.rows) if (r.s >= 5 || r.conv.length) p(`| ${dayOf(r.s)} | ${r.acts.join('<br>') || '—'} | ${r.conv.join('<br>') || '—'} | ${r.phone} | ${r.stress}/${r.susp} | ${r.trust} | ${r.status || '—'} | ${r.beliefs.join('<br>') || '—'} |`);
  const diff = []; let lastKey = '';
  for (let s = 0; s < 21; s++) {
    const a = t.rows[s], c = b.rows[s]; if (!a || !c) continue;
    const parts = [];
    if (a.phone !== c.phone) parts.push(`phone ${c.phone}→${a.phone}`);
    if (a.status !== c.status) parts.push(`status "${c.status || 'present'}"→"${a.status || 'present'}"`);
    if (a.conv.join() !== c.conv.join()) parts.push(`convergence [${c.conv}]→[${a.conv}]`);
    const key = parts.join('; ');
    if (parts.length && key !== lastKey) diff.push(`${dayOf(s)}: ${key}`);
    lastKey = key;
  }
  p('', `Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): ${diff.length ? diff.join('; ') : 'không'}.`, '');
}

// ---------------------------------------------------------------- 2. phone transitions observed
p('## 2. Mọi lần `phone.location` đổi tay trong corpus (T08)', '', '| Scenario | Seg | Từ → Đến | Tác nhân (CausalOrigin) |', '|---|---|---|---|');
const allRuns = [...SCENARIOS.map((sc) => ({ id: sc.id, ...traceRun(C, sc.role, sc.policy) })), ...witnessPolicies(C).map((w) => ({ id: w.id, ...traceRun(C, w.role, w.policy) })), ...['captive', 'operator'].flatMap((role) => ['first', 'last'].map((pol) => ({ id: `ZP_${role}_${pol}`, ...traceRun(C, role, passivePolicy(pol)) })))];
for (const r of allRuns) { let cur = 'mai_drawer'; for (const m of r.st.mutationLog) { if (m.consequence.type !== 'flag' || m.consequence.flag !== 'phone.location' || m.consequence.value === cur) continue; p(`| ${r.id} | ${dayOf(m.at)} | ${cur} → ${m.consequence.value} | ${m.cause.kind}:${m.cause.actionId ?? m.cause.ruleId ?? m.cause.eventId ?? m.cause.backgroundId}${m.cause.actor ? ` (${m.cause.actor})` : ''} |`); cur = m.consequence.value; } }
p('');

// ---------------------------------------------------------------- 3. dependency map
p('## 3. Bản đồ phụ thuộc (flag → writers → readers), content hiện tại', '');
const writers = {}, readers = {};
const add = (m, k, v) => (m[k] ??= new Set()).add(v);
const scan = (id, cons, conds) => { walkCons(cons, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') add(writers, c.flag, id); }, (cond) => walkCond(cond, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') add(readers, c.flag, id); })); for (const cond of conds) walkCond(cond, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') add(readers, c.flag, id); }); };
for (const b of C.background) scan(b.id, b.effects, []);
for (const e of C.events) { scan(e.id, [], [e.preconditions]); e.observations.forEach((o) => scan(e.id, o.grants, [o.when])); e.choices.forEach((ch) => scan(`${e.id}/${ch.id}`, ch.consequences, [ch.available])); }
const dead = supersededIds(C);
for (const r of C.delayedRules) scan(dead.has(r.id) ? `~~${r.id}~~` : r.id, r.effects, [r.when]);
for (const pr of C.propagation) scan(dead.has(pr.id) ? `~~${pr.id}~~` : pr.id, pr.also || [], [pr.when]);
for (const a of C.intents.actions) scan(`**${a.id}**`, a.effects, [a.when]);
for (const en of C.endings) scan(en.id, [], [en.condition]);
p('| Flag | visibleTo | Writers | Readers |', '|---|---|---|---|');
for (const f of C.flags) p(`| \`${f.id}\` | ${f.visibleTo ? (f.visibleTo === 'all' ? 'all' : f.visibleTo.join(',')) : f.visibleByValue ? 'byValue' : '—'} | ${[...(writers[f.id] || [])].join(', ') || '—'} | ${[...(readers[f.id] || [])].join(', ') || (f.terminal ? '(terminal)' : '—')} |`);
p('', 'In đậm = NpcAction (Phase 3); gạch ngang = rule Phase 2 bị thay thế khi intents được nạp.', '');

// ---------------------------------------------------------------- 4. NPC knowledge audit
p('## 4. Kiểm toán lan truyền tri thức NPC — ai biết gì, từ đâu, lúc nào (S1_PASSIVE và O4_EXPOSURE)', '');
for (const id of ['S1_PASSIVE', 'O4_EXPOSURE']) {
  const sc = SCENARIOS.find((s) => s.id === id), t = traceRun(C, sc.role, sc.policy);
  p(`### ${id}`, '', '| NPC | Fact | Status | believed | Nguồn | Seg | Cause |', '|---|---|---|---|---|---|---|');
  for (const n of NPC_IDS) for (const b of Object.values(t.st.npcs[n].knowledge.beliefs)) if (b.cause.kind !== 'engine_init') p(`| ${n} | ${b.factId} | ${b.status} | ${b.believedValue} | ${b.source} | ${dayOf(b.acquiredAt)} | ${b.cause.kind}:${b.cause.ruleId ?? b.cause.actionId ?? b.cause.eventId ?? b.cause.backgroundId}${b.misinformation ? ' **(misinfo)**' : ''} |`);
  p('');
}

// ---------------------------------------------------------------- 5. liveness
p('## 5. Liveness — rule/action/PR nào từng bắn trong corpus (T07)', '');
const fired = {};
for (const r of allRuns) for (const id of [...r.st.firedRules, ...r.st.firedActions, ...r.st.firedPropagations]) add(fired, id, r.id);
const live = [...C.delayedRules.map((r) => r.id).filter((x) => !dead.has(x)), ...C.intents.actions.map((a) => a.id), ...C.propagation.map((x) => x.id).filter((x) => !dead.has(x))];
p('| Rule | Bắn trong | Ghi chú |', '|---|---|---|');
for (const id of live) p(`| ${id} | ${fired[id] ? fired[id].size + ' run' : '**KHÔNG BAO GIỜ**'} | ${fired[id] ? [...fired[id]].slice(0, 3).join(', ') + (fired[id].size > 3 ? '…' : '') : (id === 'PR_LINH_DOUBLE_AGENT_FEED' ? 'chết động (F-01 cascade)' : 'reachable, không có trong corpus')} |`);
for (const id of dead) p(`| ~~${id}~~ | — | thay thế bởi ${C.intents.actions.find((a) => (a.supersedes || []).includes(id)).id} |`);
p('');

// ---------------------------------------------------------------- 6. test results (actual)
p('## 6. Kết quả test thực tế', '');
let tap = '';
try { tap = execSync('node --test tests/*.test.mjs 2>&1', { cwd: new URL('..', import.meta.url), encoding: 'utf8', shell: '/bin/bash' }); } catch (e) { tap = e.stdout || String(e); }
const lines = tap.split('\n');
p('```', ...lines.filter((l) => /^(ok|not ok) \d+ - /.test(l)).map((l) => l.replace(/ # .*$/, '')), ...lines.filter((l) => /^# (tests|pass|fail|skipped) /.test(l)), '```', '');
p(`Node: ${process.version}. Lệnh: \`node --test tests/*.test.mjs\`.`);

writeFileSync(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : new URL('../docs/06-phase3-phone-scenario-trace.md', import.meta.url), out.join('\n') + '\n');
console.log(`wrote docs/06-phase3-phone-scenario-trace.md (${out.length} lines)`);

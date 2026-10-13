#!/usr/bin/env node
// THE COMPOUND — terminal interface (MVP). Zero dependencies. Usage:
//   node src/cli/play.mjs                      interactive, choose a role
//   node src/cli/play.mjs --role operator      interactive, role preset
//   node src/cli/play.mjs --load saves/x.json  resume a save (replay-verified)
//   node src/cli/play.mjs --auto --role captive [--policy default|first|last]   zero-player run: print journal + epilogue
//   node src/cli/play.mjs --script path.json   replay a decision list (JSON array of {k,e,c}) and print the result
//   --save-dir <dir>                           where `s` writes saves (default: ./saves next to package.json)
import { createInterface } from 'node:readline';
import { stdin, stdout, argv, exit } from 'node:process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { loadContent, passivePolicy } from '../engine/evaluator.mjs';
import { Session, autoplay } from '../engine/session.mjs';
import { ROLE_LABEL } from '../engine/projection.mjs';

const args = Object.fromEntries(argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]] : [])).filter((x) => x.length));
const C = loadContent();
import { pathToFileURL } from 'node:url';
const SAVE_DIR = typeof args['save-dir'] === 'string' ? pathToFileURL(args['save-dir'].replace(/\/?$/, '/')) : new URL('../../saves/', import.meta.url);
const line = (s = '') => stdout.write(s + '\n');
const hr = () => line('─'.repeat(72));

function printHeader(v) {
  hr();
  line(`${v.timeLabel}   ·   ${v.roleLabel}   ·   SUSPICION: ${v.stats.suspicion.label}   ·   STRESS: ${v.stats.stress.label}`);
  hr();
}
function printJournal(v, last = 6) {
  line('SỔ GHI NHỚ (gần nhất):');
  for (const j of v.journal.slice(-last)) {
    line(`  [${j.time} · ${j.location}] ${j.summary}`);
    for (const o of j.observations) line(`      · ${o}`);
    if (j.choice) line(`      → ${j.choice}`);
  }
  line();
}
function printBeliefs(v) {
  line('ĐIỀU BẠN TIN LÀ MÌNH BIẾT:');
  if (!v.beliefs.length) line('  (chưa có gì)');
  for (const b of v.beliefs) line(`  [${b.statusLabel}${b.uncertain ? ', không chắc' : ''}] ${b.believedValue ? '' : 'KHÔNG: '}${b.statement}  (${b.sourceLabel}, ${b.when})`);
  line();
}
function printNpcs(v) {
  line('NHỮNG NGƯỜI QUANH BẠN: ' + v.npcs.map((n) => `${n.name} (${n.statusLabel})`).join(' · '));
  line();
}
function printEpilogue(v) {
  hr(); line(`KẾT THÚC: ${v.epilogue.title}   (${v.epilogue.endedAt})`); hr();
  line(v.epilogue.text); line();
  for (const x of v.epilogue.extras) line('  ' + x);
  if (v.epilogue.extras.length) line();
  for (const n of v.epilogue.npcs) line(`${n.name.toUpperCase()} — ${n.text}`);
  line();
}
function printPrompt(p) {
  if (p.kind === 'optional') {
    line(`${p.time} — giờ rảnh. Bạn có thể:`);
    p.options.forEach((o, i) => line(`  ${i + 1}. [${o.location}] ${o.summary}`));
    line('  0. Không làm gì, để thời gian trôi');
  } else {
    line(`${p.time} — ${p.location}`);
    line(p.summary);
    for (const o of p.observations) line(`  · ${o.text}${o.uncertain ? '  (bạn không chắc mình thấy đúng)' : ''}`);
    line();
    p.choices.forEach((c, i) => line(`  ${i + 1}. ${c.label}`));
  }
  line('  (s = lưu, j = sổ ghi nhớ, b = điều bạn biết, n = mọi người, q = thoát)');
}

function saveTo(session, label) {
  if (!existsSync(SAVE_DIR)) mkdirSync(SAVE_DIR, { recursive: true });
  const name = `${session.role}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const file = new URL(name, SAVE_DIR);
  writeFileSync(file, JSON.stringify(session.save({ savedAt: new Date().toISOString(), label }), null, 2));
  return file.pathname;
}

/**
 * Line reader that works on a terminal AND on piped/scripted stdin: lines that arrive before they are asked for are
 * queued instead of dropped (readline/promises `question` loses them), and EOF answers every later question with 'q'.
 */
function prompter() {
  const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY === true });
  const queue = [], waiting = [];
  let closed = false;
  rl.on('line', (l) => { if (waiting.length) waiting.shift()(l); else queue.push(l); });
  rl.on('close', () => { closed = true; while (waiting.length) waiting.shift()('q'); });
  return {
    question(text) {
      stdout.write(text);
      if (queue.length) return Promise.resolve(queue.shift());
      if (closed) return Promise.resolve('q');
      return new Promise((resolve) => waiting.push(resolve));
    },
    close() { rl.close(); },
  };
}

async function interactive() {
  const rl = prompter();
  let session;
  if (args.load) {
    session = Session.fromSave(C, JSON.parse(readFileSync(args.load, 'utf8')));
    line(`Đã tải và kiểm chứng save (${session.decisions.length} quyết định, ${session.view().timeLabel}).`);
  } else {
    let role = args.role;
    while (!['captive', 'operator'].includes(role)) {
      line('THE COMPOUND — Khu B, Thiên Hòa. Bảy ngày. Chọn vai:');
      line('  1. ' + ROLE_LABEL.captive); line('  2. ' + ROLE_LABEL.operator);
      const a = (await rl.question('> ')).trim();
      role = a === '1' ? 'captive' : a === '2' ? 'operator' : a;
    }
    session = new Session(C, role);
  }
  for (;;) {
    const v = session.view();
    if (v.epilogue) {
      printJournal(v, 4); printEpilogue(v);
      const a = (await rl.question('r = chơi lại (vai khác hoặc cùng vai), q = thoát > ')).trim();
      if (a === 'r') { const other = session.role === 'captive' ? 'operator' : 'captive'; const b = (await rl.question(`1 = ${ROLE_LABEL[session.role]}, 2 = ${ROLE_LABEL[other]} > `)).trim(); session = new Session(C, b === '2' ? other : session.role); continue; }
      break;
    }
    printHeader(v);
    const p = v.prompt;
    printPrompt(p);
    const a = (await rl.question('> ')).trim();
    if (a === 'q') break;
    if (a === 's') { line('Đã lưu: ' + saveTo(session, v.timeLabel)); continue; }
    if (a === 'j') { printJournal(v, 12); continue; }
    if (a === 'b') { printBeliefs(v); continue; }
    if (a === 'n') { printNpcs(v); continue; }
    const n = Number(a);
    try {
      if (p.kind === 'optional') { if (n === 0) session.pick(null); else if (n >= 1 && n <= p.options.length) session.pick(p.options[n - 1].id); else line('?'); }
      else if (n >= 1 && n <= p.choices.length) session.choose(p.choices[n - 1].id);
      else line('?');
    } catch (e) { line('Lỗi: ' + e.message); }
  }
  rl.close();
}

function batch() {
  const role = args.role ?? 'captive';
  let session;
  if (args.script) session = new Session(C, role, JSON.parse(readFileSync(args.script, 'utf8')));
  else { session = new Session(C, role); autoplay(session, passivePolicy(args.policy ?? 'default')); }
  const v = session.view();
  line(`THE COMPOUND — ${args.script ? 'replay' : 'zero-player run'} · ${v.roleLabel}`);
  printJournal(v, 100);
  printBeliefs(v);
  if (v.epilogue) printEpilogue(v); else { printHeader(v); printPrompt(v.prompt); }
  line(`state hash: ${session.hash}   decisions: ${session.decisions.length}`);
}

if (args.auto || args.script) batch(); else interactive().then(() => exit(0));

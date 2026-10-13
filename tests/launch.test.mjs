// THE COMPOUND — launch tests: the local server and the terminal interface actually start, serve/replay the real content
// and shut down cleanly. Zero dependencies; the server binds 127.0.0.1 on an ephemeral port; CLI saves go to a temp dir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, run, passivePolicy } from '../src/engine/evaluator.mjs';
import { fetchContent } from '../src/engine/content.mjs';
import { Session } from '../src/engine/session.mjs';
import { startServer } from '../src/server.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAY = join(ROOT, 'src/cli/play.mjs');
const C = loadContent();
const cli = (args, input) => execFileSync(process.execPath, [PLAY, ...args], { cwd: ROOT, input, encoding: 'utf8', timeout: 60000, env: { ...process.env, NODE_NO_WARNINGS: '1' } });

test('SERVER — starts on 127.0.0.1, serves the page, the module graph and the content; refuses everything else', async () => {
  const server = await startServer(0);
  try {
    const { address, port } = server.address();
    assert.equal(address, '127.0.0.1', 'never binds a public interface');
    const base = `http://127.0.0.1:${port}`;
    const get = async (p) => { const r = await fetch(base + p); return { status: r.status, type: r.headers.get('content-type'), text: r.status === 200 ? await r.text() : '', url: r.url }; };
    const index = await get('/');
    assert.equal(index.status, 200); assert.match(index.type, /text\/html/);
    // every script/module the page references must actually load from where the browser will ask for it (regression: ./app.mjs → /app.mjs → 404)
    const srcs = [...index.text.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(srcs.length >= 1);
    for (const src of srcs) { const u = new URL(src, index.url); const r = await fetch(u); assert.equal(r.status, 200, `${src} resolved to ${u.pathname}`); assert.match(r.headers.get('content-type'), /text\/javascript/); }
    const appUrl = new URL(srcs[0], index.url);
    for (const imp of ['../engine/content.mjs', '../engine/session.mjs', '../engine/projection.mjs', '../../content/truth.json']) assert.equal((await fetch(new URL(imp, appUrl))).status, 200, `${imp} relative to ${appUrl.pathname}`);
    assert.equal((await fetch(base + '/favicon.ico')).status, 204);
    for (const m of ['/src/web/app.mjs', '/src/engine/content.mjs', '/src/engine/session.mjs', '/src/engine/projection.mjs', '/src/engine/core.mjs', '/src/engine/hash.mjs']) {
      const r = await get(m); assert.equal(r.status, 200, m); assert.match(r.type, /text\/javascript/, m);
    }
    // the browser's content loader against the real server yields the very same bundle the tests use
    const web = await fetchContent(`${base}/content/`);
    assert.equal(web.contentVersion, C.contentVersion, 'browser content bundle must hash identically to the Node bundle');
    const s = new Session(web, 'captive'); assert.equal(s.prompt().eventId, 'EV_S_D1M_INTAKE');
    for (const bad of ['/package.json', '/docs/01-phase1-gdd-lite.md', '/src/../package.json', '/content/../package.json', '/tests/corpus.mjs', '/src/web/']) assert.notEqual((await get(bad)).status, 200, `${bad} must not be served`);
  } finally { await new Promise((r) => server.close(r)); }
});

test('CLI — zero-player runs for both roles print a journal and an epilogue and exit 0', () => {
  for (const role of ['captive', 'operator']) {
    const out = cli(['--auto', '--role', role]);
    assert.match(out, /zero-player run/); assert.match(out, /KẾT THÚC: /); assert.match(out, /state hash: [0-9a-f]{16}/);
    const direct = run(C, role, passivePolicy('default'));
    assert.ok(out.includes(C.endings.find((e) => e.id === direct.ending).title.vi), `${role}: printed ending must match the engine's`);
  }
});

test('CLI — --script replays a decision list and reports the same hash as the engine; a bad list is reported, not crashed into', () => {
  const dir = mkdtempSync(join(tmpdir(), 'compound-'));
  try {
    const st = run(C, 'operator', passivePolicy('default'));
    const f = join(dir, 'd.json'); writeFileSync(f, JSON.stringify(st.decisions));
    const out = cli(['--script', f, '--role', 'operator']);
    assert.match(out, /replay/); assert.ok(out.includes(`decisions: ${st.decisions.length}`));
    const bad = join(dir, 'bad.json'); writeFileSync(bad, JSON.stringify([{ k: 'c', e: 'EV_S_D1M_INTAKE', c: 'nope' }]));
    assert.throws(() => cli(['--script', bad, '--role', 'operator']), /not available/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI — interactive session over stdin: choose a role, make choices, save, quit; the save reloads verified and continues', () => {
  const dir = mkdtempSync(join(tmpdir(), 'compound-'));
  try {
    const out = cli(['--save-dir', dir], '2\n1\n1\n1\nj\nb\nn\ns\nq\n'); // operator, three decisions, journal/beliefs/npcs, save, quit
    assert.match(out, /Chọn vai/); assert.match(out, /Ngày 1 · Sáng/); assert.match(out, /SỔ GHI NHỚ/); assert.match(out, /ĐIỀU BẠN TIN/); assert.match(out, /NHỮNG NGƯỜI QUANH BẠN/); assert.match(out, /Đã lưu: /);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 1);
    const save = JSON.parse(readFileSync(join(dir, files[0]), 'utf8'));
    assert.equal(save.role, 'operator'); assert.equal(save.format, 'the-compound-save'); assert.equal(save.decisions.length, 3);
    const again = cli(['--load', join(dir, files[0]), '--save-dir', dir], '1\nq\n');
    assert.match(again, /Đã tải và kiểm chứng save \(3 quyết định/);
    assert.match(again, /Ngày 1 · Đêm|Ngày 2 · Sáng/, 'continues from where the save left off');
    // a tampered save is refused with a reason, not loaded
    const t = { ...save, decisions: save.decisions.slice(0, 2) }; writeFileSync(join(dir, 'tampered.json'), JSON.stringify(t));
    assert.throws(() => cli(['--load', join(dir, 'tampered.json')], 'q\n'), /checksum/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

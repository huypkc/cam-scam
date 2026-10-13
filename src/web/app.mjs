// THE COMPOUND — browser interface (MVP). Plain ES modules, no build step, no dependencies.
// Renders Session.view() only: the page never touches WorldTruth or NPC knowledge (they are not in the view).
import { fetchContent } from '../engine/content.mjs';
import { Session } from '../engine/session.mjs';
import { ROLE_LABEL } from '../engine/projection.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const key = (slot) => `the-compound:save:${slot}`;

let content, session;

function readSlot(slot) { try { const raw = localStorage.getItem(key(slot)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function writeSlot(slot, label) { try { localStorage.setItem(key(slot), JSON.stringify(session.save({ savedAt: new Date().toISOString(), label }))); } catch (e) { alert('Không lưu được: ' + e.message); } }

function renderRoleSelect(msg = '') {
  $('hdr-time').textContent = ''; $('hdr-role').textContent = ''; $('hdr-susp').textContent = ''; $('hdr-stress').textContent = '';
  const saves = SLOTS.map((s) => [s, readSlot(s)]).filter(([, v]) => v);
  $('stage').innerHTML = `
    <p class="time">Khu B · Thiên Hòa · bảy ngày</p>
    <p class="summary">Một thế giới, hai cánh cửa khóa. Chọn phía bạn đứng.</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <div class="choices" id="role">
      <button data-role="captive">${esc(ROLE_LABEL.captive)}<br><span class="small">Quan sát, giấu, kết thân, chịu đựng.</span></button>
      <button data-role="operator">${esc(ROLE_LABEL.operator)}<br><span class="small">Điều tra, báo cáo hoặc che giấu, ép hoặc nương tay.</span></button>
    </div>
    ${saves.length ? `<h3 class="time" style="margin-top:28px">Tiếp tục</h3><div class="choices">${saves.map(([s, v]) => `<button data-load="${s}">${esc(v.label || s)} — ${esc(ROLE_LABEL[v.role])}${v.ending ? ' (đã kết thúc)' : ''}<br><span class="small">${esc(v.savedAt || '')}</span></button>`).join('')}</div>` : ''}
    <div class="row"><label class="small">Nhập file save: <input type="file" id="import" accept="application/json"></label></div>`;
  $('side').innerHTML = `<h3>Về trò chơi</h3><p>Bảy ngày × ba phân đoạn. Mỗi phân đoạn bạn có nhiều nhất một hành động. Hậu quả đến muộn. Những người quanh bạn có việc riêng của họ và sẽ làm việc đó dù bạn có mặt hay không.</p><p>Không có "lựa chọn đúng". Chỉ có bảo vệ ai, và trả giá bằng gì.</p>`;
  document.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => { session = new Session(content, b.dataset.role); render(); }));
  document.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => load(readSlot(b.dataset.load))));
  $('import').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { load(JSON.parse(await f.text())); } catch (err) { renderRoleSelect('File không hợp lệ: ' + err.message); } });
}

function load(save) {
  try { session = Session.fromSave(content, save); render(); }
  catch (e) { renderRoleSelect('Không tải được save: ' + e.message); }
}

function render() {
  const v = session.view();
  $('hdr-time').textContent = v.timeLabel;
  $('hdr-role').textContent = v.roleLabel;
  $('hdr-susp').innerHTML = `SUSPICION <b>${esc(v.stats.suspicion.label)}</b>`; $('hdr-susp').className = `meta stat l${v.stats.suspicion.level}`;
  $('hdr-stress').innerHTML = `STRESS <b>${esc(v.stats.stress.label)}</b>`; $('hdr-stress').className = `meta stat l${v.stats.stress.level}`;
  renderSide(v);
  if (v.epilogue) return renderEpilogue(v);
  const p = v.prompt;
  const recent = v.journal.slice(-3).map((j) => `<li><span class="t">${esc(j.time)} · ${esc(j.location)}</span><br>${esc(j.summary)}${j.observations.map((o) => `<div class="obs">${esc(o)}</div>`).join('')}${j.choice ? `<div class="c">→ ${esc(j.choice)}</div>` : ''}</li>`).join('');
  if (p.kind === 'optional') {
    $('stage').innerHTML = `<ul class="journal small">${recent}</ul><p class="time">${esc(p.time)} · giờ rảnh</p><p class="summary">Bạn có thể làm một việc, hoặc để thời gian trôi.</p>
      <div class="choices">${p.options.map((o) => `<button data-pick="${esc(o.id)}"><span class="small">[${esc(o.location)}]</span> ${esc(o.summary)}</button>`).join('')}<button class="ghost" data-pick="">Không làm gì</button></div>`;
    document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { session.pick(b.dataset.pick || null); writeSlot('auto', 'Tự động lưu'); render(); }));
  } else {
    $('stage').innerHTML = `<ul class="journal small">${recent}</ul><p class="time">${esc(p.time)} · ${esc(p.location)}</p><p class="summary">${esc(p.summary)}</p>
      ${p.observations.map((o) => `<div class="obs${o.uncertain ? ' uncertain' : ''}">${esc(o.text)}</div>`).join('')}
      <div class="choices">${p.choices.map((c) => `<button data-choose="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>`;
    document.querySelectorAll('[data-choose]').forEach((b) => b.addEventListener('click', () => { session.choose(b.dataset.choose); writeSlot('auto', 'Tự động lưu'); render(); }));
  }
}

function renderSide(v) {
  $('side').innerHTML = `
    <h3>Những người quanh bạn</h3><div>${v.npcs.map((n) => `${esc(n.name)} <span class="small">(${esc(n.statusLabel)})</span>`).join(' · ')}</div>
    <h3>Điều bạn tin là mình biết</h3><div>${v.beliefs.length ? v.beliefs.map((b) => `<div class="belief"><span class="k">${esc(b.statusLabel)}${b.uncertain ? ' · không chắc' : ''}</span><br>${b.believedValue ? '' : '<b>KHÔNG:</b> '}${esc(b.statement)} <span class="small">(${esc(b.sourceLabel)}, ${esc(b.when)})</span></div>`).join('') : '<span class="small">chưa có gì</span>'}</div>
    <h3>Lưu / tải</h3>
    <div class="choices small">${['slot1', 'slot2', 'slot3'].map((s) => { const sv = readSlot(s); return `<button data-save="${s}">Lưu vào ${s.replace('slot', 'ô ')}${sv ? ` <span class="small">(${esc(sv.label || '')})</span>` : ''}</button>`; }).join('')}
      <button class="ghost" id="export">Tải file save về máy</button>
      <button class="ghost" id="restart">Bắt đầu lại / đổi vai</button></div>
    <h3>Sổ ghi nhớ</h3><ul class="journal">${[...v.journal].reverse().map((j) => `<li><span class="t">${esc(j.time)} · ${esc(j.location)}</span><br>${esc(j.summary)}${j.observations.map((o) => `<div class="obs">${esc(o)}</div>`).join('')}${j.choice ? `<div class="c">→ ${esc(j.choice)}</div>` : ''}</li>`).join('')}</ul>`;
  document.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => { writeSlot(b.dataset.save, v.timeLabel); render(); }));
  $('export').addEventListener('click', () => { const blob = new Blob([JSON.stringify(session.save({ savedAt: new Date().toISOString(), label: v.timeLabel }), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `the-compound-${v.role}.json`; a.click(); });
  $('restart').addEventListener('click', () => renderRoleSelect());
}

function renderEpilogue(v) {
  const e = v.epilogue;
  $('stage').innerHTML = `<div class="epilogue"><p class="time">${esc(e.endedAt)}</p><h2>${esc(e.title)}</h2><p class="summary">${esc(e.text)}</p>${e.extras.map((x) => `<p>${esc(x)}</p>`).join('')}
    ${e.npcs.map((n) => `<div class="card"><b>${esc(n.name)}</b> <span class="small">(${esc(n.statusLabel)})</span><br>${esc(n.text)}</div>`).join('')}
    <div class="row"><button data-again="${esc(v.role)}">Chơi lại cùng vai</button><button data-again="${esc(v.role === 'captive' ? 'operator' : 'captive')}">Chơi vai ${esc(v.role === 'captive' ? 'Operator' : 'Captive')} — xem phía bên kia của cánh cửa</button></div></div>`;
  document.querySelectorAll('[data-again]').forEach((b) => b.addEventListener('click', () => { session = new Session(content, b.dataset.again); render(); }));
}

(async () => {
  try { content = await fetchContent(new URL('../../content/', import.meta.url)); renderRoleSelect(); }
  catch (e) { $('stage').innerHTML = `<p class="err">Không tải được nội dung: ${esc(e.message)}. Hãy chạy <code>node src/server.mjs</code> và mở http://127.0.0.1:8787/.</p>`; }
})();

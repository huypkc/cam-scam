# THE COMPOUND — MVP ARCHITECTURE REVIEW (độc lập)

Ngày: 2026-10-13 · Reviewer: independent architecture reviewer · Phạm vi: `src/` (core, session, projection, content, hash, evaluator, cli, web, server), `tests/`, `content/` (chỉ đọc). Không sửa file nào ngoài tài liệu này.

Phương pháp: đọc toàn bộ `src/` (~1.100 dòng) và `tests/`; chạy `node --test tests/*.test.mjs` (108/108 pass, 38,6 s, Node v22.23.3); chạy `node src/cli/play.mjs --auto --role captive|operator`; khởi động `src/server.mjs` trên cổng tạm và bắn 18 probe path-traversal; viết 5 script thí nghiệm (đo hiệu năng replay/Session, kịch bản Session bị kẹt, giả mạo save, quét view để tìm rò rỉ, so sánh hằng số `types.ts` ↔ `core.mjs` qua `--experimental-strip-types`). Mọi con số dưới đây là đo thực, không ước lượng.

Phân loại: BLOCKER / HIGH / MEDIUM / LOW / NOTE. Mỗi finding có file:line, kịch bản hỏng cụ thể và đề xuất sửa.

---

## 0. Kết luận nhanh

**MVP architecture: ACCEPT WITH FIXES.**

Không có BLOCKER. Không có HIGH. Thiết kế engine/session/projection và "state = replay(decisions)" là đúng đắn, deterministic đã được chứng minh (bằng test và bằng thí nghiệm độc lập), atomicity ở mức bước (step) đúng như tuyên bố, save/load là một hệ quả của replay nên không có đường dữ liệu thứ hai để lệch. Ba sửa bắt buộc trước khi chấp nhận đều rẻ (< 30 dòng tổng cộng), xem §9.

---

## 1. Kiến trúc engine / session / projection và "state = replay(decisions)"

### 1.1 Đã kiểm chứng là đúng

| Điều | Cách kiểm chứng |
|---|---|
| `core.mjs` không import Node API; cùng một module chạy trong `node --test`, CLI và browser | `grep "node:"` trên core/session/projection/content/hash: 0 kết quả; `tests/launch.test.mjs:29-35` fetch toàn bộ module graph qua server và `fetchContent` cho `contentVersion` trùng bundle Node |
| `apply()` là lối vào mutation duy nhất; mọi mutation mang `cause` | Đọc `core.mjs:105-155`; mọi ghi vào `st` ngoài `apply` chỉ là bookkeeping (`firedEvents`, `actionLog`, `queue` filter, `segment++`) không phải world-state |
| Session không giữ state "sống"; mọi call là replay từ đầu | `session.mjs:25-29`; `choose()/pick()` chỉ append rồi `_refresh()` (`session.mjs:57-58, 67-68`) |
| Projection không đọc `truth.facts[*].value` | `projection.mjs` chỉ đọc `statement` (`:119`); `tests/session.test.mjs:30-31` grep tĩnh cấm `.value`/`misinformation`/`trustToPlayer` trong 4 file UI |
| Prefix bất kỳ của decision log là một điểm commit hợp lệ | `tests/engine.test.mjs:91-103` (>500 prefix); thí nghiệm riêng: cắt sau 2 quyết định ở S1_PASSIVE → state ở seg 1 với forced event đã commit, pending = optional — đúng thiết kế step 4 (`core.mjs:249-261`) |

### 1.2 Hiệu năng của "rebuild on every call" (đo thực, S9_ESCAPE_WITH_DUC, 31 quyết định, 120 mutation, state JSON 44 KB)

| Đo | Kết quả |
|---|---|
| `replay()` toàn ván | 46,9 ms (trung bình 10 lần) |
| `Session.choose()` ở quyết định thứ 0 / 8 / 16 / 24 / 30 | 2 / 7 / 18 / 31 / 51 ms — tuyến tính ~1,7 ms mỗi quyết định đã có |
| `Session.view()` | 0,2–1,6 ms |
| `stateHash()` / `Session.hash` | 5,2 ms (FNV-1a bằng BigInt trên ~44 KB UTF-16) |
| `autoplay` cả ván qua Session (O(n²)) | 700 ms |
| `structuredClone` toàn state trong một ván zero-player | 156 lần (≈1 snapshot `transact` cho mỗi bước có hiệu lực + 1 clone consequence cho mỗi mutation) |

Kết luận: với trần 21 segment và ≤ ~40 quyết định, chi phí tối đa ~50 ms/click là không cảm nhận được trên cả CLI lẫn browser. Chi phí là O(n²) theo số quyết định của ván và O(|state|) cho mỗi `transact` (`core.mjs:164` clone cả `mutationLog`), nên **không** mở rộng được nếu sau MVP kéo dài ván chơi hoặc tăng mật độ rule — xem L-4.

### 1.3 Finding

**M-1 · MEDIUM · Session bị kẹt vĩnh viễn nếu replay ném lỗi sau khi đã push quyết định** — `session.mjs:57-58` và `:67-68`.
`choose()` push vào `this.decisions` **trước** khi `_refresh()` replay. Nếu replay ném (bất kỳ invariant nào trong `apply`, ví dụ `core.mjs:144` "granted OBSERVED with wrong value", `:134` schedule quá khứ, `:207` "no available choice"), quyết định hỏng vẫn nằm trong `this.decisions`, `this.state` giữ bản cũ, và **mọi** `choose()/pick()` sau đó đều replay lại quyết định hỏng và ném tiếp.
Kịch bản tái hiện (script riêng, content bị mutate để một choice vi phạm invariant): sau lần `choose('c_protest')` ném, `session.decisions = [c_protest]`, `state.decisions = []`, `prompt().kind === 'choice'` vẫn như cũ; `choose('c_sign')` (hợp lệ) cũng ném cùng lỗi; `save()` thì thành công nhưng lưu state cũ. Trên CLI (`play.mjs:133-137`) người chơi thấy "Lỗi: …" lặp vô hạn; trên browser (`app.mjs:54, 59`) exception trong click handler → trang đứng im, autosave không ghi (vì `writeSlot` đứng sau `session.choose`).
Xác suất kích hoạt thấp (content được chặn tĩnh bởi ~80 test), nhưng đây là đường duy nhất làm sai tuyên bố ở `session.mjs:5` "the UI can never corrupt the state".
Sửa (≈4 dòng): replay trên danh sách ứng viên, chỉ commit khi thành công:
```js
const next = [...this.decisions, d];
const r = replay(this.content, this.role, next, TOTAL_SEGMENTS); // ném thì this.* không đổi
this.decisions = next; this.state = r.st; this.request = r.complete ? null : r.request;
```
Thêm một test "a choose() whose replay throws leaves decisions/state/prompt unchanged".

**L-1 · LOW · Chú thích sai về rollback ở `core.mjs:428`** — "the partial segment was rolled back by transact" không đúng: chỉ *bước* đang chạy bị rollback; background effects, forced events trước đó và cả `st.queue = st.queue.filter(...)` (`core.mjs:244`, nằm ngoài `transact`) của segment đó vẫn được commit. Hành vi này là **đúng thiết kế** (một save giữa segment phải giữ các forced event đã trả lời) và deterministic (replay lại cho cùng kết quả), nhưng chú thích gây hiểu nhầm cho người bảo trì. Sửa: ghi rõ "granularity = step; the committed prefix of the segment stays".

**NOTE · Tầng DoD kiến trúc đã tốt hơn docs/02 §4** — docs/02 §4 (dòng 88-105) nói forced events "theo thứ tự khai báo" và không có bước 6a'; engine dùng `(order, forced-before-scheduled, id)` (`core.mjs:226`) và 6a' NPC actions (`:316-331`) theo Q2/O12/O13 đã ratify. Header `core.mjs:9` lại viết "declaration index" trong khi code dùng `id`. Nên cập nhật hai chú thích này (không ảnh hưởng runtime).

---

## 2. Determinism

### 2.1 Đã kiểm chứng là sound

- Không `Math.random`, không `Date`, không `toLocale*`/`localeCompare`/`Intl` trong engine (`grep`): `Date` chỉ xuất hiện ở `play.mjs:72,74` và `app.mjs:15,73` cho `savedAt`/tên file, và `savedAt`/`label` nằm **ngoài** `checksum` (`core.mjs:457, 463`).
- Mọi `sort` đều có khóa toàn phần: `byId` so sánh code-point (`core.mjs:33`); events `(order, rank, id)` `:226`; background `(order, id)` `:237`; propagation/actions/rules `(priority, id)` `:280, 318, 340`; endings chỉ theo `priority` `:263` nhưng 4 priority là 1,2,3,4 duy nhất (in ra từ `content/endings.json`) nên stable-sort không bao giờ nhìn file order. Test `ORDER` (`tests/engine.test.mjs:54-61`) đảo ngược mọi mảng content và so hash: pass.
- `Set`/`Map`: `supersededIds` và `acted` chỉ dùng `.has()` (`core.mjs:37, 317`); `labels` Map trong projection chỉ `.get()`. Không có iteration phụ thuộc thứ tự chèn ảnh hưởng state.
- Thứ tự key object: `stateHash` đi qua `canonicalJson` sort key đệ quy (`hash.mjs:8-16`), `Object.keys().sort()` mặc định là UTF-16 code-unit order, không phụ thuộc locale. `mutationLog` là mảng theo thứ tự thực thi — thứ tự thực thi đã chứng minh ổn định ở trên.
- `structuredClone`: giữ key có giá trị `undefined` (`ending: undefined`, `misinformation: undefined`) còn `canonicalJson` bỏ chúng (`hash.mjs:14`) — hai biểu diễn khác nhau nhưng hash giống nhau; `JSON.stringify` trong test ATOMIC cũng bỏ `undefined`. Không có Map/Set/Date/BigInt/−0 trong state (−0 chỉ có thể sinh từ `clampTrust(-0)`; `JSON.stringify(-0) === "0"` nên hash không đổi).
- Floating point: quét toàn content — 0 delta không nguyên; stats/trust/flagAdd đều số nguyên, clamp bằng `Math.max/min` trên số nguyên.
- FNV-1a 64 bằng BigInt trên `charCodeAt` (`hash.mjs:19-26`): giống nhau trên Node và mọi browser hỗ trợ BigInt; `tests/launch.test.mjs:34` xác nhận bundle browser hash trùng Node.
- `start()` deep-freeze `content.truth` (`core.mjs:52`); ghi vào truth ném `TypeError` (thí nghiệm, ESM strict).

### 2.2 Finding

**L-2 · LOW · Toán tử so sánh "ma" `'<<='`** — `core.mjs:31` chấp nhận `'<<='` (hiển nhiên là typo) với nghĩa `<=`; `types.ts:194 Cmp` không có nó; content hiện không dùng (quét: `"<<="` không xuất hiện). Rủi ro: content tương lai viết `'<<='` chạy được ở engine nhưng mọi static checker dựa trên `types.ts` sẽ không bắt, và tài liệu sẽ nói "5 toán tử" trong khi engine có 6. Sửa: xóa khỏi bảng (một token).

**NOTE · `deepFreeze(content.truth)` là side-effect lên object content dùng chung** (`core.mjs:52`). `loadContent({mutate})` trong test mutate *trước* lần `start()` đầu tiên nên không gặp; nhưng một test tương lai mutate `truth` sau khi đã `start()` sẽ ném `TypeError` khó hiểu. Chấp nhận được; chỉ cần một dòng chú thích ở `buildContent`.

---

## 3. Atomicity

### 3.1 Đã kiểm chứng là sound

- `transact` (`core.mjs:163-170`): snapshot bằng `structuredClone`, rollback bằng `delete` toàn bộ key + `Object.assign` → identity của `st` không đổi, nội dung byte-identical (`tests/engine.test.mjs:16-23`).
- Trong code hiện tại **không có `transact` lồng nhau**: `fireEvent` (`:198`) được gọi từ `runSegment` ngoài mọi `transact`; bước 4 tách pick (`:256-259`) và `fireEvent` (`:260`) thành hai transact tuần tự — đúng như chú thích, và test prefix (`engine.test.mjs:91-103`) chứng minh "pick đã commit, choice pending" là điểm commit hợp lệ. Nếu sau này có lồng nhau, cơ chế vẫn đúng (inner rollback rồi rethrow, outer rollback về snapshot sớm hơn), chỉ tốn gấp đôi clone.
- `NeedInput` từ `policy.choose` ném **bên trong** `fireEvent.transact` → event chưa fire không để lại dấu vết (observation grants cũng bị rollback) — đúng, vì `prompt()` preview lại observations trên clone (`session.mjs:44-47`) và `tests/session.test.mjs:53-56` xác nhận preview = journal thực.
- `NeedInput` từ `policy.pickOptional` (`:254`) ném **ngoài** transact nhưng trước mọi mutation của bước 4 → không có gì để rollback.
- Convergence: mỗi propagation/action/rule là một transact riêng (`:286, 294, 324, 344`); lỗi ở một action không làm mất các bước trước (`engine.test.mjs:34-41`). Ending: `endGame` trong transact riêng (`:265`) và `return true` ngay → không có mutation sau ending (test INVARIANTS `:247-248`).
- Các ghi ngoài transact (`firedEvents` không — nó nằm trong fireEvent; `actionLog.push` cho scheduled-skipped `:247`; `queue` filter `:244`; `segment++` `:271`; clamp `:335`) đều là thao tác không thể ném.

### 3.2 Finding

Không có finding mức ≥ MEDIUM riêng cho atomicity. Lỗi duy nhất liên quan là **M-1** (atomicity ở tầng Session, không phải engine). Lưu ý tài liệu: granularity là **bước**, không phải **segment** — một lỗi content trong convergence sẽ để `run()` (dùng trực tiếp, không qua Session) kết thúc với state giữa convergence và `segment` chưa tăng; với Session điều này vô hại vì state luôn được rebuild từ đầu.

---

## 4. Save/load và chống giả mạo

### 4.1 Đã kiểm chứng

- Chuỗi kiểm tra `deserialize` (`core.mjs:461-470`): format/version → `checksum` của body → `contentVersion` → replay → `stateHash`. Test: cắt bớt decisions → checksum (`engine.test.mjs:192`); đổi content → content version (`:195`); checksum hợp lệ nhưng decision không thể đi → "not available" (`:197-198`); CLI `--load` file bị sửa → "checksum" (`launch.test.mjs:74-75`); Session round-trip (`session.test.mjs:119-128`).
- Thí nghiệm thêm: save có khóa `__proto__` → load bình thường, `Object.prototype` không bị ô nhiễm (`sortKeys` tạo object mới, gán `out["__proto__"]` chỉ đổi prototype của object tạm); `decisions` không phải mảng → ném (qua replay); hai lần `replay` khi load (`deserialize` + `new Session`) chỉ tốn ~2×47 ms.

### 4.2 Đánh giá FNV-1a 64 (non-cryptographic)

**Chấp nhận được cho MVP offline một người chơi**, vì:
1. Decision log được **xác thực bằng replay** (`replayPolicy` `:398, 404, 407` + `fireEvent` `:210`): một save giả chỉ load được nếu nó mô tả một ván chơi hợp lệ — tức là thứ người chơi có thể tự chơi ra. Không có "cheat" nào vượt quá quyền của người chơi hợp lệ.
2. Hash phát hiện đúng những gì engine cần: hỏng file, sửa tay, content khác phiên bản, engine nondeterministic.

Hash **KHÔNG** bảo vệ trước (và tài liệu nên nói thẳng):
- **Giả mạo có chủ ý**: ai cũng tính lại được `checksum`/`stateHash` (thí nghiệm: serialize một ván khác bằng engine → load OK). Không có secret, không có chữ ký.
- **Collision**: 64-bit, non-crypto; dựng collision FNV là tầm thường. Không có ý nghĩa thực tế ở đây vì (1).
- **Thay thế content**: sửa `content/*.json` rồi tính lại `contentVersion` → save "hợp lệ" trên content đã sửa. Lại vô nghĩa vì người có quyền sửa content đã có mọi quyền.
- **Bất kỳ kịch bản nhiều người chơi / leaderboard / chia sẻ save như bằng chứng** — nếu sau MVP có nhu cầu này cần HMAC với secret phía server, không phải FNV.

### 4.3 Finding

**M-2 · MEDIUM · `contentVersion` băm toàn bộ text → mọi sửa lỗi chính tả làm chết toàn bộ save** — `content.mjs:15` băm cả 8 file nguyên vẹn (kể cả `summary.vi`, epilogue text). Kịch bản: sửa một dấu trong `epilogues.json` → mọi save của người chơi (cả 4 slot localStorage + file export) bị từ chối với "content version ≠" (`core.mjs:465`), không có đường cứu. Trong giai đoạn còn chỉnh text sau MVP, đây là rủi ro sản phẩm thật. Sửa (một trong hai, đều nhỏ): (a) băm *bản semantic* — strip mọi `LocalizedText` (`vi/en`) và `description/note/foreshadow` trước khi hash, giữ hash text riêng chỉ để cảnh báo; hoặc (b) khi `contentVersion` lệch, vẫn replay và chấp nhận nếu `stateHash` khớp (tức thay đổi content không chạm ván này), chỉ từ chối khi replay lệch — kèm thông báo "save từ phiên bản cũ, đã kiểm chứng lại".

**L-3 · LOW · `segment`/`ending` trong save là trang trí, không được đối chiếu với state replay** — `core.mjs:466-468` chỉ dùng `body.ending` để kiểm tra "incomplete", không so `body.segment === st.segment` hay `body.ending === st.ending`. Thí nghiệm: `segment: 99` + checksum tính lại → load OK. Hệ quả nhỏ: `app.mjs:28` hiển thị "(đã kết thúc)" từ `v.ending` của file chứ không từ state. Sửa: hai `assert` sau replay.

---

## 5. Information isolation

### 5.1 Đã kiểm chứng

- `playerView` (`projection.mjs:159-171`) chỉ chứa: bands (không số), `npcs[].status`, beliefs của người chơi (`:114-126` — không có `cause`, không `misinformation`; `believedValue` là **niềm tin của chính người chơi**, không phải truth; `uncertain` chỉ đánh dấu méo nhận thức, không nói đúng/sai), tags của người chơi, journal, ending id. Test LEAK (`session.test.mjs:15-32`) quét JSON của view ở mọi 7 quyết định trên toàn corpus; tôi quét lại thủ công một view ở cuối ván: không có `flags`, `knowledge`, `trustToPlayer`, `misinformation`, `cause`.
- `prompt()` (`session.mjs:35-50`): observations đã lọc theo role + `when`, choices đã lọc `available`; không có `consequences`, không có `grants`.
- Hai UI chỉ render `Session.view()` (`app.mjs:41-76`, `play.mjs:23-68`); `esc()` được áp dụng cho mọi chuỗi kể cả label save và nội dung file import (`app.mjs:8, 28`).
- Phân biệt với `scripts/trace.mjs` và `snapshot()` (`core.mjs:441-448`, in trust): đó là công cụ dev, không được import bởi UI.

### 5.2 Finding

**L-4 · LOW · `epilogue.npcs[].actions` lộ id NPC action qua `view()`** — `projection.mjs:194` trả về danh sách `A_*` mà NPC đã thực hiện (ví dụ `A_MAI_SEARCH_DORM`, `A_THACH_RAID_WHERE_I_BELIEVE`). Hai UI hiện **không render** trường này, nhưng nó nằm trong `Session.view()` và trong `types.ts:674 Epilogue`. Đây là tiết lộ hậu-kết (post-game reveal) của hành vi NPC ẩn, không phải truth value — có thể là ý đồ (NPC card). Quyết định cần ghi rõ: hoặc bỏ khỏi projection (giữ cho `scripts/trace.mjs`), hoặc ghi vào GDD là "epilogue được phép lộ hành động NPC". Tương tự, `prompt().trigger === 'scheduled'` (`session.mjs:49`) lộ việc một event do rule ẩn lên lịch; UI không dùng.

**NOTE (thiết kế, cần PO xác nhận chứ không phải lỗi) · 24 gate hướng người chơi đọc state ẩn** — quét `preconditions` của optional events và `available` của choices: 24 điều kiện đọc `trust` (Đức, Mai, Vũ, Thạch) hoặc flag không công khai (ví dụ `EV_O_D6M_THACH_OFFER/accept` chỉ hiện khi `trust thach ≥ x`; `EV_C_D2A_DUC_CONFIDES` chỉ được mời khi `trust duc ≥ x`). Việc **một lựa chọn có xuất hiện hay không** là kênh nhận thức ngầm về trust. Đây là mẫu "gated choice" chuẩn trong GDD và hợp lý về diegesis (Đức có tâm sự hay không là điều người chơi *thấy*), nhưng nên được ghi thành nguyên tắc: "sự hiện diện của option là tín hiệu diegetic hợp lệ; con số trust thì không bao giờ". Visibility contract hiện chỉ áp cho NPC đọc state (`types.ts:427-436`), chưa có mệnh đề tương ứng cho người chơi.

**NOTE · Isolation là hợp đồng UI, không phải ranh giới bảo mật** — browser tải thẳng `/content/truth.json` và giữ toàn bộ `GameState` (trust, NPC knowledge, flags) trong bộ nhớ của tab; ai mở DevTools đều đọc được. Với game offline một người chơi đây là chấp nhận được và nhất quán với docs/05 F-03 (vấn đề là *UI* không được rò, không phải *máy* không được chứa).

---

## 6. Browser / server

### 6.1 Đã kiểm chứng (server trên cổng tạm, 18 probe)

- Bind `127.0.0.1` (`server.mjs:16`; `launch.test.mjs:24`).
- Traversal: `/src/%2e%2e/package.json`, `/src/..%2Fpackage.json`, `/src/web/%2e%2e/%2e%2e/package.json`, `/src/./../package.json`, `/src/web/..\..\package.json`, `/src/engine/../../tests/corpus.mjs`, `/%2Fsrc/web/index.html` → tất cả 404 (decode trước, chặn `..`, `normalize` + `startsWith(ROOT)` với `ROOT` kết thúc bằng `/` — `server.mjs:19-23`). Probe `//src/../package.json` trả 200 `text/html` **nhưng** body là `index.html`: fetch client chuẩn hóa thành `//package.json`, server parse protocol-relative → pathname `/` → index. Không phải traversal.
- MIME: `.html/.mjs/.js/.json/.css/.svg/.md/.txt` đúng; `cache-control: no-store` tránh module cũ sau khi sửa code.
- Module graph browser: `app.mjs → content.mjs → hash.mjs`, `app.mjs → session.mjs → core.mjs/projection.mjs`; không có module nào import `node:`; `evaluator.mjs` (có `node:fs`) không nằm trong graph browser. `fetchContent(new URL('../../content/', import.meta.url))` từ `/src/web/app.mjs` → `/content/` ✓ nằm trong `ALLOWED`.
- `structuredClone`, BigInt, optional chaining, `??`: có trên mọi browser từ 2022.
- localStorage: mỗi lần `pick/choose` thành công ghi slot `auto` (`app.mjs:54, 59`); save chỉ là decision list (~1-3 KB) nên không chạm quota; `readSlot` bọc try/catch (`:14`); file import đi qua `Session.fromSave` nên bị kiểm chứng như file CLI (`:36-39`).

### 6.2 Finding

**L-5 · LOW · Save localStorage không có vòng đời** — (a) không có nút xóa slot; sau khi content đổi (xem M-2) các slot vẫn liệt kê ở màn chọn vai và mỗi lần bấm chỉ hiện "Không tải được save: content version…" vĩnh viễn; (b) slot `auto` bị ghi đè ngay ở nước đi đầu của ván mới ("Bắt đầu lại / đổi vai" `app.mjs:75`) — người chơi mất autosave ván trước mà không được hỏi; (c) `ROLE_LABEL[v.role]` với file hỏng in "undefined" (`app.mjs:28`). Sửa: nút xóa slot; khóa slot kèm `contentVersion` (`the-compound:save:<ver>:<slot>`); hỏi trước khi ghi đè `auto` nếu ván cũ chưa kết thúc.

**NOTE · Mã trạng thái HTTP lệch, vô hại** — `/src/web/index.html/` (ENOTDIR), `/content/%00`, `/%ZZ` (URIError) → 500 thay vì 404 (`server.mjs:29-30` chỉ map ENOENT); `.ts` phục vụ dưới `application/octet-stream`; mọi method kể cả POST đều được phục vụ. Server chỉ nghe loopback, chỉ serve `/src/` và `/content/`, không có endpoint ghi → không có tác động an ninh. Có thể map thêm `ENOTDIR`/`URIError` → 404 và từ chối method ≠ GET/HEAD nếu muốn sạch.

---

## 7. Bảo trì / drift giữa `types.ts` và JS

`types.ts` parse được bằng `node --experimental-strip-types` và `ENGINE_ORDERING`, `BELIEF_RANK`, `TOTAL_SEGMENTS` trùng `core.mjs` (so sánh bằng script). Không có `tsc` trong môi trường và không có cơ chế nào ràng buộc JS với `types.ts` (không `// @ts-check`, không JSDoc `@type`), nên drift chỉ phát hiện bằng mắt. Những chỗ đã lệch:

**M-3 · MEDIUM · `types.ts` mô tả sai state/save/content thực tế** (gom lại, sửa ~20 dòng):
| Vị trí | `types.ts` | Thực tế trong JS |
|---|---|---|
| `types.ts:516` `GameState.meta.saveVersion: 1` | 1 | `core.mjs:62` ghi `2`; `SaveFile.saveVersion: 2` (`types.ts:544`) tự mâu thuẫn với GameState |
| `types.ts:132-140` `Belief` | không có `misinformation` | `core.mjs:57, 148` lưu `misinformation` trong belief record — đây chính là trường **không được rò**, càng cần khai báo (với ghi chú "engine-internal, never projected") |
| `types.ts:577-589` `ContentBundle` | thiếu `contentVersion`, `playerInitial`, `epilogues`, `engineOptions` | `content.mjs:15-28` có cả bốn; `core.mjs:60, 278` đọc `playerInitial`, `engineOptions` |
| `types.ts:606-617` `EngineApi` | `availableEvents/choose/advance` trả state mới (pure) | engine thật là `start/runSegment/apply/evaluate/replay` mutate tại chỗ; `choose`/`advance` không tồn tại. Nên thay bằng chữ ký thật hoặc đánh dấu rõ "historical Phase 2 sketch, superseded by core.mjs" |
| `types.ts:194` `Cmp` | 5 toán tử | engine nhận 6 (L-2) |
| `types.ts:298` `GameEvent.order` "default = file order" | | engine: default 0 rồi `id` (`core.mjs:226`) |
| `types.ts:593`, `tests/corpus.mjs:3` | tham chiếu "docs/08" | `docs/08*` không tồn tại |
| `tests/consistency.test.mjs:404` "five enumerated kinds" | 5 | `CausalOrigin` có 8 kind (`types.ts:173-181`); test chỉ kiểm tra container tĩnh nên không sai, nhưng tên test gây hiểu lầm |

Đề xuất bền vững hơn: thêm `// @ts-check` + `/** @typedef {import('./types.ts').GameState} GameState */` vào `core.mjs`/`session.mjs`/`projection.mjs` và một test chạy `node --experimental-strip-types` import `types.ts` để so `ENGINE_ORDERING`/`RANK`/`TOTAL_SEGMENTS` (hiện tôi làm thủ công; biến nó thành test là 10 dòng).

**L-6 · LOW · Hiệu năng không mở rộng (ghi nhận, không cần sửa cho MVP)** — `transact` clone cả `mutationLog` ở mỗi bước (`core.mjs:164`) và `Session` replay từ đầu ở mỗi call. Với 21 segment đo được ≤ 51 ms/click. Nếu sau MVP kéo dài ván hoặc thêm nhiều rule/propagation, hai điểm sửa rẻ là: (a) `Session` giữ state đã commit và chỉ chạy tiếp (`runSegment` với `replayPolicy` của phần đuôi) — vẫn deterministic vì replay là hàm thuần; (b) snapshot trong `transact` chỉ các phần có thể bị ghi (`player`, `npcs`, `flags`, `queue`, `ending`) + độ dài các log để `splice` khi rollback, thay vì clone toàn bộ.

---

## 8. Definition of Done — từng mục

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| 2 vai chơi được | ✓ | `node src/cli/play.mjs --auto --role captive` (18 quyết định, E_TRANSFER) và `--role operator` (21 quyết định) chạy, in journal + epilogue + hash; `launch.test.mjs:61-77` chơi tương tác qua stdin |
| 5 NPC tự hành | ✓ | `NPC_IDS` 5 (`core.mjs:26`); bước 6a' chạy mỗi convergence; test ZERO-PLAYER yêu cầu ≥10 mutation NPC không cần người chơi và `A_THACH_RAID_WHERE_I_BELIEVE` fire (`engine.test.mjs:220-233`); CONFLICT tests chứng minh 3 NPC tranh cùng tài nguyên |
| Mô phỏng 7 ngày | ✓ | 21 segment (`TOTAL_SEGMENTS`), `E_TRANSFER` là `always` tại seg 20 nên mọi ván kết thúc (in ra từ `endings.json`) |
| 4 ending đạt được | ✓ | `session.test.mjs:71-83`: 8 playthrough qua Session (4 ending × 2 vai) — ending đúng, epilogue có text |
| Deterministic replay | ✓ | `engine.test.mjs:76-111` (toàn corpus + >500 prefix + reversed content); thí nghiệm riêng §2 |
| Save/load | ✓ | `engine.test.mjs:172-199`, `session.test.mjs:119-128`, `launch.test.mjs:61-77`; browser: 3 slot + auto + export/import |
| Test pass | ✓ | 108/108, 38,6 s |
| Chạy local | ✓ | `node src/server.mjs` → 127.0.0.1:8787; `launch.test.mjs:20-38` + probe thủ công §6 |

Không có mục DoD nào bị chặn.

---

## 9. Verdict

**MVP architecture: ACCEPT WITH FIXES.**

Bắt buộc trước khi chấp nhận (tổng < 30 dòng code + chú thích):
1. **M-1** — `Session.choose()/pick()` chỉ commit `decisions/state/request` sau khi replay thành công; kèm 1 test.
2. **M-3** (phần sai sự thật) — `types.ts`: `GameState.meta.saveVersion: 2`; thêm `misinformation?: true` vào `Belief` với ghi chú engine-internal; bổ sung `contentVersion`, `playerInitial`, `epilogues`, `engineOptions?` vào `ContentBundle`; đánh dấu `EngineApi` là bản phác thảo đã bị thay thế hoặc viết lại theo `core.mjs`.
3. **L-2** — xóa `'<<='` khỏi `core.mjs:31`.

Nên làm ngay sau (không chặn): **M-2** (contentVersion semantic hoặc fallback "replay rồi so stateHash"), **L-3** (đối chiếu `segment/ending` khi load), **L-4** (quyết định về `epilogue.npcs[].actions`), **L-5** (vòng đời slot localStorage), **L-1** và các chú thích lệch ở §1.3/§7.

Tôi xác nhận: không tìm thấy nguồn nondeterminism nào còn sót; không tìm thấy đường nào để một exception để lại world-state nửa vời ở tầng engine; không tìm thấy đường nào từ `Session.view()/prompt()` hay hai UI rò truth value, NPC knowledge, số trust, hidden flag hay attestation `misinformation`.

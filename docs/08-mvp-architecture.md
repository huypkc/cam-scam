# THE COMPOUND — KIẾN TRÚC MVP (runtime như đã triển khai)

Ngày: 2026-10-13 · Trạng thái: MVP hoàn tất theo chỉ thị PO "AUTONOMOUS MVP COMPLETION" · Phạm vi: mô tả **những gì đang chạy**, không phải đề xuất. Tài liệu Phase 2 (`docs/02`) và Phase 3 (`docs/06`) được giữ nguyên làm hồ sơ lịch sử; nơi hai bên khác nhau, tài liệu này là đặc tả hiện hành.

---

## 0. Bản đồ runtime

```
content/*.json ──► src/engine/content.mjs  buildContent(raw) → ContentBundle (+ contentVersion = hash mọi file)
                        │
                        ▼
                 src/engine/core.mjs      ENGINE (không import Node): start · evaluate · apply · transact ·
                        │                 runSegment · convergence · policies · run · replay · serialize/deserialize
                        ▼
                 src/engine/session.mjs   SESSION: state = replay(content, role, decisions); prompt/choose/pick/view/save
                        │
                        ▼
                 src/engine/projection.mjs PLAYER VIEW: band stat, beliefs, tags, journal, epilogue — không có truth value
                        │
          ┌─────────────┴─────────────┐
   src/cli/play.mjs             src/web/app.mjs + index.html   (phục vụ bởi src/server.mjs, 127.0.0.1 only)

src/engine/evaluator.mjs  = entry Node (loadContent từ đĩa + re-export core)     src/engine/hash.mjs = canonical JSON + FNV-1a 64
src/engine/types.ts       = hợp đồng kiểu (tài liệu; không build step)
```

Ràng buộc giữ nguyên từ Phase 2/3: **zero runtime dependency**, Node ≥ 22, ESM `.mjs`, content là JSON với Condition AST, không RNG, không truy cập mạng, server chỉ bind loopback.

---

## 1. Vòng đời một segment (như triển khai trong `core.mjs: runSegment`)

```
segment s
  1. background[s]           sắp theo (order, id); effects + playerEffects[role]            — mỗi occurrence là một transact
  2+3. forced + scheduled    "due" = forced có slot s ∪ queue{at == s}; sắp theo (order ?? 0, forced trước scheduled, id)
                             queue được rút TRƯỚC khi bắn (scheduled không đủ precondition → actionLog 'scheduled-skipped')
                             mỗi event là một transact: observations (grant) → firedEvents → choice → consequences
  4. optional ≤ 1            danh sách = optional có slot s, playable, sắp theo id; policy chọn hoặc null
                             quyết định {k:'o'} COMMIT RIÊNG (transact) rồi event được bắn (transact riêng)  ← MVP
  5. ending check            endings sắp theo priority; ending đầu tiên đúng tại s ∈ checkAt → endGame và dừng ngay
  6. convergence
     6a  propagation         sắp theo (priority, id); assert (at, when) / relay (facts với acquiredAt ≤ s − delay, tags)
     6a' NPC actions         sắp theo (priority, id); ≤ 1 action / actor / pass; actor 'gone' không hành động
     6b  delayed rules       sắp theo (priority, id); once; rules bị `supersedes` bởi action đang nạp thì bỏ
     6c  clamp               stat [0,100], trust [−3,3] (đã clamp per-mutation; 6c vô hại)
  7. s := s + 1
```

Khác với đặc tả Phase 2 §4: (i) bước 2 không còn "theo thứ tự khai báo" — trường `order` là bắt buộc khi hai forced event cùng slot và cùng vai (test ORDER); (ii) thứ tự scheduled queue được định nghĩa bằng `order` rồi id, không phải thứ tự rule bắn (audit O12); (iii) propagation có `priority` tường minh (audit O13, gate T-O2); (iv) có bước 6a' (Phase 3); (v) quyết định optional commit trước event (xem §3).

**Atomicity.** `transact(st, fn)` chụp `structuredClone` trước mỗi bước và khôi phục nguyên trạng nếu `fn` ném. Bước lồng nhau (event trong optional) vẫn đúng vì snapshot ngoài bao snapshot trong. Hệ quả: một lỗi bất biến (vd. grant OBSERVED với giá trị sai) không bao giờ để lại nửa thế giới (test ATOMIC ×4).

**`apply()` là cửa mutation duy nhất.** Mọi consequence (kể cả của engine: endGame) đi qua đây, mang `CausalOrigin`, ghi `mutationLog`. Quy tắc: belief không bao giờ hạ bậc, bằng bậc = no-op (F-11); OBSERVED/CONFIRMED sai giá trị → ném; `npcTag` **idempotent** (NPC đã có tag thì giữ lần đầu, không log) — MVP; `schedule` chỉ về tương lai; `flag` phải thuộc `values` khai báo.

---

## 2. State, replay, save

`GameState` = `{ meta, segment, player, npcs, flags, firedEvents, firedRules, firedPropagations, firedActions, propagationLog, queue, mutationLog, actionLog, decisions, ending }`. **WorldTruth không nằm trong state** và được `deepFreeze` khi `start()` (T06).

**Replay là nguồn sự thật.** Một run là hàm thuần của `(content, role, decisions)`:
- `decisions` = danh sách `{k:'c', e, c}` (choice) và `{k:'o', e|null}` (optional pick) theo thứ tự engine hỏi;
- `replayPolicy` chỉ chấp nhận đúng thứ engine đang hỏi (sai event/sai choice/sai loại → ném, không ép);
- hết decisions giữa chừng → `NeedInput` → bước dở bị rollback → trả `{st, complete:false, request}`; `st.decisions` đúng bằng prefix đã dùng (test REPLAY prefix: 677 prefix/corpus).

**Save** = `{format, saveVersion:2, contentVersion, role, segment, ending, decisions, stateHash, checksum, savedAt, label}`. `deserialize` kiểm: format → checksum (FNV-1a 64 của body) → contentVersion → replay → so `stateHash`. Save không chứa state, nên không thể "sửa save để có điện thoại": chỉ có thể sửa decisions, và decisions phải là thứ engine thực sự đã đề nghị. FNV-1a không phải mã hóa: nó phát hiện hỏng/chỉnh sửa vô ý, **không** chống người chơi cố tình tự viết save hợp lệ (chấp nhận cho single-player offline; Q5).

`stateHash` loại `meta.createdAt`; `contentVersion` là hash mọi file content → đổi content là save cũ vô hiệu (Q5, chấp nhận).

---

## 3. Session (lớp tương tác)

`new Session(content, role, decisions=[])` → mỗi `choose/pick` append một decision rồi **replay lại từ đầu** (`_refresh`). Ưu điểm: UI không thể làm hỏng state; save/load/replay là cùng một cơ chế; "trôi thời gian" là ngầm (segment không có gì để hỏi tự chạy, NPC vẫn hành động). Chi phí: O(n) mỗi thao tác với n ≤ ~35 decision, 21 segment — đo được ~30–60 ms/replay trên content hiện tại; chấp nhận cho MVP.

`prompt()` trả `{kind:'choice'|'optional'|'ended', ...}`. Với `choice`, Session **preview** event đúng như engine sẽ bắn: clone state, áp observation grants, rồi tính `availableChoices` — nên choice list trong prompt luôn bằng choice list lúc bắn (test PROMPT).

**Vì sao optional pick commit riêng.** Trước MVP, pick và event mở ra commit chung; cắt decision log ngay sau pick thì replay rollback cả pick → `st.decisions` ngắn hơn prefix → save lệch, replay báo "expected optional pick". Nay pick commit trước; nếu choice chưa có, request = `choice` cho chính event đó (prompt `kind:'choice', trigger:'optional'`), save tại điểm đó giữ đúng mọi quyết định đã làm (test REPLAY prefix, SAVE/LOAD, SAVE/LOAD via Session).

---

## 4. Projection — hợp đồng cô lập tri thức

`playerView()` chỉ đọc: `st.player` (stat → band, beliefs, tags), `st.npcs[*].status` (quan sát vật lý), `st.actionLog` (journal), `st.ending`, và **text** từ content (statement của fact, label của choice, summary/observation của event). Không bao giờ đọc `truth.facts[*].value`, `npcs[*].knowledge`, `trustToPlayer`, `flags`, `misinformation`. Belief hiển thị = `{factId, statement, status, believedValue, uncertain, source, acquiredAt}` — người chơi thấy mình tin gì, **không** thấy đúng/sai (F-03). Test LEAK quét view JSON ở mọi bước của mọi run corpus + regex trên source của projection/session/app/cli.

Epilogue = hàm thuần của state cuối (`content/epilogues.json`, Condition AST, variant đầu tiên khớp thắng; mỗi ending và mỗi NPC bắt buộc có fallback `always` cho cả hai vai — gate EPILOGUES).

---

## 5. Giả định đã được phê chuẩn bởi chỉ thị 2026-10-13 (`ENGINE_ORDERING`)

| # | Giả định | Nguồn | Giá trị |
|---|---|---|---|
| F-09 | Stat khởi điểm theo vai nằm trong content | `flags.json: playerInitial` | captive/operator khai báo; fallback 0/0 chỉ khi thiếu |
| F-08 | Clamp | per-mutation | `[0,100]` stat, `[−3,3]` trust |
| F-11 | Belief bằng bậc | no-op (không log) | `acquiredAt` của relay = segment đến |
| O12 | Scheduled queue | `order` rồi forced-trước-scheduled rồi id | file/queue order không bao giờ được tham chiếu |
| O13 | Propagation | `(priority, id)` | gate T-O2 bắt buộc `priority` là số nguyên |
| F-12 | Zero-player | `defaultChoice` khai báo trong content | gate DEFAULTS: mọi event có choice phải có default hợp lệ cho từng vai |
| Q2 | Hai forced cùng slot | `order` bắt buộc | test ORDER (engine.test) |
| Q5 | Save | decisions + hash, `contentVersion` khóa | đổi content → save vô hiệu |
| Q1/Q6/Q7 | PC kia = nhánh `role`; trust một chiều; fact bất đối xứng | giữ như Phase 2 | — |
| MVP | Optional pick commit riêng; `npcTag` idempotent | §3, §1 | — |
| MVP | `allowReadBeforeWrite` (audit §12 T-G) | `npc.intents.json` | 5 cặp, mỗi cặp phải value-disjoint (test tự kiểm), có `why`, không được thừa |
| Review L-06/F-22 | `duc.scapegoated` ⇔ Thạch **đã hành động** (lục trần có lý do → cách ly Đức → `EV_S_D5A_DUC_TAKEN`) | `A_THACH_RAID_WHERE_I_BELIEVE` là writer duy nhất còn sống | `blame_duc`/`name_duc` chỉ cho Thạch một RUMOR; một cái tên không kèm bằng chứng không dẫn tới hành động |
| Review M-1 | Session chỉ giữ decision khi replay thành công | `session.mjs: _commit` | decision bị engine từ chối không bao giờ làm hỏng session |
| Review L-3 | Save header (`segment`, `ending`) được đối chiếu với kết quả replay | `core.mjs: deserialize` | — |
| Review L-4 | Epilogue card không mang action id | `projection.mjs` | view chỉ chứa text + status |

---

## 6. Gate tĩnh trên content (tests/content-gates.test.mjs) ↔ phát hiện audit

| Gate | Bảo vệ | Audit |
|---|---|---|
| T-O1 | `playerInitial` cho cả hai vai | F-09 |
| T-O2 | priority số nguyên cho propagation/rules/actions | O13 |
| DEFAULTS | `defaultChoice` hợp lệ theo vai | F-12 |
| T-B | gate STRESS/SUSPICION trong tầm với tĩnh theo vai/segment; ngưỡng `uncertainAboveStress` đạt được | F-02, F-23 |
| T-D | mọi flag/tag mà precondition/choice đọc có producer chạy trước (theo order forced/scheduled/optional) | F-05 |
| T-F | mọi giá trị flag được đọc hoặc khai `terminal` | F-06 |
| T-G | write-before-read trong một pass convergence, trừ cặp khai báo + value-disjoint | F-14 |
| T-M | observation không đọc flag/tag mà choice cùng event ghi | F-13 |
| T-I2 | kiểu: `misinformation` chỉ `true`; `uncertainAboveStress` chỉ cho player; `once` boolean | F-17 |
| EPILOGUES | tham chiếu hợp lệ, fallback đủ, từ cấm (Gate G/D9) | — |
| VISIBILITY | flag NPC đọc phải `visibleTo` NPC đó; `visibilityExceptions = []` | G3 |

---

## 7. Giao diện

**CLI** (`node src/cli/play.mjs`): tương tác (chọn vai, số để chọn, `s` lưu vào `saves/` hoặc `--save-dir`, `j/b/n` xem sổ/belief/người, `q` thoát), `--load file` (replay-verified), `--auto --role r [--policy]` (zero-player), `--script file.json` (replay decision list). Đọc stdin qua hàng đợi dòng nên chạy được cả khi stdin là pipe (test CLI interactive).

**Web** (`node src/server.mjs` → `http://127.0.0.1:8787/`): server tĩnh chỉ phục vụ `/src/` và `/content/`, chặn `..`, MIME đúng cho `.mjs`. `app.mjs` import cùng `content.mjs/session.mjs/projection.mjs` như Node (không build), render `Session.view()`; save vào `localStorage` (auto + 3 ô) và export/import file JSON; save file tương thích với CLI (cùng `serialize`).

---

## 8. Giới hạn còn lại (trung thực)

- Corpus = 24 scenario + 8 witness path + 2 zero-player; "0 vi phạm" là 0 **trên corpus**, không phải BFS toàn không gian quyết định. Gate COVERAGE bảo đảm mọi event × vai bắn ít nhất một lần; choice coverage ≥ 60 % (hiện 89/131 ≈ 68 %), phần còn lại chưa có run kịch bản.
- `npcStatus = gone` được khai báo nhưng không content nào ghi (review L-17); card Đức "không còn ở tầng này" là dự phòng.
- Thế giới có thể đổi mà không để lại dấu vết trong Sổ ghi nhớ (review L-07: Thạch lấy máy trên trần đêm D4 không có lý do quy tội; Linh nộp máy sáng D5 chỉ hiện qua band SUSPICION). Đây là quyết định phạm vi: thêm event "gọi lên"/"khe trần trống" là content mới, để PO quyết.
- Save chống hỏng/chỉnh sửa vô ý; không chống người cố tình (FNV-1a, không chữ ký).
- `types.ts` là tài liệu, không type-check trong pipeline (không có tsc trong môi trường zero-dependency).
- Session rebuild toàn bộ mỗi thao tác (đủ nhanh cho 21 segment; không phù hợp nếu mở rộng lên nhiều tuần mà không thêm checkpoint).
- Cân bằng ngưỡng stat (Q4) chưa được tinh chỉnh bằng playtest người thật.
- Tiếng Việt là ngôn ngữ duy nhất của content; `LocalizedText` sẵn sàng cho ngôn ngữ khác nhưng chưa có bản dịch.

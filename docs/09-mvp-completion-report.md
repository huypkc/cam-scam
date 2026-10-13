# THE COMPOUND — BÁO CÁO HOÀN THÀNH MVP

Ngày: 2026-10-13 · Gửi: Product Owner (Huypkc) · Chế độ: AUTONOMOUS MVP COMPLETION (chỉ thị PO cùng ngày) · Workspace: `/root/working` (không phải git repo; toàn vẹn qua `docs/mvp-checksums.txt`).

---

## 0. Trạng thái MVP: **HOÀN THÀNH — mọi tiêu chí Definition of Done được kiểm chứng bằng mã chạy được.**

| Tiêu chí DoD | Kết quả | Bằng chứng (tái tạo được) |
|---|---|---|
| 2 vai chơi được (Captive, Operator) | ✅ | CLI + web; `docs/07` §2: 34 run, cả hai vai đều tới ending |
| 5 NPC tự hành động | ✅ | `docs/07` §4: Thạch/Vũ/Mai/Linh/Đức mỗi người có action đã bắn trong corpus; zero-player vẫn có 10–16 mutation do thế giới tự tạo |
| Mô phỏng 7 ngày (21 segment) | ✅ | mọi run kết thúc bằng ending; CHUYỂN GIAO/ĐẢO VAI tại D7 đêm, PHƠI BÀY D7 sáng, THOÁT D6 đêm (theo thiết kế) |
| 4 ending đạt được cho cả hai vai | ✅ | `docs/07` §3: 8 witness path chạy qua Session API, trace từng segment (mục 2 dưới) |
| Replay tất định | ✅ | test REPLAY (mọi prefix của 34 decision log = điểm commit hợp lệ), ORDER (đảo thứ tự mọi mảng content → kết quả y hệt) |
| Save/load | ✅ | 861 save (mọi prefix của mọi run) round-trip qua `serialize → deserialize` và `Session.fromSave`, view JSON giống hệt; save giả/sửa bị từ chối có lý do |
| Test pass | ✅ | **117/117**, 0 skip, 0 todo (`node --test tests/*.test.mjs`) |
| Chạy local | ✅ | `tests/launch.test.mjs`: server bind 127.0.0.1, phục vụ đúng module graph, chặn traversal; CLI auto/script/interactive/load |
| 2 review nội bộ | ✅ | `docs/reviews/mvp-architecture-review.md` (ACCEPT WITH FIXES → đã sửa), `docs/reviews/mvp-logic-review.md` (ACCEPT WITH FIXES → đã sửa) |
| Báo cáo tiếng Việt | ✅ | tài liệu này |

Lệnh chạy local:

```
node src/cli/play.mjs                 # terminal, chọn vai; s = lưu, j/b/n = sổ/belief/người, q = thoát
node src/server.mjs                   # mở http://127.0.0.1:8787/  (chỉ loopback, không deploy công khai)
node --test tests/*.test.mjs          # 117 pass
node scripts/verify-mvp.mjs           # sinh lại docs/07-mvp-verification.md
sha256sum -c docs/mvp-checksums.txt   # kiểm toàn vẹn
```

Không cần cài gì: zero dependency, Node ≥ 22 (đã chạy trên v22.23.3).

---

## 1. Kết quả test thực tế

| File | Nội dung | Số test |
|---|---|---|
| `tests/consistency.test.mjs` | 21 bất biến tĩnh Phase 2 | 21 |
| `tests/intents.test.mjs` | visibility contract, Gate C | 10 |
| `tests/evaluator.test.mjs` | T01–T10, 24 scenario corpus, 8 witness path, sensitivity 6a/6b | 40 |
| `tests/content-gates.test.mjs` | gate tĩnh theo audit §12: T-B, T-D, T-F, T-G, T-M, T-I2, T-O1, T-O2, DEFAULTS, EPILOGUES, VISIBILITY | 11 |
| `tests/engine.test.mjs` | ATOMIC ×4, ORDER ×2, REPLAY ×3, IDEMPOTENT ×2, CONFLICT ×2, SAVE/LOAD ×2, COUNTERFACTUAL ×2, ZERO-PLAYER, COVERAGE, TYPES, INVARIANTS | 21 |
| `tests/session.test.mjs` | LEAK, PLAY, PROMPT, ENDINGS, EPILOGUE ×2, DISTORTION, SAVE/LOAD via Session, SESSION (M-1), PROJECTION | 10 |
| `tests/launch.test.mjs` | SERVER, CLI auto, CLI script, CLI interactive + load + tampered | 4 |
| **Tổng** | | **117 pass / 0 fail** |

Baseline đầu phiên: 103 test, 94 pass, 9 fail. Chín lỗi gốc và cách sửa:

| Test fail lúc đầu | Nguyên nhân gốc | Sửa |
|---|---|---|
| REPLAY, SAVE/LOAD (engine), SAVE/LOAD via Session | Quyết định chọn optional commit chung với event nó mở; cắt log ngay sau pick → replay rollback cả pick → save thiếu quyết định | `core.mjs: runSegment` bước 4: pick commit riêng (transact), event bắn sau (transact riêng) |
| IDEMPOTENT | `npcTag` cấp hai lần cho Linh (`tell` ở D2 đêm và D3 chiều) | `apply('npcTag')` idempotent: giữ lần đầu, không log lại |
| LEAK | Regex chống rò rỉ bắt từ `misinformation` trong **comment** của projection.mjs | sửa comment |
| T-G | Rule/action đọc `phone.location` chạy trước writer trong cùng pass (7 cặp) | `A_LINH_HANDS_PHONE_UP` priority 8→22; 5 cặp còn lại khai báo `allowReadBeforeWrite` (đúng đặc tả audit §12 T-G), test tự kiểm value-disjoint + không được thừa |
| T-M | Observation của `EV_S_D7M_RAID` đọc `operator.cooperationProof` mà choice `o_surrender` cùng event ghi (audit F-13/O11) | observation đọc tag `T_O_SENT_EVIDENCE_OUT` (tương đương ở mọi trạng thái đạt được — reviewer logic xác nhận) |
| EPILOGUES | `E_INVERSION` thiếu variant fallback cho Captive | thêm variant `always` |
| ORDER | 6 forced event thiếu `order` khi trùng slot (theo cách test đo) | thêm `order` (−5/5), giữ nguyên thứ tự hành vi hiện có |

Không test nào bị xóa, bỏ qua hay nới lỏng. Test T-G được **mở rộng** để hiện thực đúng cơ chế khai báo mà audit §12 đặc tả (và kiểm chặt hơn: value-disjoint, có `why`, không thừa). Thêm 10 test mới: REPLAY prefix (677→~900 prefix), COVERAGE (mọi event × vai phải bắn trong corpus), TYPES (types.ts ↔ core.mjs qua `--experimental-strip-types`), SESSION M-1, EPILOGUE L-4, SAVE header L-3, và 4 test launch.

---

## 2. Trace kiểm chứng bốn ending (tóm tắt; bảng từng segment đầy đủ trong `docs/07-mvp-verification.md` §3)

Mỗi path chạy qua `Session` (đúng đường UI đi), hash Session = hash engine, decision log được replay và save/load ở mọi prefix.

| Ending | Vai | Quyết định | Kết thúc | Hash state | Điểm nhấn của thế giới |
|---|---|---|---|---|---|
| **THOÁT** (`E_ESCAPE`) | captive | 20 | D6 đêm (seg 17) | `ff0e37524bace18f` | `S_D6N_ESCAPE:go`; Vũ không mở cửa (không đủ trust) nhưng đường trốn vẫn đạt khi không có Đức; corpus S9 chứng minh đường trốn **cùng Đức** (trust Vũ 2) |
| THOÁT | operator | 22 | D6 đêm (seg 17) | `89e2ac5c7a5d55c3` | nhận đề nghị của Thạch D6 sáng → có chìa khóa cửa sổ trốn |
| **PHƠI BÀY** (`E_EXPOSURE`) | captive | 26 | D7 sáng (seg 18) | `8fc209d8afcbebb5` | che Đức → giữ bí mật → tự lấy máy D4 chiều với SUSPICION thấp → gọi ra ngoài D5 → `R_EXPOSURE_RAID` |
| PHƠI BÀY | operator | 26 | D7 sáng (seg 18) | `b8c20a66cef8b3f7` | đối chất Mai → chép sổ nợ → nhận thỏa thuận → gửi bằng chứng → được nhận là "nguồn" khi cổng bị phá |
| **ĐẢO VAI** (`E_INVERSION`) | captive | 18 | D7 đêm (seg 20) | `8ee65b277198efc7` | Thạch tuyển (A_THACH_RECRUIT D5 chiều) → nhận deal D6 sáng → lên xe cabin |
| ĐẢO VAI | operator | 22 | D7 đêm (seg 20) | `c8335cfd8da808f6` | phá chỉ tiêu 5 lần → `operator.marked` → bị gọi lên D7 sáng → chấp nhận "hạ xuống" |
| **CHUYỂN GIAO** (`E_TRANSFER`) | captive | 18 | D7 đêm (seg 20) | `eeaf4e086f15c772` | thụ động: Linh báo tin D3 → thẩm vấn D4 → Đức kể Linh → Linh báo chỗ → Thạch lục trần (không quy ai vì chỉ biết chỗ) |
| CHUYỂN GIAO | operator | 21 | D7 đêm (seg 20) | `266c8cc61cebf757` | chuyển tin báo lên → Thạch có nghi phạm → Mai không dám tự lục → chuỗi Đức→Linh→Thạch, raid D4 đêm |

Ngoài witness path, corpus có 24 scenario kịch bản (S1–S13, O1–O8) phủ: Mai tự lấy lại máy (C2), Vũ che máy / nộp máy tùy trust, Đức tự gọi về nhà, Linh thành kênh phản gián, vạch mặt Linh, đưa tên Mai/Đức, Đức bị gọi lên ở cả hai vai, đổ cho Đức có/không có bằng chứng, "cơ hội cuối" D6.

---

## 3. Tính năng chơi được

**Hai vai, một thế giới.** Captive (bị giam) và Operator (quản lý) trải cùng 7 ngày, cùng world truth, khác hoàn toàn về thứ thấy được, chọn được và tin được. 49 event / 131 choice; 17 forced, 21 optional (≤ 1 mỗi segment), 11 scheduled (do rule/NPC đặt).

**Năm NPC có động cơ riêng.** 8 drive, 10 action chạy ở điểm hội tụ mỗi segment, chỉ đọc thứ NPC đó được phép biết (visibility contract kiểm tĩnh). Ví dụ emergent đã kiểm: Mai tự lục ký túc D4 chiều và lấy lại máy trước khi Linh kịp báo chỗ — chỉ khi Thạch chưa có nghi phạm và chưa ai hỏi cô "chị mất gì"; Vũ che máy cho Đức nếu người mới đã được Vũ tin (trust ≥ 2) hoặc Operator bảo giữ; Đức tự thử gọi về nhà nếu máy ở hốc sân và chưa ai dùng.

**Tri thức không hoàn hảo.** Người chơi thấy belief của mình (Tin đồn / Đã quan sát / Đã xác nhận, nguồn, thời điểm) nhưng **không bao giờ** thấy đúng/sai. STRESS cao làm méo quan sát (đánh dấu "không chắc"). SUSPICION/STRESS hiển thị theo dải chữ, không số.

**Sổ ghi nhớ, epilogue.** Journal dựng từ action log; epilogue = narrative ending theo vai + 1 card cho mỗi NPC, chọn theo state cuối (Condition AST).

**Lưu/tải.** CLI: `s` → file JSON vào `saves/` (hoặc `--save-dir`), `--load` kiểm chứng bằng replay. Web: auto-save + 3 ô `localStorage`, export/import file; file save dùng chung định dạng với CLI. Save = decision log + hash; sửa save → bị từ chối có lý do.

**Chế độ phụ.** `--auto` (zero-player: xem thế giới không có bạn), `--script` (replay decision list), `scripts/verify-mvp.mjs` (bằng chứng), `scripts/trace.mjs --out` (trace Phase 3).

---

## 4. Hai review nội bộ và cách xử lý

### 4.1 Review kiến trúc (`docs/reviews/mvp-architecture-review.md`) — ACCEPT WITH FIXES, không BLOCKER/HIGH

| # | Mức | Finding | Xử lý |
|---|---|---|---|
| M-1 | MED | `Session.choose/pick` push decision trước khi replay; nếu replay ném (invariant content) decision xấu ở lại, session hỏng vĩnh viễn | **Sửa**: `_commit(candidate)` — chỉ giữ decisions/state khi replay thành công; test SESSION M-1 |
| M-3 | MED | `types.ts` lệch JS (saveVersion 1≠2, thiếu `misinformation`, `ContentBundle` thiếu trường, `EngineApi` mô tả API không tồn tại) | **Sửa** types.ts theo code; test TYPES import types.ts bằng `--experimental-strip-types` và so hằng số với core |
| L-2 | LOW | op so sánh ma `'<<='` | **Sửa**: `cmp` ném với op lạ |
| L-3 | LOW | `deserialize` không đối chiếu header `segment/ending` | **Sửa** + test |
| L-4 | LOW | view epilogue lộ action id của NPC | **Sửa**: card chỉ còn text/status; test |
| M-2 | MED (khuyến nghị) | `contentVersion` hash toàn văn → sửa lỗi chính tả cũng vô hiệu save cũ | **Giữ** (Q5 đã chấp nhận); ghi ở §6 |
| L-5, L-6 | LOW | localStorage không có nút xóa; Session O(n²)/ván | **Giữ**, ghi ở §6 |

### 4.2 Review logic & content (`docs/reviews/mvp-logic-review.md`) — ACCEPT WITH FIXES, không BLOCKER

| # | Mức | Finding | Xử lý |
|---|---|---|---|
| L-01 | HIGH | `EV_S_D5A_DUC_TAKEN` không thể bắn cho Operator (`name_duc` cách ly Đức ngay → Đức không kể Linh → Thạch không biết chỗ) | **Sửa**: `name_duc` chỉ cho Thạch RUMOR; cách ly do raid. Scenario mới O7 chứng minh Đức bị gọi lên ở vai Operator; gate COVERAGE (mọi event × vai) |
| L-02 | HIGH | Card Mai/Linh/Đức "lên xe" đứng trước card `raid.happened` → sai trong PHƠI BÀY | **Sửa** thứ tự card + card mới "Mai bị cách ly rồi raid" |
| L-03 | MED | `o_report` không cho Thạch `F_PHONE_EXISTS`; card Thạch nói "không tìm ra máy" khi máy trong tay | **Sửa** cả hai (belief + card đọc trạng thái vật lý) |
| L-04 | MED | "Lên cùng xe với Đức" khả dụng khi Đức bị cách ly | **Sửa** điều kiện (present ∨ demoted) |
| L-06 | MED | Audit F-22: `blame_duc` đặt `duc.scapegoated` khi Đức vẫn present | **Sửa** (phương án b): flag chỉ do raid ghi; scenario S12/S12b |
| L-08 | MED | "Máy biến mất" bắn sau khi chính người chơi lấy máy rồi bị khám | **Sửa** điều kiện observation |
| L-09 | MED | Observation nói thẳng tin đồn sai trong khi grant RUMOR=true | **Sửa** text |
| L-05, L-13 | LOW | extra chết (`T_C_STALLED_THACH`), card Mai bị che, label `c_help` nhắc Linh đã bị đưa đi | **Sửa** |
| L-07 | MED (khuyến nghị) | Thế giới đổi không để lại dấu vết (Thạch lấy máy đêm D4; Linh nộp máy) | **Không sửa** — cần event mới (mở rộng phạm vi), xem §6 |
| L-10, L-11, L-20 | MED/NOTE | Quyết định thiết kế: Mai tự lấy lại máy không dẫn tới raid; tri thức `pressure/point_mai` chưa có reader; nhánh điện thoại Operator phễu qua verify→discredit | **Không sửa** — để PO quyết, xem §6 |
| L-12, L-14–L-19, L-21 | LOW/NOTE | text lệch nhẹ, `gone` chưa ghi, terminal thừa `linh`, lệch docs/01–02 | ghi nhận §6 |

Sau khi sửa, cả hai reviewer đã (trong phạm vi tự động) được tái kiểm bằng chính các repro họ đưa: 3 repro L-02, repro L-03, L-04, L-08 đều cho kết quả nhất quán; suite 117/117.

---

## 5. Thay đổi so với đầu phiên (tóm tắt)

**Engine** (`src/engine/core.mjs`): optional pick commit riêng; `npcTag` idempotent; `cmp` ném op lạ; `deserialize` đối chiếu header. **Session**: commit-on-success. **Projection**: card không mang action id; comment. **CLI**: đọc stdin qua hàng đợi dòng (chạy được qua pipe), `--save-dir`. **Server**: `/` redirect 302 sang `/src/web/index.html` để import tương đối của trang resolve trong root được phép (lỗi phát hiện khi chạy qua ngrok: `./app.mjs` → `/app.mjs` → 404); test launch nay tải thật mọi `<script src>` và import của app. **types.ts**: đồng bộ với code, thêm `Decision/InputRequest/Policy/EpilogueBundle/ReadBeforeWriteException`.

**Content**: `timeline.json` (order ×6; RAID obs đọc tag; `name_duc`/`blame_duc` bỏ scapegoated/isolated; `o_report` + belief; `c_with_duc` guard; PATROL2 obs guard; DUC_TAKEN obs text; `c_help` label), `epilogues.json` (E_INVERSION captive fallback; thứ tự card Mai/Linh/Đức; card Mai mới; Thạch card đọc flag; bỏ extra chết; text extra c_help), `npc.intents.json` (priority LINH_HANDS 22; `allowReadBeforeWrite` ×5).

**Tests**: +14 test (103 → 117), corpus +5 scenario (19 → 24), O6 kỳ vọng cập nhật theo hành vi emergent mới (Mai lấy lại máy trước). **Scripts**: `verify-mvp.mjs` mới; `trace.mjs --out`. **Docs**: 07 (sinh), 08 (kiến trúc MVP), 09 (báo cáo này), 2 review; README; `package.json` 1.0.0-mvp. Tài liệu Phase 1–3 và manifest cũ **không bị sửa** (phase3 manifest vẫn khớp cho mọi file docs; chỉ các file code/content đã tiến hóa là khác — đúng kỳ vọng).

---

## 6. Hạn chế còn lại (trung thực, chưa sửa)

1. **Corpus là mẫu, không phải toàn không gian.** 24 scenario + 8 witness + 2 zero-player; mọi event × vai được phủ, nhưng choice coverage = 89/131 ≈ 68 % (gate ≥ 60 %). "0 vi phạm" = 0 trên corpus.
2. **Thế giới đổi lặng (L-07).** Thạch lấy máy trên trần đêm D4 khi không có lý do quy tội, Linh nộp máy sáng D5 (+30 SUSPICION), raid hụt (+15) — không có event cho người chơi thấy. Cần 2 event mới; để PO duyệt vì là content mới.
3. **Quyết định thiết kế chờ PO (L-10, L-11, L-20).** Mai tự lấy lại máy → thế giới "im" (không raid); tri thức Operator từ `pressure/point_mai` chưa có reader; nhánh điện thoại Operator gần như chỉ mở qua `verify → discredit`.
4. **`npcStatus = gone` chưa bao giờ được ghi** (L-17); card dự phòng tồn tại.
5. **Save**: FNV-1a 64 phát hiện hỏng/sửa vô ý, không chống người cố tình viết save hợp lệ; `contentVersion` hash toàn văn nên mọi sửa content (kể cả chính tả) vô hiệu save cũ (Q5, M-2).
6. **Session O(n²)/ván** (replay từ đầu mỗi thao tác; ~45 ms ở cuối ván). Đủ cho 21 segment; cần checkpoint nếu mở rộng.
7. **`types.ts` không type-check trong pipeline** (không có tsc); chỉ hằng số được test đối chiếu.
8. **Cân bằng ngưỡng stat chưa playtest người thật** (Q4). Chưa có ngôn ngữ ngoài tiếng Việt.
9. **Lệch docs/01–02 với content** (L-19): vài câu trong GDD/kiến trúc Phase 2 mô tả cơ chế đã đổi (SUSPICION ≥ 70 gating, slot Linh offer). `docs/08` là đặc tả hiện hành; Phase 1–2 giữ nguyên làm lịch sử.

---

## 7. Điều kiện dừng đã đạt

Điều kiện A của chỉ thị ("All MVP acceptance criteria are verified") đạt với bằng chứng thực thi; không gặp điều kiện B (bảo mật/ủy quyền) hay C (blocker kỹ thuật). Không deploy công khai, không thao tác đặc quyền, không cài đặt hệ thống, không thêm dependency.

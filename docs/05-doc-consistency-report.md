# THE COMPOUND — BÁO CÁO KIỂM CHỨNG: SAI LỆCH "9 vs 10 FACT CHỈ OPERATOR XÁC NHẬN"

Ngày: 2026-10-12 · Người lập: Claude Fable · Đáp ứng: PHASE 2 DOCUMENTATION CONSISTENCY FIX
Phạm vi: chỉ tài liệu. **Không sửa content JSON, không sửa `types.ts`, không sửa test. Không bắt đầu Phase 3.**

## 1. Danh sách fact đủ điều kiện (10)

Tiêu chí: `truth.json` → `facts[id].confirmableBy` **đúng bằng** `["operator"]`.

| # | Fact ID | Category | Event cấp CONFIRMED cho player (tất cả role-exclusive Operator) |
|---|---|---|---|
| 1 | F_RAID_IMMINENT | background | EV_O_D5A_MAI_DEAL, EV_O_D6M_THACH_OFFER |
| 2 | F_PHONE_OWNER_MAI | identity | EV_O_D5A_MAI_DEAL, EV_O_D5A_PHONE_CONTENTS |
| 3 | F_BOSS_KNOWS_LEAK | background | EV_O_D3M_THACH_ORDER |
| 4 | F_SEARCH_IS_LEAK_HUNT | incident | EV_O_D3M_THACH_ORDER |
| 5 | F_LINH_RELEASE_IS_LIE | identity | EV_O_D4M_THACH_NAME |
| 6 | F_THACH_PLANS_OWN_EXIT | identity | EV_O_D6M_THACH_OFFER |
| 7 | F_MAI_HOLDS_DEBT_LEDGER | background | EV_O_D4A_LEDGER |
| 8 | F_DEBT_LEDGER_PROVES_COERCION | background | EV_O_D5A_MAI_DEAL |
| 9 | F_OPERATOR_PC_INDEBTED | identity | EV_O_D4A_LEDGER |
| 10 | F_TRUCK_DAY2_WAS_INVENTORY | incident | EV_O_D6M_THACH_OFFER |

Phân bố toàn bộ 29 fact theo `confirmableBy`: `["captive","operator"]` = 12 · `["operator"]` = 10 · `["captive"]` = 0 · `[]` (decoy) = 7.

## 2. Ngữ nghĩa đếm (đã kiểm chứng trước khi sửa)

- Định nghĩa trong `src/engine/types.ts` (`Fact.confirmableBy`): *"Roles for which some event grants CONFIRMED status. Decoys: always []. (tested)"*.
- Test 13 (Gate B, `tests/consistency.test.mjs` dòng 268–281) duyệt **mọi** container chứa consequence (event choice/observation, background, delayed rule, propagation), gom `belief{agent:'player', status:'CONFIRMED'}` theo vai của container, rồi `assert.deepEqual` với `confirmableBy` của từng fact không phải decoy.
- Nghĩa là `confirmableBy` **không phải khai báo tùy ý**: nó bị ép bằng tập vai thực sự có đường CONFIRMED trong content. Đếm độc lập bằng regex trên `timeline.json` + `rules.delayed.json` cho cùng kết quả: 10 fact, mỗi fact chỉ có event Operator cấp CONFIRMED, không fact nào có đường Captive.
- "OBSERVED" không tính. Ví dụ Captive có thể OBSERVED chữ ký "M." (F_PHONE_OWNER_MAI) nhưng không bao giờ CONFIRMED → fact đó vẫn là Operator-only theo đúng định nghĩa.

## 3. Nguồn gốc sai lệch: **tài liệu**, không phải dữ liệu

- Dữ liệu nhất quán nội bộ và được test ép (Test 13 pass với 10).
- `docs/02-phase2-architecture.md` dòng 36 ghi "9". Không có phép đếm hợp lệ nào trên content cho ra 9. Giả thuyết hợp lý (không chứng minh được): con số bị lẫn với **9 hàng** của bảng "chuỗi mắt xích" ở mục 6 cùng tài liệu.
- Timestamp: `truth.json` 20:00:53, tài liệu 20:04:31 — tài liệu viết sau khi content đã ổn định, nên là lỗi soạn thảo, không phải content đổi sau tài liệu.

## 4. Sửa

| File | Dòng | Trước | Sau |
|---|---|---|---|
| `docs/02-phase2-architecture.md` | 36 | 9 fact chỉ Operator xác nhận được | **10** fact chỉ Operator xác nhận được |
| `docs/03-phase2-checkpoint.md` | 75 (A3) | "Một trong hai sai; chưa xác định cái nào" | Đánh dấu **ĐÃ GIẢI QUYẾT**, trỏ tới báo cáo này |

## 5. Quét tham chiếu cũ khác (cùng tài liệu, cùng loại lỗi: số đếm vs nguồn)

Đã đối chiếu mọi con số trong `docs/02` và `README.md` với file nguồn:

| Vị trí | Tài liệu nói | Nguồn | Kết quả |
|---|---|---|---|
| docs/02 dòng 21 | test file 406 dòng | `awk END{NR}` = **407** | **Sai → đã sửa** |
| docs/02 dòng 70 | "13 loại nguyên tử" rồi liệt kê 12 tên | `AtomicConsequence` trong `types.ts` = **12** | **Sai → đã sửa** (13 có lẽ đếm cả `if`) |
| docs/02 dòng 14 | types.ts 521 dòng | 521 | Đúng |
| docs/02 dòng 68 | Condition 16 toán tử | 16 | Đúng |
| docs/02 dòng 33 | CausalOrigin 7 kind | 7 | Đúng |
| docs/02 dòng 15–20, 36 | 29 fact (22+7), 24 flag, 5 NPC, 8 cạnh, 8 PR, 6 bối cảnh, 49 event/131 choice, 15 rule, 4 ending, 41/49 role-exclusive | Khớp toàn bộ | Đúng |
| docs/02 dòng 240 | 8 witness path | 4 ending × 2 vai | Đúng |
| README | 49/131, 15, 4, 21 | Khớp | Đúng |
| docs/04 dòng 27 | 10 fact chỉ Operator | 10 | Đúng (đã viết đúng từ đầu) |
| **`src/engine/types.ts` dòng 187** | comment `// 5. CONDITION AST (JSON-serializable, ~14 operators)` | 16 toán tử | **Cũ nhưng KHÔNG sửa**: là file code đã nộp review, directive cấm sửa nội dung không liên quan. Ghi nhận để PO quyết; sửa 1 dòng comment khi Phase 3 mở file này. |

## 6. Test sau khi sửa

```
node --test tests/*.test.mjs
# tests 21  # pass 21  # fail 0  # skipped 0
```

(Không có test nào đọc tài liệu Markdown, nên kết quả không đổi là kỳ vọng; chạy lại để xác nhận content không bị chạm.)

## 7. Checksum

`docs/phase2-checksums.txt` được tạo lại. Thay đổi so với manifest checkpoint:

- `docs/02-phase2-architecture.md`: `02ec6199…2f095` → `9945d392…36e3` (3 dòng sửa ở mục 4–5)
- Thêm vào manifest: `docs/03-phase2-checkpoint.md`, `docs/04-single-player-sim-evaluation.md`, `docs/05-doc-consistency-report.md` (trước đây không có trong manifest)
- **Không đổi**: README, package.json, docs/01, `types.ts`, 6 file `content/*.json`, test file — xác nhận không có content nào bị chạm.

Kiểm tra: `sha256sum -c docs/phase2-checksums.txt`.

## 8. Diff chính xác

```diff
--- docs/02-phase2-architecture.md (checkpoint)
+++ docs/02-phase2-architecture.md
@@ -21 +21 @@
-| `tests/consistency.test.mjs` | 21 test bất biến, `node:test`, 0 dependency | 406 |
+| `tests/consistency.test.mjs` | 21 test bất biến, `node:test`, 0 dependency | 407 |
@@ -36 +36 @@
-| 6 | Replay bằng bất đối xứng, không twist | 41/49 event là role-exclusive. 9 fact chỉ Operator xác nhận được; chuỗi mắt xích bí ẩn chia đôi theo vai (mục 6). | Test 13, 14 |
+| 6 | Replay bằng bất đối xứng, không twist | 41/49 event là role-exclusive. 10 fact chỉ Operator xác nhận được; chuỗi mắt xích bí ẩn chia đôi theo vai (mục 6). | Test 13, 14 |
@@ -70 +70 @@
-**Consequence** — 13 loại nguyên tử + `if/then/else` (…): `stat, setStat, trust, tag, witnessTag, flag, flagAdd, belief, npcTag, npcStatus, schedule, endGame`.
+**Consequence** — 12 loại nguyên tử + `if/then/else` (…): `stat, setStat, trust, tag, witnessTag, flag, flagAdd, belief, npcTag, npcStatus, schedule, endGame`.

--- docs/03-phase2-checkpoint.md (checkpoint)
+++ docs/03-phase2-checkpoint.md
@@ -75 +75 @@
-| A3 | Tài liệu nói "9 fact chỉ Operator xác nhận được"; dữ liệu thực tế: **10** fact có `confirmableBy: ["operator"]`. Một trong hai sai; chưa xác định cái nào. | ChatGPT (logic) |
+| A3 | **ĐÃ GIẢI QUYẾT 2026-10-12.** Dữ liệu đúng: 10 fact có `confirmableBy: ["operator"]`, được Test 13 (Gate B) đối chiếu với event thực tế cấp CONFIRMED. Tài liệu kiến trúc ghi "9" là lỗi tài liệu, đã sửa thành 10 (xem `docs/05-doc-consistency-report.md`). | — |
```

**Dừng.** Không bắt đầu Phase 3.

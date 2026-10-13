# THE COMPOUND — PHASE 2 CHECKPOINT

Ngày: 2026-10-12 · Người lập: Claude Fable · Trạng thái: **DỪNG TẠI CUỐI PHASE 2. Chưa bắt đầu Phase 3.**

## 1. Deliverable đã hoàn thành

| Deliverable | Trạng thái | Ghi chú |
|---|---|---|
| Tài liệu kiến trúc `docs/02-phase2-architecture.md` | Xong | 12 mục: 3 tầng tri thức, Condition AST, segment lifecycle, timeline, mystery chain, propagation, delayed rules, endings, test, 7 câu hỏi mở |
| TypeScript interfaces `src/engine/types.ts` | Xong (signature only) | 521 dòng, 0 implementation. Parse OK với `node --experimental-strip-types`. **Chưa type-check bằng tsc** (không cài gì). |
| World truth `content/truth.json` | Xong | 29 fact = 22 thật + 7 decoy (value=false) |
| Flags `content/flags.json` | Xong | 24 flag contingent |
| NPCs `content/npcs.json` | Xong | 5 NPC, 8 cạnh quan hệ, 8 propagation rule |
| Timeline `content/timeline.json` | Xong | 6 background + 49 event / 131 choice; 41/49 role-exclusive (20 captive, 21 operator, 8 chung) |
| Delayed rules `content/rules.delayed.json` | Xong | 15 rule |
| Endings `content/endings.json` | Xong | 4 ending + witness path mỗi vai |
| Invariant tests `tests/consistency.test.mjs` | Xong | 21 test, node:test, 0 dependency |

Không có gameplay code, không có UI, không cài package nào (không có `node_modules`).

## 2. File đã tạo / sửa trong Phase 2

Tạo mới (tất cả ngày 2026-10-12, giờ máy -04:00):

```
19:44  src/engine/types.ts
19:45  content/flags.json
19:57  content/rules.delayed.json
20:00  package.json
20:00  content/npcs.json
20:00  content/truth.json
20:00  content/endings.json
20:02  content/timeline.json
20:02  tests/consistency.test.mjs
20:04  docs/02-phase2-architecture.md
20:04  README.md
```

Không sửa: `docs/01-phase1-gdd-lite.md` (19:17, Phase 1, đã duyệt).
Tạo tại checkpoint: `docs/03-phase2-checkpoint.md` (file này).
Workspace không phải git repo → không có diff/commit; checksum ở mục 6 thay cho đó.

## 3. Kết quả test thực tế

Lệnh: `node --test tests/*.test.mjs` · Node v22.23.3 · chạy lại tại checkpoint này.

```
# tests 21
# pass 21
# fail 0
# cancelled 0
# skipped 0
# duration_ms 183.7
```

Phạm vi test: **tĩnh** (static) trên JSON content. Không mô phỏng gameplay, không có evaluator Condition, không có applier Consequence.

## 4. Rủi ro kiến trúc chưa giải quyết

1. **Ending reachability chỉ chứng minh tĩnh.** Test 19 kiểm tra witness path tồn tại, đúng vai, đúng thứ tự thời gian. Không chứng minh stat (SUSPICION/STRESS) ở cuối path nằm trong ngưỡng, không chứng minh `if/then/else` đi đúng nhánh. Một ending có thể không đạt được trên thực tế mà test vẫn pass. (= Q3)
2. **`rolesOfCond` là xấp xỉ.** Hàm xác định vai của choice/observation chỉ tin `role` ở top-level hoặc trong `and` top-level. Điều kiện `or(role captive, ...)` hoặc `not(role ...)` bị gán fallback → Test 13/14/18 có thể báo sai (false pass hoặc false fail) nếu content tương lai dùng dạng lồng.
3. **Mô hình PC không được chơi (Q1).** Hiện dùng nhánh `role` trong điều kiện. Nếu Phase 3 nhân đôi > 10 điều kiện thì phải refactor sang `defaults.json`; đây là thay đổi cấu trúc ảnh hưởng cả engine lẫn content.
4. **Thứ tự forced event trong cùng segment** phụ thuộc thứ tự khai báo trong file JSON (Q2). Không có test bảo vệ thứ tự này; reorder file = đổi gameplay thầm lặng.
5. **Convergence point có thể phi giao hoán.** Bước 6a (propagation) chạy trước 6b (delayed rules); delayed rule đọc belief NPC có thể thấy giá trị khác nếu đảo thứ tự. Thứ tự đã đặc tả nhưng chưa có test chứng minh không có rule nào phụ thuộc vào thứ tự cùng segment.
6. **`contentVersion` chưa có chỗ bám.** `GameState.meta.contentVersion` và `SaveFile` dựa trên version của content, nhưng chỉ `truth.json` có `version: "0.2.0"`; 5 file content còn lại không có trường version. Chưa định nghĩa cách tính một contentVersion duy nhất từ 6 file.
7. **Cân bằng stat (Q4)** chưa làm; ngưỡng 40/70/90 và 60/80 đặt tay. Rủi ro: ending ESCAPE không đạt được hoặc đạt quá dễ.
8. **DialogueProvider** mới là interface; chưa có kiểm chứng rằng `DialogueRequest` thật sự không rò WorldTruth khi engine lắp vào (Gate D mới là thiết kế, chưa test).

## 5. Giả định chưa được kiểm chứng

| # | Giả định | Ai kiểm chứng |
|---|---|---|
| A1 | `types.ts` compile sạch với `tsc --strict`. Mới parse bằng strip-types, chưa type-check. | Reviewer có tsc |
| A2 | Content JSON khớp với interface trong `types.ts` (test đọc JSON thô, không đối chiếu schema với TS). | Claude Opus |
| A3 | **ĐÃ GIẢI QUYẾT 2026-10-12.** Dữ liệu đúng: 10 fact có `confirmableBy: ["operator"]`, được Test 13 (Gate B) đối chiếu với event thực tế cấp CONFIRMED. Tài liệu kiến trúc ghi "9" là lỗi tài liệu, đã sửa thành 10 (xem `docs/05-doc-consistency-report.md`). | — |
| A4 | 7 câu hỏi Q1–Q7 trong mục 11 của tài liệu kiến trúc đi theo cột "Đề xuất" nếu PO không phản đối. | PO |
| A5 | Fixpoint lan truyền tri thức (Test 9–12) tính tập fact NPC *có thể* biết; giả định rằng mọi đường truyền đều qua `relationships` đã khai báo và không có đường ngầm nào trong consequence `belief` nhắm NPC. | ChatGPT (logic) |
| A6 | Không có RNG; mọi "ngẫu nhiên" là luật có ngưỡng. Giả định này đúng với content hiện tại nhưng chưa có test cấm trường random. | Reviewer |
| A7 | Lexical check từ cấm (Test 20) đủ cho Gate G. Danh sách từ cấm chưa được PO duyệt. | PO |
| A8 | D9 (danh tính hoàn toàn hư cấu) được giữ trong toàn bộ content; mới kiểm tra bằng mắt khi viết, chưa có test. | PO / Reviewer |

## 6. Hướng dẫn review độc lập

Yêu cầu: Node ≥ 22. Không cài gì. Không chạy lệnh có đặc quyền.

```
cd /root/working
node --test tests/*.test.mjs            # kỳ vọng: 21 pass, 0 fail
sha256sum -c docs/phase2-checksums.txt  # kỳ vọng: tất cả OK
```

Thứ tự đọc đề xuất:
1. `docs/02-phase2-architecture.md` mục 1 (7 yêu cầu PO → cơ chế) và mục 11 (Q1–Q7).
2. `src/engine/types.ts` — đối chiếu với mục 2–4 của tài liệu.
3. `tests/consistency.test.mjs` — đọc hàm `rolesOfCond` (dòng ~41) và Test 19 để đánh giá rủi ro #1, #2 ở trên.
4. `content/truth.json` — đếm `confirmableBy: ["operator"]` để giải quyết A3.

Phân vai review (theo quyết định PO):
- **Claude Opus — kiến trúc:** tách WorldTruth/GameState; `apply()` là entry point duy nhất; thứ tự convergence point; Q1, Q2, Q5, Q6; rủi ro #3, #5, #6.
- **ChatGPT — logic:** chuỗi mắt xích mục 6; 8 propagation rule; 15 delayed rule có hạt giống trước hiệu ứng; A3, A5; thử tìm ending không đạt được bằng tay.
- **PO:** Q1–Q7, A4, A7, A8; quyết định có cho viết reference evaluator (Q3) trong Phase 3.

Cách ghi phản hồi: liệt kê theo mã (rủi ro #n, giả định An, câu hỏi Qn) để Phase 3 truy vết được.

## 7. Trạng thái

**Dừng.** Phase 3 (vertical slice ngày 3 + reference evaluator) chỉ bắt đầu khi PO duyệt sau review.

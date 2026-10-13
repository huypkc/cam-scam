# THE COMPOUND — MVP VERIFICATION EVIDENCE (generated)

Sinh tự động bởi `node scripts/verify-mvp.mjs` từ content + engine hiện tại. Không sửa tay. Mọi con số dưới đây được tính lại mỗi lần chạy; tài liệu này là **bằng chứng thực thi** cho Definition of Done của MVP (chỉ thị PO 2026-10-13).

Ký hiệu: segment = D{ngày}{S/C/Đ} (Sáng/Chiều/Đêm), index 0–20; `phone` = `phone.location`; hash = FNV-1a 64 của GameState (meta.createdAt loại trừ).

## 1. Bộ test

Lệnh: `node --test tests/*.test.mjs`

| files | tests | pass | fail |
|---|---|---|---|
| 7 | 117 | 117 | 0 |

Các file test: `consistency (21 static invariants, Phase 2)`, `intents (visibility contract, Gate C)`, `evaluator (T01–T10, corpus, witness paths, sensitivity)`, `content-gates (audit §12: T-B, T-D, T-F, T-G, T-I2, T-M, T-O1, T-O2, DEFAULTS, EPILOGUES, VISIBILITY)`, `engine (ATOMIC, ORDER, REPLAY, IDEMPOTENT, CONFLICT, SAVE/LOAD, COUNTERFACTUAL, ZERO-PLAYER, INVARIANTS)`, `session (LEAK, PLAY, PROMPT, ENDINGS, EPILOGUE, DISTORTION, SAVE/LOAD via Session, PROJECTION)`, `launch (SERVER, CLI auto/script/interactive)`

## 2. Toàn bộ corpus: 7 ngày, replay, save/load, Session

| run | vai | ending | kết thúc tại | quyết định | mutations | NPC actions | replay hash = | Session hash = | save/load (mọi prefix) |
|---|---|---|---|---|---|---|---|---|---|
| S1_PASSIVE | captive | E_TRANSFER | D7Đ (seg 20) | 18 | 79 | 3 | ✅ | ✅ | ✅ |
| S2_COVER_WARN | captive | E_TRANSFER | D7Đ (seg 20) | 26 | 108 | 3 | ✅ | ✅ | ✅ |
| S3_VU_TRUST | captive | E_TRANSFER | D7Đ (seg 20) | 31 | 117 | 3 | ✅ | ✅ | ✅ |
| S4_TAKE_SWEEP | captive | E_TRANSFER | D7Đ (seg 20) | 25 | 103 | 2 | ✅ | ✅ | ✅ |
| S4b_TAKE_CALL | captive | E_EXPOSURE | D7S (seg 18) | 27 | 110 | 2 | ✅ | ✅ | ✅ |
| S5_TELL_LINH | captive | E_TRANSFER | D7Đ (seg 20) | 26 | 111 | 3 | ✅ | ✅ | ✅ |
| S6_MOVE_YARD_DUC_CALLS | captive | E_TRANSFER | D7Đ (seg 20) | 26 | 101 | 4 | ✅ | ✅ | ✅ |
| S7_MAI_RECOVERS | captive | E_TRANSFER | D7Đ (seg 20) | 27 | 98 | 4 | ✅ | ✅ | ✅ |
| S8_HAND_OVER_LINH | captive | E_TRANSFER | D7Đ (seg 20) | 25 | 108 | 3 | ✅ | ✅ | ✅ |
| S9_ESCAPE_WITH_DUC | captive | E_ESCAPE | D6Đ (seg 17) | 31 | 120 | 2 | ✅ | ✅ | ✅ |
| S10_TURN_LINH | captive | E_TRANSFER | D7Đ (seg 20) | 30 | 115 | 3 | ✅ | ✅ | ✅ |
| S11_EXPOSE_LINH | captive | E_TRANSFER | D7Đ (seg 20) | 28 | 121 | 3 | ✅ | ✅ | ✅ |
| O1_PASSIVE | operator | E_TRANSFER | D7Đ (seg 20) | 21 | 83 | 2 | ✅ | ✅ | ✅ |
| O2_HIDE_ABSORB | operator | E_TRANSFER | D7Đ (seg 20) | 25 | 111 | 3 | ✅ | ✅ | ✅ |
| O2b_SUPPRESS_MAI_RECOVERS | operator | E_TRANSFER | D7Đ (seg 20) | 20 | 76 | 3 | ✅ | ✅ | ✅ |
| O3_POINT_MAI_DEAL | operator | E_TRANSFER | D7Đ (seg 20) | 23 | 99 | 3 | ✅ | ✅ | ✅ |
| O4_EXPOSURE | operator | E_EXPOSURE | D7S (seg 18) | 25 | 108 | 3 | ✅ | ✅ | ✅ |
| O5_NAME_MAI | operator | E_TRANSFER | D7Đ (seg 20) | 22 | 94 | 2 | ✅ | ✅ | ✅ |
| O6_NAME_DUC_VERIFIED | operator | E_TRANSFER | D7Đ (seg 20) | 21 | 83 | 3 | ✅ | ✅ | ✅ |
| O7_NAME_DUC_TAKEN | operator | E_TRANSFER | D7Đ (seg 20) | 24 | 110 | 3 | ✅ | ✅ | ✅ |
| O8_OPERATOR_OPTIONALS | operator | E_TRANSFER | D7Đ (seg 20) | 33 | 140 | 2 | ✅ | ✅ | ✅ |
| S12_BLAME_DUC | captive | E_TRANSFER | D7Đ (seg 20) | 26 | 116 | 3 | ✅ | ✅ | ✅ |
| S12b_BLAME_DUC_NO_EVIDENCE | captive | E_TRANSFER | D7Đ (seg 20) | 26 | 108 | 3 | ✅ | ✅ | ✅ |
| S13_LAST_CHANCE_CALL | captive | E_EXPOSURE | D7S (seg 18) | 29 | 112 | 2 | ✅ | ✅ | ✅ |
| WP_E_ESCAPE_captive | captive | E_ESCAPE | D6Đ (seg 17) | 20 | 76 | 3 | ✅ | ✅ | ✅ |
| WP_E_ESCAPE_operator | operator | E_ESCAPE | D6Đ (seg 17) | 22 | 81 | 2 | ✅ | ✅ | ✅ |
| WP_E_EXPOSURE_captive | captive | E_EXPOSURE | D7S (seg 18) | 26 | 113 | 2 | ✅ | ✅ | ✅ |
| WP_E_EXPOSURE_operator | operator | E_EXPOSURE | D7S (seg 18) | 26 | 113 | 3 | ✅ | ✅ | ✅ |
| WP_E_INVERSION_captive | captive | E_INVERSION | D7Đ (seg 20) | 18 | 82 | 3 | ✅ | ✅ | ✅ |
| WP_E_INVERSION_operator | operator | E_INVERSION | D7Đ (seg 20) | 22 | 97 | 2 | ✅ | ✅ | ✅ |
| WP_E_TRANSFER_captive | captive | E_TRANSFER | D7Đ (seg 20) | 18 | 79 | 3 | ✅ | ✅ | ✅ |
| WP_E_TRANSFER_operator | operator | E_TRANSFER | D7Đ (seg 20) | 21 | 83 | 2 | ✅ | ✅ | ✅ |
| ZP_captive | captive | E_TRANSFER | D7Đ (seg 20) | 18 | 79 | 3 | ✅ | ✅ | ✅ |
| ZP_operator | operator | E_TRANSFER | D7Đ (seg 20) | 21 | 83 | 2 | ✅ | ✅ | ✅ |

Tổng: **34 run**, **861 save** (mọi prefix của mọi decision log) round-trip qua `serialize → deserialize` và `Session.fromSave` với view JSON giống hệt; **861 view** quét từ khóa cấm (`misinformation`, `trustToPlayer`, `"knowledge"`, `"flags"`, `initialHolders`, `"decoy"`, `canonical`, `"value":`): **0 rò rỉ**.

## 3. Bốn ending × hai vai — witness path chạy qua Session API

### E_ESCAPE — THOÁT · vai captive ✅

Witness path (content/endings.json): S_D1M_INTAKE/c_sign → C_D1A_LINH_APPROACH/open → C_D1N_PATROL/watch → S_QUOTA_SHIFT/slack → C_D2N_LINH_PROBE/tell → C_D3A_SEARCH/aside → C_D4N_PATROL2/watch → C_D6A_DUC_ASK/no → S_D6N_ESCAPE/go; mọi event khác lấy `defaultChoice`.

Decision log (20): `S_D1M_INTAKE:c_sign C_D1A_LINH_APPROACH:open · +C_D1N_PATROL C_D1N_PATROL:watch S_QUOTA_SHIFT:slack · C_D2N_LINH_PROBE:tell S_QUOTA_SHIFT:slack C_D3A_SEARCH:aside C_D3A_LINH_WHISPER:silent S_QUOTA_SHIFT:slack C_D4N_LINH_OFFER:refuse +C_D4N_PATROL2 C_D4N_PATROL2:watch S_QUOTA_SHIFT:slack S_QUOTA_SHIFT:slack C_D6A_DUC_ASK:no +S_D6N_ESCAPE S_D6N_ESCAPE:go`

Kết thúc tại D6Đ (seg 17) · hash engine `ff0e37524bace18f` · hash Session `ff0e37524bace18f` · epilogue: **THOÁT** (5 NPC card, 1 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/c_sign | — | mai_drawer | 5 | 0 | — |
| D1C | C_D1A_LINH_APPROACH/open<br>(bỏ qua 1 optional) | — | mai_drawer | 0 | 0 | — |
| D1Đ | C_D1N_PATROL/watch | — | mai_drawer | 5 | 0 | — |
| D2S | C_D2M_TRUCK<br>S_QUOTA_SHIFT/slack | — | mai_drawer | 0 | 10 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 0 | 10 | — |
| D2Đ | C_D2N_LINH_PROBE/tell | — | mai_drawer | 0 | 10 | — |
| D3S | S_QUOTA_SHIFT/slack<br>C_D3M_DUC_PALE | — | dorm_ceiling | 5 | 20 | — |
| D3C | C_D3A_SEARCH/aside<br>C_D3A_LINH_WHISPER/silent | — | dorm_ceiling | 15 | 20 | — |
| D3Đ | — | — | dorm_ceiling | 15 | 20 | — |
| D4S | S_QUOTA_SHIFT/slack | — | dorm_ceiling | 20 | 30 | — |
| D4C | — | PR_DUC_CONFIDES_LINH<br>A_MAI_SEARCH_DORM | mai | 20 | 30 | — |
| D4Đ | C_D4N_LINH_OFFER/refuse<br>C_D4N_PATROL2/watch | PR_LINH_RELAY_LOCATION | mai | 25 | 30 | — |
| D5S | S_QUOTA_SHIFT/slack | — | mai | 20 | 40 | — |
| D5C | — | — | mai | 20 | 40 | — |
| D5Đ | — | — | mai | 20 | 40 | — |
| D6S | S_QUOTA_SHIFT/slack | — | mai | 15 | 50 | — |
| D6C | C_D6A_DUC_ASK/no | — | mai | 20 | 50 | — |
| D6Đ | S_D6N_ESCAPE/go | — | mai | 20 | 50 | — |

### E_ESCAPE — THOÁT · vai operator ✅

Witness path (content/endings.json): S_D1M_INTAKE/o_harsh → O_D6M_THACH_OFFER/accept → S_D6N_ESCAPE/go; mọi event khác lấy `defaultChoice`.

Decision log (22): `S_D1M_INTAKE:o_harsh O_D1A_MAI_PAPERWORK:silent · O_D2M_INVENTORY_SHEET:file S_QUOTA_SHIFT:comply · · O_D3M_THACH_ORDER:accept S_QUOTA_SHIFT:comply · O_D3A_SEARCH:thorough O_D3N_LINH_TIP:pass_up S_QUOTA_SHIFT:comply O_D4M_INTERROGATE_NEWCOMER:motions O_D4M_THACH_NAME:stall · S_QUOTA_SHIFT:comply · O_D6M_THACH_OFFER:accept S_QUOTA_SHIFT:comply +S_D6N_ESCAPE S_D6N_ESCAPE:go`

Kết thúc tại D6Đ (seg 17) · hash engine `89e2ac5c7a5d55c3` · hash Session `89e2ac5c7a5d55c3` · epilogue: **THOÁT** (5 NPC card, 0 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/o_harsh | — | mai_drawer | 0 | 0 | — |
| D1C | O_D1A_MAI_PAPERWORK/silent | — | mai_drawer | 5 | 0 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 5 | 0 | — |
| D2S | O_D2M_INVENTORY_SHEET/file<br>S_QUOTA_SHIFT/comply | — | mai_drawer | 10 | 0 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D3S | O_D3M_THACH_ORDER/accept<br>S_QUOTA_SHIFT/comply<br>(bỏ qua 1 optional) | — | dorm_ceiling | 15 | 0 | — |
| D3C | O_D3A_SEARCH/thorough | — | dorm_ceiling | 25 | 0 | — |
| D3Đ | O_D3N_LINH_TIP/pass_up | — | dorm_ceiling | 25 | 0 | — |
| D4S | S_QUOTA_SHIFT/comply<br>O_D4M_INTERROGATE_NEWCOMER/motions<br>O_D4M_THACH_NAME/stall | — | dorm_ceiling | 50 | 20 | — |
| D4C | (bỏ qua 1 optional) | PR_DUC_CONFIDES_LINH | dorm_ceiling | 50 | 20 | — |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 50 | 20 | — |
| D5S | S_QUOTA_SHIFT/comply | — | thach | 55 | 20 | — |
| D5C | — | — | thach | 55 | 20 | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 55 | 20 | — |
| D6S | O_D6M_THACH_OFFER/accept<br>S_QUOTA_SHIFT/comply | — | thach | 60 | 10 | — |
| D6C | — | — | thach | 60 | 10 | — |
| D6Đ | S_D6N_ESCAPE/go | — | thach | 60 | 10 | — |

### E_EXPOSURE — PHƠI BÀY · vai captive ✅

Witness path (content/endings.json): S_D1M_INTAKE/c_sign → C_D1A_DUC_FOOD/share → C_D2A_DUC_CONFIDES/encourage → C_D3A_SEARCH/cover → C_D3N_DUC_CONFESSION/keep_secret → C_D4M_INTERROGATION/blame_linh → C_D4A_PHONE_DECISION/take → C_D5A_PHONE_CONTENTS/call_out → S_D7M_RAID/c_help; mọi event khác lấy `defaultChoice`.

Decision log (26): `S_D1M_INTAKE:c_sign C_D1A_LINH_APPROACH:guarded +C_D1A_DUC_FOOD C_D1A_DUC_FOOD:share · S_QUOTA_SHIFT:comply +C_D2A_DUC_CONFIDES C_D2A_DUC_CONFIDES:encourage C_D2N_LINH_PROBE:deflect S_QUOTA_SHIFT:comply C_D3A_SEARCH:cover C_D3A_LINH_WHISPER:silent +C_D3N_DUC_CONFESSION C_D3N_DUC_CONFESSION:keep_secret S_QUOTA_SHIFT:comply C_D4M_INTERROGATION:blame_linh +C_D4A_PHONE_DECISION C_D4A_PHONE_DECISION:take C_D4N_LINH_OFFER:refuse · S_QUOTA_SHIFT:comply +C_D5A_PHONE_CONTENTS C_D5A_PHONE_CONTENTS:call_out S_QUOTA_SHIFT:comply C_D6M_THACH_DEAL:refuse S_D7M_RAID:c_help`

Kết thúc tại D7S (seg 18) · hash engine `8fc209d8afcbebb5` · hash Session `8fc209d8afcbebb5` · epilogue: **PHƠI BÀY** (5 NPC card, 2 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/c_sign | — | mai_drawer | 5 | 0 | — |
| D1C | C_D1A_LINH_APPROACH/guarded<br>C_D1A_DUC_FOOD/share | — | mai_drawer | 15 | 0 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 15 | 0 | — |
| D2S | C_D2M_TRUCK<br>S_QUOTA_SHIFT/comply | — | mai_drawer | 20 | 0 | — |
| D2C | C_D2A_DUC_CONFIDES/encourage | — | mai_drawer | 25 | 0 | — |
| D2Đ | C_D2N_LINH_PROBE/deflect | — | mai_drawer | 25 | 0 | — |
| D3S | S_QUOTA_SHIFT/comply<br>C_D3M_DUC_PALE | — | dorm_ceiling | 40 | 0 | — |
| D3C | C_D3A_SEARCH/cover<br>C_D3A_LINH_WHISPER/silent | — | dorm_ceiling | 55 | 15 | — |
| D3Đ | C_D3N_DUC_CONFESSION/keep_secret | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 65 | 25 | — |
| D4S | S_QUOTA_SHIFT/comply<br>C_D4M_INTERROGATION/blame_linh | — | dorm_ceiling | 80 | 20 | — |
| D4C | C_D4A_PHONE_DECISION/take | — | player | 95 | 25 | — |
| D4Đ | C_D4N_LINH_OFFER/refuse<br>(bỏ qua 1 optional) | — | player | 95 | 25 | — |
| D5S | S_QUOTA_SHIFT/comply | — | player | 100 | 25 | — |
| D5C | C_D5A_PHONE_CONTENTS/call_out | — | player | 100 | 35 | — |
| D5Đ | — | A_THACH_RECRUIT | player | 100 | 35 | — |
| D6S | S_QUOTA_SHIFT/comply<br>C_D6M_THACH_DEAL/refuse | R_SUSPICION_SWEEP | thach | 100 | 70 | — |
| D6C | — | — | thach | 100 | 70 | — |
| D6Đ | — | R_EXPOSURE_RAID | thach | 100 | 70 | — |
| D7S | S_D7M_RAID/c_help | — | thach | 90 | 70 | — |

### E_EXPOSURE — PHƠI BÀY · vai operator ✅

Witness path (content/endings.json): O_D3M_MAI_PANIC/confront → O_D4A_LEDGER/copy → O_D5A_MAI_DEAL/agree → O_D6A_EVIDENCE_ROUTE/send → S_D7M_RAID/o_surrender; mọi event khác lấy `defaultChoice`.

Decision log (26): `S_D1M_INTAKE:o_plain O_D1A_MAI_PAPERWORK:silent · O_D2M_INVENTORY_SHEET:file S_QUOTA_SHIFT:comply · · O_D3M_THACH_ORDER:accept S_QUOTA_SHIFT:comply +O_D3M_MAI_PANIC O_D3M_MAI_PANIC:confront O_D3A_SEARCH:thorough O_D3N_LINH_TIP:pass_up S_QUOTA_SHIFT:comply O_D4M_INTERROGATE_NEWCOMER:motions O_D4M_THACH_NAME:stall +O_D4A_LEDGER O_D4A_LEDGER:copy S_QUOTA_SHIFT:comply O_D5A_MAI_DEAL:agree · O_D6M_THACH_OFFER:refuse S_QUOTA_SHIFT:comply +O_D6A_EVIDENCE_ROUTE O_D6A_EVIDENCE_ROUTE:send S_D7M_RAID:o_surrender`

Kết thúc tại D7S (seg 18) · hash engine `b8c20a66cef8b3f7` · hash Session `b8c20a66cef8b3f7` · epilogue: **PHƠI BÀY** (5 NPC card, 1 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/o_plain | — | mai_drawer | 0 | 5 | — |
| D1C | O_D1A_MAI_PAPERWORK/silent | — | mai_drawer | 5 | 5 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 5 | 5 | — |
| D2S | O_D2M_INVENTORY_SHEET/file<br>S_QUOTA_SHIFT/comply | — | mai_drawer | 10 | 0 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D3S | O_D3M_THACH_ORDER/accept<br>S_QUOTA_SHIFT/comply<br>O_D3M_MAI_PANIC/confront | — | dorm_ceiling | 20 | 0 | — |
| D3C | O_D3A_SEARCH/thorough | — | dorm_ceiling | 30 | 0 | — |
| D3Đ | O_D3N_LINH_TIP/pass_up | — | dorm_ceiling | 30 | 0 | — |
| D4S | S_QUOTA_SHIFT/comply<br>O_D4M_INTERROGATE_NEWCOMER/motions<br>O_D4M_THACH_NAME/stall | — | dorm_ceiling | 55 | 20 | — |
| D4C | O_D4A_LEDGER/copy | PR_DUC_CONFIDES_LINH | dorm_ceiling | 65 | 30 | — |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 65 | 30 | — |
| D5S | S_QUOTA_SHIFT/comply | A_MAI_APPROACH_OPERATOR | thach | 70 | 30 | — |
| D5C | O_D5A_MAI_DEAL/agree | — | thach | 70 | 30 | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 70 | 30 | — |
| D6S | O_D6M_THACH_OFFER/refuse<br>S_QUOTA_SHIFT/comply | — | thach | 75 | 55 | — |
| D6C | O_D6A_EVIDENCE_ROUTE/send | — | thach | 85 | 70 | — |
| D6Đ | — | R_EXPOSURE_RAID | thach | 85 | 70 | — |
| D7S | S_D7M_RAID/o_surrender | — | thach | 75 | 70 | — |

### E_INVERSION — ĐẢO VAI · vai captive ✅

Witness path (content/endings.json): S_QUOTA_SHIFT/comply → S_QUOTA_SHIFT/comply → S_QUOTA_SHIFT/comply → C_D6M_THACH_DEAL/accept; mọi event khác lấy `defaultChoice`.

Decision log (18): `S_D1M_INTAKE:c_sign C_D1A_LINH_APPROACH:guarded · · S_QUOTA_SHIFT:comply · C_D2N_LINH_PROBE:deflect S_QUOTA_SHIFT:comply C_D3A_SEARCH:aside C_D3A_LINH_WHISPER:silent S_QUOTA_SHIFT:comply C_D4M_INTERROGATION:deny C_D4N_LINH_OFFER:refuse · S_QUOTA_SHIFT:comply S_QUOTA_SHIFT:comply C_D6M_THACH_DEAL:accept S_D7A_LOADING:c_alone`

Kết thúc tại D7Đ (seg 20) · hash engine `8ee65b277198efc7` · hash Session `8ee65b277198efc7` · epilogue: **ĐẢO VAI** (5 NPC card, 0 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/c_sign | — | mai_drawer | 5 | 0 | — |
| D1C | C_D1A_LINH_APPROACH/guarded<br>(bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D2S | C_D2M_TRUCK<br>S_QUOTA_SHIFT/comply | — | mai_drawer | 15 | 0 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 15 | 0 | — |
| D2Đ | C_D2N_LINH_PROBE/deflect | — | mai_drawer | 15 | 0 | — |
| D3S | S_QUOTA_SHIFT/comply<br>C_D3M_DUC_PALE | — | dorm_ceiling | 30 | 0 | — |
| D3C | C_D3A_SEARCH/aside<br>C_D3A_LINH_WHISPER/silent | — | dorm_ceiling | 40 | 0 | — |
| D3Đ | — | PR_LINH_TIP_CAPTIVE<br>R_INTERROGATION_D4 | dorm_ceiling | 40 | 10 | — |
| D4S | S_QUOTA_SHIFT/comply<br>C_D4M_INTERROGATION/deny | — | dorm_ceiling | 65 | 20 | — |
| D4C | — | PR_DUC_CONFIDES_LINH | dorm_ceiling | 65 | 20 | — |
| D4Đ | C_D4N_LINH_OFFER/refuse<br>(bỏ qua 1 optional) | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 65 | 35 | — |
| D5S | S_QUOTA_SHIFT/comply | — | thach | 70 | 35 | — |
| D5C | — | — | thach | 70 | 35 | — |
| D5Đ | — | A_THACH_RECRUIT | thach | 70 | 35 | — |
| D6S | S_QUOTA_SHIFT/comply<br>C_D6M_THACH_DEAL/accept | — | thach | 65 | 5 | — |
| D6C | — | — | thach | 65 | 5 | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 65 | 5 | — |
| D7S | S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 65 | 5 | — |
| D7C | S_D7A_LOADING/c_alone | — | thach | 70 | 5 | — |
| D7Đ | — | — | thach | 70 | 5 | — |

### E_INVERSION — ĐẢO VAI · vai operator ✅

Witness path (content/endings.json): S_QUOTA_SHIFT/sabotage → S_QUOTA_SHIFT/sabotage → S_QUOTA_SHIFT/sabotage → S_QUOTA_SHIFT/sabotage → S_QUOTA_SHIFT/sabotage → O_D7M_CALLED_UP/accept; mọi event khác lấy `defaultChoice`.

Decision log (22): `S_D1M_INTAKE:o_plain O_D1A_MAI_PAPERWORK:silent · O_D2M_INVENTORY_SHEET:file S_QUOTA_SHIFT:sabotage · · O_D3M_THACH_ORDER:accept S_QUOTA_SHIFT:sabotage · O_D3A_SEARCH:thorough O_D3N_LINH_TIP:pass_up S_QUOTA_SHIFT:sabotage O_D4M_INTERROGATE_NEWCOMER:motions O_D4M_THACH_NAME:stall · S_QUOTA_SHIFT:sabotage · O_D6M_THACH_OFFER:refuse S_QUOTA_SHIFT:sabotage O_D7M_CALLED_UP:accept S_D7A_LOADING:o_back`

Kết thúc tại D7Đ (seg 20) · hash engine `c8335cfd8da808f6` · hash Session `c8335cfd8da808f6` · epilogue: **ĐẢO VAI** (5 NPC card, 0 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/o_plain | — | mai_drawer | 0 | 5 | — |
| D1C | O_D1A_MAI_PAPERWORK/silent | — | mai_drawer | 5 | 5 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 5 | 5 | — |
| D2S | O_D2M_INVENTORY_SHEET/file<br>S_QUOTA_SHIFT/sabotage | — | mai_drawer | 15 | 20 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 15 | 20 | — |
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 15 | 20 | — |
| D3S | O_D3M_THACH_ORDER/accept<br>S_QUOTA_SHIFT/sabotage<br>(bỏ qua 1 optional) | — | dorm_ceiling | 25 | 35 | — |
| D3C | O_D3A_SEARCH/thorough | — | dorm_ceiling | 35 | 25 | — |
| D3Đ | O_D3N_LINH_TIP/pass_up | — | dorm_ceiling | 35 | 20 | — |
| D4S | S_QUOTA_SHIFT/sabotage<br>O_D4M_INTERROGATE_NEWCOMER/motions<br>O_D4M_THACH_NAME/stall | — | dorm_ceiling | 65 | 60 | — |
| D4C | (bỏ qua 1 optional) | PR_DUC_CONFIDES_LINH | dorm_ceiling | 65 | 60 | — |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 65 | 60 | — |
| D5S | S_QUOTA_SHIFT/sabotage | — | thach | 75 | 80 | — |
| D5C | — | — | thach | 75 | 80 | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 75 | 80 | — |
| D6S | O_D6M_THACH_OFFER/refuse<br>S_QUOTA_SHIFT/sabotage | R_OPERATOR_MARKED | thach | 85 | 100 | — |
| D6C | — | — | thach | 85 | 100 | — |
| D6Đ | — | R_TRANSFER_PREP<br>R_CALLED_UP | thach | 85 | 100 | — |
| D7S | O_D7M_CALLED_UP/accept<br>S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 100 | 100 | — |
| D7C | S_D7A_LOADING/o_back | — | thach | 100 | 100 | — |
| D7Đ | — | — | thach | 100 | 100 | — |

### E_TRANSFER — CHUYỂN GIAO · vai captive ✅

Witness path (content/endings.json): S_D1M_INTAKE/c_sign → C_D3A_SEARCH/aside → S_D7A_LOADING/c_alone; mọi event khác lấy `defaultChoice`.

Decision log (18): `S_D1M_INTAKE:c_sign C_D1A_LINH_APPROACH:guarded · · S_QUOTA_SHIFT:comply · C_D2N_LINH_PROBE:deflect S_QUOTA_SHIFT:comply C_D3A_SEARCH:aside C_D3A_LINH_WHISPER:silent S_QUOTA_SHIFT:comply C_D4M_INTERROGATION:deny C_D4N_LINH_OFFER:refuse · S_QUOTA_SHIFT:comply S_QUOTA_SHIFT:comply C_D6M_THACH_DEAL:refuse S_D7A_LOADING:c_alone`

Kết thúc tại D7Đ (seg 20) · hash engine `eeaf4e086f15c772` · hash Session `eeaf4e086f15c772` · epilogue: **CHUYỂN GIAO** (5 NPC card, 1 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/c_sign | — | mai_drawer | 5 | 0 | — |
| D1C | C_D1A_LINH_APPROACH/guarded<br>(bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D2S | C_D2M_TRUCK<br>S_QUOTA_SHIFT/comply | — | mai_drawer | 15 | 0 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 15 | 0 | — |
| D2Đ | C_D2N_LINH_PROBE/deflect | — | mai_drawer | 15 | 0 | — |
| D3S | S_QUOTA_SHIFT/comply<br>C_D3M_DUC_PALE | — | dorm_ceiling | 30 | 0 | — |
| D3C | C_D3A_SEARCH/aside<br>C_D3A_LINH_WHISPER/silent | — | dorm_ceiling | 40 | 0 | — |
| D3Đ | — | PR_LINH_TIP_CAPTIVE<br>R_INTERROGATION_D4 | dorm_ceiling | 40 | 10 | — |
| D4S | S_QUOTA_SHIFT/comply<br>C_D4M_INTERROGATION/deny | — | dorm_ceiling | 65 | 20 | — |
| D4C | — | PR_DUC_CONFIDES_LINH | dorm_ceiling | 65 | 20 | — |
| D4Đ | C_D4N_LINH_OFFER/refuse<br>(bỏ qua 1 optional) | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 65 | 35 | — |
| D5S | S_QUOTA_SHIFT/comply | — | thach | 70 | 35 | — |
| D5C | — | — | thach | 70 | 35 | — |
| D5Đ | — | A_THACH_RECRUIT | thach | 70 | 35 | — |
| D6S | S_QUOTA_SHIFT/comply<br>C_D6M_THACH_DEAL/refuse | — | thach | 80 | 50 | — |
| D6C | — | — | thach | 80 | 50 | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 80 | 50 | — |
| D7S | S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 80 | 50 | — |
| D7C | S_D7A_LOADING/c_alone | — | thach | 85 | 50 | — |
| D7Đ | — | — | thach | 85 | 50 | — |

### E_TRANSFER — CHUYỂN GIAO · vai operator ✅

Witness path (content/endings.json): S_D1M_INTAKE/o_plain → O_D4M_THACH_NAME/stall → O_D6M_THACH_OFFER/refuse → S_D7A_LOADING/o_cab; mọi event khác lấy `defaultChoice`.

Decision log (21): `S_D1M_INTAKE:o_plain O_D1A_MAI_PAPERWORK:silent · O_D2M_INVENTORY_SHEET:file S_QUOTA_SHIFT:comply · · O_D3M_THACH_ORDER:accept S_QUOTA_SHIFT:comply · O_D3A_SEARCH:thorough O_D3N_LINH_TIP:pass_up S_QUOTA_SHIFT:comply O_D4M_INTERROGATE_NEWCOMER:motions O_D4M_THACH_NAME:stall · S_QUOTA_SHIFT:comply · O_D6M_THACH_OFFER:refuse S_QUOTA_SHIFT:comply S_D7A_LOADING:o_cab`

Kết thúc tại D7Đ (seg 20) · hash engine `266c8cc61cebf757` · hash Session `266c8cc61cebf757` · epilogue: **CHUYỂN GIAO** (5 NPC card, 0 extra)

| seg | sự kiện / lựa chọn | thế giới tự chuyển (propagation · NPC action · rule) | phone | stress | susp | NPC status |
|---|---|---|---|---|---|---|
| D1S | S_D1M_INTAKE/o_plain | — | mai_drawer | 0 | 5 | — |
| D1C | O_D1A_MAI_PAPERWORK/silent | — | mai_drawer | 5 | 5 | — |
| D1Đ | (bỏ qua 1 optional) | — | mai_drawer | 5 | 5 | — |
| D2S | O_D2M_INVENTORY_SHEET/file<br>S_QUOTA_SHIFT/comply | — | mai_drawer | 10 | 0 | — |
| D2C | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 10 | 0 | — |
| D3S | O_D3M_THACH_ORDER/accept<br>S_QUOTA_SHIFT/comply<br>(bỏ qua 1 optional) | — | dorm_ceiling | 15 | 0 | — |
| D3C | O_D3A_SEARCH/thorough | — | dorm_ceiling | 25 | 0 | — |
| D3Đ | O_D3N_LINH_TIP/pass_up | — | dorm_ceiling | 25 | 0 | — |
| D4S | S_QUOTA_SHIFT/comply<br>O_D4M_INTERROGATE_NEWCOMER/motions<br>O_D4M_THACH_NAME/stall | — | dorm_ceiling | 50 | 20 | — |
| D4C | (bỏ qua 1 optional) | PR_DUC_CONFIDES_LINH | dorm_ceiling | 50 | 20 | — |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 50 | 20 | — |
| D5S | S_QUOTA_SHIFT/comply | — | thach | 55 | 20 | — |
| D5C | — | — | thach | 55 | 20 | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 55 | 20 | — |
| D6S | O_D6M_THACH_OFFER/refuse<br>S_QUOTA_SHIFT/comply | — | thach | 60 | 45 | — |
| D6C | — | — | thach | 60 | 45 | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 60 | 45 | — |
| D7S | S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 60 | 45 | — |
| D7C | S_D7A_LOADING/o_cab | — | thach | 65 | 45 | — |
| D7Đ | — | — | thach | 65 | 45 | — |

| ending | captive | operator |
|---|---|---|
| E_ESCAPE (THOÁT) | ✅ | ✅ |
| E_EXPOSURE (PHƠI BÀY) | ✅ | ✅ |
| E_INVERSION (ĐẢO VAI) | ✅ | ✅ |
| E_TRANSFER (CHUYỂN GIAO) | ✅ | ✅ |

## 4. Năm NPC tự hành động (NPC Intent Layer)

| NPC | drives | actions khai báo | actions đã bắn trong corpus (run) | propagation rules là nguồn |
|---|---|---|---|---|
| thach | D_THACH_FIND_LEAK, D_THACH_EXIT_WITH_MONEY | A_THACH_RAID_WHERE_I_BELIEVE, A_THACH_RECRUIT | A_THACH_RAID_WHERE_I_BELIEVE (21)<br>A_THACH_RECRUIT (18) | 2 |
| vu | D_VU_STAY_ABOVE, D_VU_PROTECT_DUC | A_VU_ROUTINE_CEILING_CHECK, A_VU_SHIELD_PHONE, A_VU_HAND_UP, A_VU_SEES_DUC_CALL | A_VU_ROUTINE_CEILING_CHECK (34)<br>A_VU_HAND_UP (2)<br>A_VU_SHIELD_PHONE (3)<br>A_VU_SEES_DUC_CALL (1) | 1 |
| mai | D_MAI_SELF_RESCUE | A_MAI_APPROACH_OPERATOR, A_MAI_SEARCH_DORM | A_MAI_SEARCH_DORM (5)<br>A_MAI_APPROACH_OPERATOR (6) | 0 |
| linh | D_LINH_EARN_RELEASE, D_LINH_PROTECT_DUC | A_LINH_HANDS_PHONE_UP | A_LINH_HANDS_PHONE_UP (1) | 4 |
| duc | D_DUC_CALL_MOTHER | A_DUC_TRY_CALL | A_DUC_TRY_CALL (1) | 1 |

Zero-player (captive, mọi optional bỏ qua, forced = `defaultChoice`): ending **E_TRANSFER**, 16 mutation do thế giới tự tạo, NPC actions: A_THACH_RAID_WHERE_I_BELIEVE, A_VU_ROUTINE_CEILING_CHECK, A_THACH_RECRUIT.

Zero-player (operator, mọi optional bỏ qua, forced = `defaultChoice`): ending **E_TRANSFER**, 10 mutation do thế giới tự tạo, NPC actions: A_THACH_RAID_WHERE_I_BELIEVE, A_VU_ROUTINE_CEILING_CHECK.

## 5. Definition of Done — đối chiếu

| tiêu chí | | bằng chứng |
|---|---|---|
| 2 vai chơi được | ✅ | mục 2 (cả hai vai có ending trong mọi run) + launch tests (CLI/web) |
| 5 NPC tự hành động | ✅ | mục 4 |
| Mô phỏng 7 ngày (21 segment) | ✅ | mục 2: mọi run kết thúc bằng một ending; CHUYỂN GIAO/ĐẢO VAI tại D7Đ (seg 20), PHƠI BÀY tại D7S (seg 18), THOÁT tại D6Đ (seg 17) theo thiết kế (cửa sổ trốn đêm 6) |
| 4 ending đạt được (cả hai vai) | ✅ | mục 3 |
| Replay tất định | ✅ | mục 2 + test REPLAY/ORDER (đảo thứ tự file content không đổi kết quả) |
| Save/load | ✅ | mục 2: 861 save round-trip |
| Cô lập tri thức người chơi | ✅ | mục 2: 861 view, 0 rò rỉ + test LEAK |
| Test pass | ✅ | mục 1 |
| Chạy local | ✅ | tests/launch.test.mjs: server 127.0.0.1 + CLI auto/script/interactive/load |

**Không phát hiện vấn đề nào khi sinh tài liệu này.**


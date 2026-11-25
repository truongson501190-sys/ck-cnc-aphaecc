# 📋 ROADMAP HOÀN THIỆN HỆ THỐNG KHO

> **Dự án:** BC-kho-ckcnc
> **Mục tiêu:** Chuyển từ localStorage → Supabase ledger, sửa lỗi tồn kho, thêm nghiệp vụ đổi cũ lấy mới
> **Ngày tạo:** 2026-10-14

---

## 🎯 NGUYÊN TẮC XUYÊN SUỐT

1. **Supabase ledger là nguồn chân lý duy nhất** — mọi giao dịch kho phải ghi vào đây
2. **localStorage chỉ là cache tạm** — sẽ bị loại bỏ dần
3. **Không sửa lịch sử** — ledger là append-only, muốn sửa phải tạo reversal entry
4. **Validate ở 2 lớp** — vừa ở UI, vừa ở RPC (server-side)
5. **Kho chỉ track số lượng** — bán phế liệu do bên khác lo, không tính giá tại kho

---

## 📊 TRẠNG THÁI HIỆN TẠI (Snapshot 2026-10-14)

### ✅ Đã hoàn thành
- [x] Migration 001 — Tạo `stock_ledger` + views + RPC cơ bản
- [x] Migration 011 — Hardening: khóa RLS, check âm kho, `get_on_hand`, `p_document_id`
- [x] Patch `types.ts` — thêm `documentId`
- [x] Patch `postingApi.ts` — fix idempotency key, truyền `document_id`
- [x] Patch `stock.ts` — đảo thứ tự post ledger → upsert document
- [x] Fix `tsconfig.json` — bỏ `baseUrl`
- [x] Drop overload `post_warehouse_movement` + `post_stock_movement`

### 🔴 Vấn đề tồn đọng
- [ ] `XuatKho.tsx` **không ghi ledger** → tồn kho không giảm
- [ ] `ChuyenKho.tsx` **không ghi ledger** → không chuyển được tồn
- [ ] `InventoryCount.tsx` **không ghi ledger** → điều chỉnh vô hiệu
- [ ] `StockCard.tsx` + `TransactionHistory.tsx` + `WarehouseReport.tsx` đọc localStorage → số liệu SAI
- [ ] Không có audit log
- [ ] Không validate tồn kho trước khi xuất/chuyển
- [ ] Chưa có nghiệp vụ đổi cũ lấy mới
- [ ] Chưa có báo cáo NXT, báo cáo giá trị tồn kho
- [ ] 62 lỗi TypeScript cũ (không liên quan kho, nhưng nên dọn)

### ❓ Câu hỏi chưa chốt
- [ ] **Q1.** Khối lượng phế (kg) — có track không?
  - [ ] A. Chỉ số lượng, bỏ kg
  - [ ] B. Nhập số lượng + kg (kg optional)
- [ ] **Q2.** Máy + dự án — nhập ở đâu?
  - [ ] A. 1 lần cho cả phiếu
  - [ ] B. Riêng từng dòng

---

# 🗺️ ROADMAP TỔNG THỂ

PHASE 1: Hạ tầng Database ──────── 1 ngày 🔴 Ưu tiên cao
PHASE 2: Refactor UI (6 files) ─── 3–4 ngày 🔴 Ưu tiên cao
PHASE 2.5: Đổi cũ lấy mới ──────── 1–2 ngày 🟠 Quan trọng
PHASE 3: Migration dữ liệu cũ ──── 1 ngày 🟠 Quan trọng
PHASE 4: Audit log & Báo cáo ───── 3–5 ngày 🟡 Nên làm
PHASE 5: Cleanup & Polish ──────── 1 ngày 🟢 Cuối cùng


---

# 📌 PHASE 1 — HẠ TẦNG DATABASE

**Mục tiêu:** Chuẩn bị database cho toàn bộ nghiệp vụ mới
**Thời gian:** 1 ngày
**Blocker:** Phải xong trước khi làm Phase 2

## Bước 1.1 — Migration 012: ADJUSTMENT + Workflow

- [ ] Tạo file `supabase/migrations/012_adjustment_and_workflow.sql`
- [ ] Paste nội dung SQL (đã có script)
- [ ] Chạy trên Supabase SQL Editor
- [ ] Verify A: `post_warehouse_movement` có **1 version duy nhất** với `p_document_id`
- [ ] Verify B: `stock_documents` có **14 cột mới** (workflow_status, approved_by, ..., metadata)
- [ ] Verify C: Test RPC ADJUSTMENT với `p_quantity := -5` → trả JSONB, không lỗi
- [ ] Xóa test data sau khi verify
- [ ] Báo lại kết quả

## Bước 1.2 — Migration 013: Tool Returns (Đổi cũ)

**⚠️ Cần chốt Q1 + Q2 trước khi làm bước này**

- [ ] Tạo file `supabase/migrations/013_tool_returns.sql`
- [ ] Chạy trên Supabase SQL Editor
- [ ] Verify: bảng `tool_returns` tồn tại với đủ cột
- [ ] Verify: 2 view `v_tool_consumption_by_machine`, `v_tool_consumption_by_project`
- [ ] Test insert 1 record tool_return

## Bước 1.3 — Patch TS types

- [ ] Sửa `src/core/stock-ledger/types.ts`: thêm `'ADJUSTMENT'` vào `WarehouseMovementKind`
- [ ] Sửa `src/core/stock-ledger/postingApi.ts`: thêm case ADJUSTMENT (giữ dấu +/-, không ABS)
- [ ] Sửa `src/api/stock.ts`: thêm `mapTransactionTypeToKind('adjustment')` → `'ADJUSTMENT'`

## Bước 1.4 — Tạo API toolReturn

- [ ] Tạo file `src/api/toolReturn.ts`
- [ ] Export `recordToolReturn(input)`
- [ ] Export `getToolReturns(filter)`
- [ ] Export `getConsumptionByMachine(machineId, month)`
- [ ] Export `getConsumptionByProject(projectId, month)`

## Bước 1.5 — Verify Phase 1

- [ ] `pnpm tsc --noEmit` — không có lỗi mới trong `stock-ledger` hoặc `api/`
- [ ] Test manual: gọi ADJUSTMENT qua Supabase SQL Editor
- [ ] Test manual: gọi `recordToolReturn` từ console

**✅ Tiêu chí hoàn thành Phase 1:**
- 2 migration (012, 013) chạy thành công
- TS build không lỗi trong kho
- RPC ADJUSTMENT hoạt động đúng
- API toolReturn hoạt động

---

# 📌 PHASE 2 — REFACTOR UI (6 FILES)

**Mục tiêu:** Chuyển hết UI kho từ localStorage → Supabase API
**Thời gian:** 3–4 ngày
**Nguyên tắc:** Làm từng file, test xong mới sang file kế

## Bước 2.0 — API Services

- [ ] Tạo `src/api/stockDocument.ts` — CRUD `stock_documents` + workflow states
  - [ ] `createDocument(input)` → tạo phiếu pending
  - [ ] `updateWorkflowStatus(id, status, user)` → chuyển trạng thái
  - [ ] `listDocuments(filter)` → load danh sách
  - [ ] `getDocumentById(id)` → load chi tiết
  - [ ] `deleteDocument(id)` → xóa (hoặc đánh dấu canceled)
- [ ] Tạo `src/api/inventoryCount.ts` — CRUD phiếu kiểm kê
- [ ] Tạo `src/api/warehouse.ts` — get kho, get tồn, validate tồn kho
  - [ ] `getWarehouses()` — load danh sách kho từ DB
  - [ ] `getProducts()` — load danh sách sản phẩm từ DB
  - [ ] `validateStock(productId, warehouseId, qty)` — kiểm tra đủ tồn

## Bước 2.1 — Rewrite `NhapKho.tsx` (làm mẫu)

- [ ] Bỏ `localStorage.getItem('warehouseImports')` trong `loadImports`
- [ ] Thay bằng gọi API `listDocuments({ type: 'IN' })`
- [ ] Form `WarehouseImport` đã có `onSubmit` → giữ nguyên, chỉ sửa page truyền `handleSubmitAPI`
- [ ] **Sửa `WarehouseImport.tsx`**: submit 1 transaction với mảng `items[]` (không loop)
- [ ] Test 1: nhập 1 phiếu → check `stock_ledger` + `stock_documents`
- [ ] Test 2: nhập phiếu có 2 dòng cùng SP → ledger có 2 dòng
- [ ] Test 3: nhập rồi F5 → dữ liệu vẫn còn

## Bước 2.2 — Rewrite `XuatKho.tsx` (quan trọng nhất)

- [ ] Bỏ localStorage, dùng API `listDocuments({ type: 'OUT' })`
- [ ] Workflow: `pending → approved → transferred → received`
- [ ] **Ghi ledger khi status = `transferred`** (không phải khi approve)
- [ ] Validate tồn kho trước khi chuyển sang `transferred`
- [ ] Block nếu tồn âm → toast báo lỗi `insufficient stock`
- [ ] **Sửa `WarehouseExport.tsx`**: submit 1 transaction với mảng items
- [ ] Truyền `onSubmit` cho form `WarehouseExport`
- [ ] Test 5 case:
  - [ ] Nhập 100 → xuất 30 → tồn = 70
  - [ ] Xuất quá tồn → báo lỗi
  - [ ] Duyệt → chưa trừ tồn
  - [ ] Xác nhận xuất → mới trừ tồn
  - [ ] F5 → dữ liệu vẫn còn

## Bước 2.3 — Rewrite `ChuyenKho.tsx`

- [ ] Bỏ localStorage, dùng API
- [ ] Ghi ledger TRANSFER khi status = `transferred`
- [ ] Validate kho nguồn có đủ hàng
- [ ] **Sửa `WarehouseTransfer.tsx`**: submit 1 transaction với mảng items
- [ ] Test: chuyển 10 → kho A giảm 10, kho B tăng 10

## Bước 2.4 — Rewrite `InventoryCount.tsx`

- [ ] Bỏ localStorage, dùng API
- [ ] Khi "Áp dụng chênh lệch" → gọi `postStockDocument` với `kind = 'ADJUSTMENT'`
- [ ] Ghi ledger với `qty_delta = -difference` (giữ dấu)
- [ ] Test: kiểm kê thiếu 3 → ledger có ADJUSTMENT `-3`
- [ ] Test: kiểm kê dư 5 → ledger có ADJUSTMENT `+5`

## Bước 2.5 — Rewrite `StockCard.tsx`

- [ ] Bỏ đọc localStorage
- [ ] Đọc từ `stock_ledger` qua `getMovements({ productId })`
- [ ] Tính running stock từ ledger
- [ ] Test: tồn cuối thẻ kho = tồn kho thực tế

## Bước 2.6 — Rewrite `TransactionHistory.tsx` + `WarehouseReport.tsx`

- [ ] Bỏ đọc localStorage
- [ ] Đọc từ `stock_documents` + `stock_ledger`
- [ ] Filter theo type, date range, warehouse
- [ ] Test: giao dịch mới xuất hiện ngay

## Bước 2.7 — Verify Phase 2

- [ ] `pnpm build` pass
- [ ] Test end-to-end: nhập → xuất → chuyển → kiểm kê → xem thẻ kho → xem lịch sử
- [ ] Kiểm tra tồn kho khớp giữa UI và query SQL
- [ ] `SELECT COUNT(*) FROM stock_ledger` — so với số phiếu UI

**✅ Tiêu chí hoàn thành Phase 2:**
- Nhập 100 → tồn = 100
- Xuất 30 → tồn = 70
- Chuyển 20 từ A sang B → A giảm 20, B tăng 20
- Kiểm kê thiếu 5 → ADJUSTMENT -5 → tồn giảm 5
- Thẻ kho hiển thị đúng lịch sử
- Lịch sử giao dịch có đủ các loại
- Không còn localStorage nào cho kho

---

# 📌 PHASE 2.5 — NGHIỆP VỤ ĐỔI CŨ LẤY MỚI

**Mục tiêu:** Thêm tính năng đổi công cụ cũ lấy mới (1:1), ghi nhận số lượng + kg thu về
**Thời gian:** 1–2 ngày
**Lưu ý:** Không track giá phế — bên khác lo

## Bước 2.5.1 — Form xuất kho mở rộng

- [ ] Thêm checkbox "Có đổi cũ lấy mới" trong `XuatKho.tsx`
- [ ] Khi tick → hiện bảng nhập: SL cấp, SL cũ thu về, tình trạng, kg
- [ ] Validate: SL cũ <= SL cấp (cảnh báo nếu lệch)
- [ ] Thêm dropdown chọn Máy + Dự án (theo Q2 đã chốt)
- [ ] Khi submit → gọi `postStockDocument` (xuất mới) + `recordToolReturn` (nhận cũ)

## Bước 2.5.2 — Page `ToolReturns.tsx` (nhật ký thu hồi)

- [ ] Tạo page mới hiển thị danh sách tool returns
- [ ] Filter theo: máy, dự án, ngày, sản phẩm
- [ ] Cột: Ngày | Kho | Sản phẩm | SL | Kg | Máy | Dự án | Người trả | Người nhận
- [ ] Action: Xem chi tiết (KHÔNG có "đánh dấu bán phế")
- [ ] Export Excel

## Bước 2.5.3 — Báo cáo hao hụt công cụ

- [ ] Tạo page `ToolConsumptionReport.tsx`
- [ ] Tab 1: Hao hụt theo máy — query `v_tool_consumption_by_machine`
- [ ] Tab 2: Hao hụt theo dự án — query `v_tool_consumption_by_project`
- [ ] Tab 3: Tổng hợp phế liệu theo tháng (số lượng + kg)
- [ ] Export Excel + biểu đồ

**✅ Tiêu chí hoàn thành Phase 2.5:**
- User có thể tick "đổi cũ lấy mới" khi xuất kho
- Nhật ký thu hồi hiển thị đủ giao dịch
- Báo cáo hao hụt theo máy/dự án chính xác
- Ghi nhận đủ **số lượng** cũ thu về

---

# 📌 PHASE 3 — MIGRATION DỮ LIỆU CŨ

**Mục tiêu:** Chuyển dữ liệu localStorage lên Supabase (chạy 1 lần)
**Thời gian:** 1 ngày

## Bước 3.1 — Chuẩn bị script migrate

- [ ] Tạo `src/scripts/migrateLocalStorageToSupabase.ts`
- [ ] Đọc localStorage: `warehouseImports`, `warehouseExports`, `warehouseTransfers`, `inventoryCounts`, `adjustments`
- [ ] Map mỗi record → gọi `postStockDocument` với idempotency key
- [ ] Flag `erp_migrated_v3 = done`
- [ ] Log chi tiết

## Bước 3.2 — Backup trước khi migrate

- [ ] Export localStorage ra file JSON: `backup-localStorage-{date}.json`
- [ ] Lưu file backup ra **ngoài project**

## Bước 3.3 — Chạy migrate

- [ ] Chạy script trong dev
- [ ] Verify: số phiếu ledger = số phiếu backup
- [ ] Verify: tồn kho khớp

## Bước 3.4 — Verify cuối

- [ ] Query `SELECT COUNT(*) FROM stock_ledger`
- [ ] Query `SELECT COUNT(*) FROM stock_documents`
- [ ] Query `SELECT * FROM v_stock_on_hand` — không có âm bất thường
- [ ] So sánh với báo cáo cũ

**✅ Tiêu chí:** Tất cả dữ liệu cũ nằm trong Supabase, báo cáo khớp.

---

# 📌 PHASE 4 — AUDIT LOG & BÁO CÁO

**Mục tiêu:** Bịt lỗ hổng kiểm soát + thêm báo cáo quan trọng
**Thời gian:** 3–5 ngày

## Bước 4.1 — Migration 014: Audit Log

- [ ] Bảng `audit_logs` (id, user_id, action, table, record_id, old_data, new_data, ip, timestamp)
- [ ] Trigger trên `stock_ledger`, `stock_documents`, `tool_returns`
- [ ] RLS: chỉ admin xem được

## Bước 4.2 — RLS thật sự

- [ ] Thêm bảng `user_roles` trên Supabase
- [ ] Sửa RLS policies: check role thực sự
- [ ] Test: user không có quyền → không insert được

## Bước 4.3 — Rollback phiếu

- [ ] API `reverseDocument(documentId)`
- [ ] Tạo reversal entry trong ledger
- [ ] UI: nút "Hủy phiếu" (chỉ admin)

## Bước 4.4 — Báo cáo NXT

- [ ] Trang `InventoryMovementReport.tsx`
- [ ] Filter: kỳ, kho, mặt hàng
- [ ] Cột: Tồn đầu | Nhập | Xuất | Chuyển | Điều chỉnh | Tồn cuối
- [ ] Export Excel

## Bước 4.5 — Báo cáo giá trị tồn kho

- [ ] Trang `InventoryValuationReport.tsx`
- [ ] Tính theo bình quân gia quyền HOẶC FIFO
- [ ] Hiển thị giá trị tồn tại thời điểm
- [ ] So sánh giữa các kỳ

## Bước 4.6 — Cảnh báo tồn kho tối thiểu

- [ ] Thêm field `minimum_stock` vào Categories
- [ ] Cronjob/trigger check → notification
- [ ] Badge cảnh báo trên dashboard

**✅ Tiêu chí:** Có audit trail đầy đủ, báo cáo NXT + giá trị tồn kho hoạt động.

---

# 📌 PHASE 5 — CLEANUP & POLISH

**Mục tiêu:** Dọn dẹp code cũ, tối ưu
**Thời gian:** 1 ngày

## Bước 5.1 — Xóa code legacy

- [ ] Xóa `src/pages/NhapKho.tsx`, `XuatKho.tsx`, `ChuyenKho.tsx`, `TonKho.tsx`, `XuatDau.tsx`
- [ ] Xóa `src/components/inventory/*` legacy
- [ ] Xóa `src/core/stock-ledger/legacyMigration.ts`
- [ ] Xóa `STORAGE_KEYS` không còn dùng

## Bước 5.2 — Dọn 62 lỗi TypeScript cũ

- [ ] Fix từng file một
- [ ] `pnpm tsc --noEmit` → 0 lỗi

## Bước 5.3 — Documentation

- [ ] `docs/warehouse-module.md` — kiến trúc kho
- [ ] `docs/workflow.md` — luồng nhập/xuất/chuyển/đổi
- [ ] Update `README.md`

**✅ Tiêu chí:** Code sạch, không lỗi TS, có tài liệu.

---

# 🎯 CHECKLIST TỔNG (Tick dần)

## Phase 1 — Hạ tầng Database
- [ ] 1.1 Migration 012 (ADJUSTMENT + workflow)
- [ ] 1.2 Migration 013 (tool_returns)
- [ ] 1.3 Patch types.ts + postingApi.ts
- [ ] 1.4 API toolReturn.ts
- [ ] 1.5 Verify Phase 1

## Phase 2 — Refactor UI
- [ ] 2.0 API services
- [ ] 2.1 NhapKho.tsx
- [ ] 2.2 XuatKho.tsx
- [ ] 2.3 ChuyenKho.tsx
- [ ] 2.4 InventoryCount.tsx
- [ ] 2.5 StockCard.tsx
- [ ] 2.6 TransactionHistory.tsx + WarehouseReport.tsx
- [ ] 2.7 Verify Phase 2

## Phase 2.5 — Đổi cũ lấy mới
- [ ] 2.5.1 Form xuất mở rộng
- [ ] 2.5.2 Page ToolReturns.tsx
- [ ] 2.5.3 Báo cáo hao hụt

## Phase 3 — Migration dữ liệu
- [ ] 3.1 Script migrate
- [ ] 3.2 Backup localStorage
- [ ] 3.3 Chạy migrate
- [ ] 3.4 Verify

## Phase 4 — Audit & Báo cáo
- [ ] 4.1 Migration 014 (audit_logs)
- [ ] 4.2 RLS thật sự
- [ ] 4.3 Rollback phiếu
- [ ] 4.4 Báo cáo NXT
- [ ] 4.5 Báo cáo giá trị tồn
- [ ] 4.6 Cảnh báo tồn tối thiểu

## Phase 5 — Cleanup
- [ ] 5.1 Xóa code legacy
- [ ] 5.2 Dọn 62 lỗi TS
- [ ] 5.3 Documentation

---

# 🚦 ĐIỀU KIỆN BẮT ĐẦU

**Chỉ bắt đầu Phase 1 khi:**
1. ✅ Bạn đã đọc và đồng ý roadmap này
2. ✅ Bạn đã trả lời 2 câu hỏi chưa chốt (Q1, Q2)
3. ✅ Bạn đã lưu ROADMAP.md vào project
4. ✅ Bạn đã sẵn sàng dành 1–2 giờ cho Phase 1

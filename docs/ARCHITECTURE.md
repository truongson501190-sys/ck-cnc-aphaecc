# Architecture overview

## Frontend

The browser application is a React + TypeScript SPA built with Vite. `src/main.tsx` mounts `App`; `src/App.tsx` installs the router, React Query, tooltips, notifications, authentication, and lazy-loaded feature routes. Route paths are centralized in `src/modules/erp/routes.ts`, and guarded pages use `ProtectedRoute`.

Authentication is implemented by `src/contexts/AuthContext.tsx`. It loads employees and permissions through the employee and permission services, which query Supabase first and use local browser storage as a fallback. The active session is kept in `sessionStorage` or `localStorage` depending on Remember Me. Other features still use a mix of Supabase and browser storage; local storage has not been fully removed.

Feature code is organized under `src/modules/`, `src/features/`, and shared `src/components/`, `src/hooks/`, and `src/lib/`. For example, production planning UI lives under `src/modules/manufacturing/`, with extracted domain and parsing utilities in `src/features/production-plan/`.

## Supabase

The frontend accesses Supabase directly through its client modules. Browser configuration is supplied with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without valid values, some services fall back to local storage; pages that require direct Supabase access may not be usable.

Database changes belong to `supabase/migrations/`. The two SQL files at the repository root are legacy setup material, not an alternative migration sequence; check `enable-supabase.cjs` for the current setup guidance.

## Optional Python AI service

`backend_ai/main.py` exposes the FastAPI service and its AI, learning, ERP import, and assistant routers. Its default port is 8002. `backend_ai/config/settings.py` loads environment configuration and sets data/model/log paths.

The AI service has a separate SQLite store at `backend_ai/data/erp_ai.db` and persistent Chroma data under `backend_ai/data/chroma`. Its ERP connector defaults to the mock adapter; Supabase is selected only when configured. Alembic reads `DATABASE_URL`, so its target should be checked independently rather than assumed to be the local SQLite store.

OCR and vision contain multiple engines and adapters. Keep their code and dependencies until the runtime path and benchmark results are reconciled. The unused layout analyzer and legacy `memor` store were moved to `backend_ai/archive/`; the active memory implementation remains under `backend_ai/engines/memory/`.

## Local utilities

`scripts/smoke.js` and `scripts/smoke.cjs` use the root `reset-localStorage.js` as a browser test fixture. It clears browser storage before seeding test state. `migrate.js` is a one-time local data migration; review its source and back up data before running it.
# Architecture — BC-kho-ckcnc

## 1. Tổng quan
Hệ thống quản lý kho + sản xuất CNC + AI OCR cho xưởng cơ khí.

## 2. Stack
| Layer | Công nghệ |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind + shadcn/ui |
| **Backend AI** | FastAPI + Python 3.11 |
| **Database chính** | Supabase PostgreSQL |
| **Vector DB** | ChromaDB (cho RAG/chatbot) |
| **Deploy** | Vercel (frontend) |

## 3. Cấu trúc thư mục

## 4. Database
| Database | Vai trò | Khi nào dùng |
|---|---|---|
| Supabase PostgreSQL | Business data chính | Mọi CRUD từ frontend |
| SQLite | AI session log, cache | Backend AI runtime |
| ChromaDB | Vector embedding | RAG query cho chatbot |

## 5. Backend AI Engines
| Engine | Vai trò | Status |
|---|---|---|
| analytics | Phân tích dữ liệu | ✅ Đang dùng (5) |
| assistant | Chatbot | ✅ Đang dùng (2) |
| automation | Tự động hóa | ✅ Đang dùng (2) |
| brain | Interpreter | ✅ Đang dùng (1) |
| knowledge | Knowledge base | ✅ Đang dùng (1) |
| learning | Learning | ⚠️ Stub — chưa hoạt động |
| memory | Memory store | ✅ Đang dùng (4) |
| ocr | OCR | ✅ Đang dùng (1) |
| reasoning | Reasoning | ✅ Đang dùng (1) |
| validation | Validate | ✅ Đang dùng (1) |
| vision | Vision | ✅ Đang dùng (1) |
| pipeline.py | Pipeline xử lý document | ✅ Đang dùng (1) |

## 6. Data Flow
1. Import Excel → Frontend parse → Supabase
2. Upload PDF/ảnh → OCR engine → Parse → Supabase
3. Chatbot → Assistant engine → RAG ChromaDB → Trả lời
4. Production Plan → Frontend → Supabase → Backend AI (nếu cần)

## 7. Module Status
| Module | Status |
|---|---|
| Production Plan | ✅ Đang chạy |
| Machines Management | ✅ Đang chạy |
| Warehouse | ✅ Đang chạy |
| Stock Ledger | ✅ Đang chạy |
| Reports | ✅ Đang chạy |
| ERP Connector | ⚠️ Chưa tích hợp |
| Chatbot | ❓ Cần xác nhận |
| Learning | ❌ Stub |

## 8. Quy ước
- Master data → `src/modules/master-data/`
- Feature modules → `src/modules/<tên>/`
- Shared components → `src/components/`
- Backend AI → `backend_ai/` (không import từ frontend)
- Database schema → chỉ sửa qua `supabase/migrations/`

## 9. Deployment
- Frontend: Vercel
- Backend AI: Cần cấu hình riêng
- Database: Supabase cloud

## 10. Tài liệu
- `ROADMAP.md` — lộ trình phát triển
- `data-relationship-diagram.html` — ERD visualization
- `docs/_planning/` — planning docs

---
Cập nhật lần cuối: 2026-11-25

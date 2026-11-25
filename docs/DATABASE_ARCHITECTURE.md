# Database architecture

## Data stores

| Store | Purpose | Configuration / location |
| --- | --- | --- |
| Supabase/PostgreSQL | Shared ERP data used by the browser app | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Browser storage | Session state and compatibility/fallback data used by some frontend services | `localStorage` and `sessionStorage` |
| SQLite | AI-service documents, corrections, learning samples/patterns, and analytics events | `backend_ai/data/erp_ai.db` by default |
| ChromaDB | AI-service vector data | `backend_ai/data/chroma` by default |

The AI service's SQLite and Chroma stores are independent of the application's Supabase database. Alembic uses `DATABASE_URL`; verify its configured target before running migrations.

## Supabase migration source

Use the ordered SQL history in `supabase/migrations/` for database changes. The current directory contains migrations numbered 001–016 with gaps in the sequence. Do not infer that a missing number indicates a required migration.

The root-level `supabase-schema.sql` and `supabase-migration-relational.sql` are legacy SQL files with a dependency between them. They are not a second current migration chain and should not be run against an existing database. Follow `enable-supabase.cjs` and inspect the deployed migration history before applying any change.

## Frontend data access

Employee and permission services use Supabase tables (`employees` and `user_permissions`) when configured, with local-storage fallbacks. Other modules access Supabase and browser storage directly, so the application does not yet have one uniform repository layer or one universal source of truth.

## Schema consistency warning

The machine-management UI reads and writes camelCase fields such as `maMay`, `tenMay`, and `createdAt`. Migration `004_machines_categories_projects.sql` defines the corresponding machine fields as `ma_may`, `ten_may`, and `created_at`. Migration `013_tool_returns.sql` also refers to quoted camelCase machine columns. This is inconsistent for a database created only from the checked-in migration chain. Verify the deployed `machines` schema and reconcile the application and migration history before applying or relying on these paths; no live database was inspected or modified during this audit.

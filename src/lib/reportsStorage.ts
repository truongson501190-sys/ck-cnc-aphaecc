import { syncDataToSupabase, loadDataFromSupabase, getSupabase } from '@/supabase';
import type { ProductionReport } from '@/types/production';
import type { MaintenanceReport } from '@/types/maintenance';
import type { QcReport } from '@/types/qc';

export const REPORT_CONFIG = {
  production: {
    storageKey: 'productionReports',
    table: 'production_reports',
  },
  maintenance: {
    storageKey: 'maintenanceReports',
    table: 'maintenance_reports',
  },
  qc: {
    storageKey: 'qcReports',
    table: 'qc_reports',
  },
} as const;

export type ReportKind = keyof typeof REPORT_CONFIG;

type ReportByKind = {
  production: ProductionReport;
  maintenance: MaintenanceReport;
  qc: QcReport;
};

function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Gộp local + cloud theo id, giữ bản có createdAt mới hơn. */
function mergeById<T extends { id: string; createdAt?: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of cloud) map.set(row.id, row);
  for (const row of local) {
    const existing = map.get(row.id);
    if (!existing) {
      map.set(row.id, row);
      continue;
    }
    const localTs = new Date(row.createdAt || 0).getTime();
    const cloudTs = new Date(existing.createdAt || 0).getTime();
    map.set(row.id, localTs >= cloudTs ? row : existing);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

/** Đọc localStorage trước, sau đó merge từ Supabase nếu có kết nối. */
export async function loadReports<K extends ReportKind>(kind: K): Promise<ReportByKind[K][]> {
  const { storageKey, table } = REPORT_CONFIG[kind];
  const local = readLocal<ReportByKind[K]>(storageKey);

  if (!navigator.onLine || !getSupabase()) {
    return local;
  }

  try {
    const cloud = await loadDataFromSupabase(table);
    if (cloud && Array.isArray(cloud) && cloud.length > 0) {
      const merged = mergeById(local, cloud as unknown as ReportByKind[K][]);
      localStorage.setItem(storageKey, JSON.stringify(merged));
      if (merged.length !== cloud.length) {
        void syncDataToSupabase(table, merged as unknown as Record<string, unknown>[]);
      }
      return merged;
    }
  } catch (e) {
    console.warn(`[reportsStorage] Cloud load failed for ${kind}:`, e);
  }

  return local;
}

/** Ghi localStorage và đẩy lên Supabase (best-effort). */
export async function saveReports<K extends ReportKind>(
  kind: K,
  reports: ReportByKind[K][]
): Promise<void> {
  const { storageKey, table } = REPORT_CONFIG[kind];
  localStorage.setItem(storageKey, JSON.stringify(reports));

  if (!navigator.onLine || !getSupabase()) return;

  try {
    await syncDataToSupabase(table, reports as unknown as Record<string, unknown>[]);
  } catch (e) {
    console.warn(`[reportsStorage] Cloud sync failed for ${kind}:`, e);
  }
}

/** Đồng bộ một báo cáo mới/cập nhật (upsert theo id). */
export async function persistReport<K extends ReportKind>(
  kind: K,
  reports: ReportByKind[K][]
): Promise<void> {
  await saveReports(kind, reports);
}

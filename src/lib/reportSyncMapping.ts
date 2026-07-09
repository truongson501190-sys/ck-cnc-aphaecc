import type { RawRecord } from '@/types/common';

export function buildProductionReportDbPayload(item: RawRecord): RawRecord {
  return {
    id: item.id,
    ngayThang: item.ngayThang ?? item.ngay_thang,
    maySanXuat: item.maySanXuat ?? item.may_san_xuat,
    duAn: item.duAn ?? item.du_an,
    khach_hang: item.khach_hang ?? item.khachHang,
    banVeSo: item.banVeSo ?? item.ban_ve_so,
    chiTietSo: item.chiTietSo ?? item.chi_tiet_so,
    tenChiTiet: item.tenChiTiet ?? item.ten_chi_tiet,
    noiDungGiaCong: item.noiDungGiaCong ?? item.noi_dung_gia_cong,
    soLuongHoanThanh: item.soLuongHoanThanh ?? item.so_luong_hoan_thanh ?? 0,
    vatLieu: item.vatLieu ?? item.vat_lieu,
    nguyenCongSo: item.nguyenCongSo ?? item.nguyen_cong_so,
    toolEntries: item.toolEntries ?? item.tool_entries ?? [],
    work_time_entries: item.work_time_entries ?? item.workTimeEntries ?? [],
    setup_time_entries: item.setup_time_entries ?? item.setupTimeEntries ?? [],
    ca: item.ca ?? '',
    cpMay: item.cpMay ?? item.cp_may ?? 0,
    cpDaoCu: item.cpDaoCu ?? item.cp_dao_cu ?? 0,
    nguoiVanHanh: item.nguoiVanHanh ?? item.nguoi_van_hanh,
    nguoiKiemTra: item.nguoiKiemTra ?? item.nguoi_kiem_tra,
    tgTrenCa: item.tgTrenCa ?? item.tg_tren_ca,
    status: item.status ?? 'pending',
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  };
}

export function buildProductionReportStatusUpdatePayload(status: string, updatedAt = new Date().toISOString()): RawRecord {
  return {
    status,
    updatedAt,
  };
}

export function parseImportedToolEntries(row: Record<string, any>) {
  const rawNames = row['Tên dao'] ?? row['Tên Dao'] ?? row['tenDao'] ?? '';
  const names = String(rawNames)
    .split(/[,;|/]/)
    .map(value => value.trim())
    .filter(Boolean);

  const slCap = Number(row['SL cấp'] ?? row['SL cap'] ?? 0) || 0;
  const slSuDung = Number(row['sử dụng'] ?? row['su dung'] ?? row['SL sử dụng'] ?? 0) || 0;
  const hong = Number(row['Hỏng'] ?? row['Hong'] ?? 0) || 0;
  const donVi = String(row['ĐV'] ?? row['Đơn vị'] ?? row['Don vi'] ?? 'cái');
  const donGia = Number(String(row['Đơn giá'] ?? row['Don gia'] ?? row['Đơn giá (VND)'] ?? 0).replace(/[^0-9]/g, '')) || 0;
  const thanhTien = Number(String(row['Thành tiền'] ?? row['Thanh tien'] ?? row['Thành tiền (VND)'] ?? 0).replace(/[^0-9]/g, '')) || 0;

  if (names.length === 0) {
    return [];
  }

  return names.map((name, index) => ({
    tenDao: name,
    slCap: index === 0 ? slCap : 0,
    slSuDung: index === 0 ? slSuDung : 0,
    hong: index === 0 ? hong : 0,
    donVi,
    donGia: index === 0 ? donGia : 0,
    thanhTien: index === 0 ? thanhTien : 0,
  }));
}

/** Map báo cáo local (camelCase) → cột Supabase (snake_case). Giữ `id` làm PK. */
export function mapReportToDb(table: string, item: RawRecord): RawRecord | null {
  if (table === 'production_reports') {
    return buildProductionReportDbPayload(item);
  }

  if (table === 'maintenance_reports') {
    return {
      id: item.id,
      ngay: item.ngay,
      machine_name: item.machineName ?? item.machine_name,
      equipment_code: item.equipmentCode ?? item.equipment_code,
      technician: item.technician,
      job_content: item.jobContent ?? item.job_content,
      reason: item.reason,
      corrective_action: item.correctiveAction ?? item.corrective_action,
      replacement_parts: item.replacementParts ?? item.replacement_parts,
      completion_time: item.completionTime ?? item.completion_time,
      post_maintenance_status: item.postMaintenanceStatus ?? item.post_maintenance_status ?? 'normal',
      next_maintenance_schedule: item.nextMaintenanceSchedule ?? item.next_maintenance_schedule,
      notes_attachments: item.notesAttachments ?? item.notes_attachments,
      created_at: item.createdAt ?? item.created_at,
    };
  }

  if (table === 'qc_reports') {
    return {
      id: item.id,
      ngay: item.ngay,
      du_an: item.duAn ?? item.du_an,
      ban_ve_so: item.banVeSo ?? item.ban_ve_so,
      chi_tiet_so: item.chiTietSo ?? item.chi_tiet_so,
      ten_chi_tiet: item.tenChiTiet ?? item.ten_chi_tiet,
      inspected_quantity: item.inspectedQuantity ?? item.inspected_quantity ?? 1,
      result: item.result ?? 'OK',
      inspector: item.inspector,
      notes: item.notes,
      created_at: item.createdAt ?? item.created_at,
    };
  }

  return null;
}

/** Map cột Supabase → object local (camelCase). */
export function mapReportFromDb(table: string, item: RawRecord): RawRecord {
  if (table === 'production_reports') {
    return {
      id: item.id,
      ngayThang: item.ngayThang ?? item.ngay_thang,
      maySanXuat: item.maySanXuat ?? item.may_san_xuat,
      duAn: item.duAn ?? item.du_an,
      khach_hang: item.khach_hang ?? item.khachHang,
      banVeSo: item.banVeSo ?? item.ban_ve_so,
      chiTietSo: item.chiTietSo ?? item.chi_tiet_so,
      tenChiTiet: item.tenChiTiet ?? item.ten_chi_tiet,
      noiDungGiaCong: item.noiDungGiaCong ?? item.noi_dung_gia_cong,
      soLuongHoanThanh: item.soLuongHoanThanh ?? item.so_luong_hoan_thanh,
      vatLieu: item.vatLieu ?? item.vat_lieu,
      nguyenCongSo: item.nguyenCongSo ?? item.nguyen_cong_so,
      toolEntries: item.toolEntries ?? item.tool_entries ?? [],
      work_time_entries: item.work_time_entries ?? item.workTimeEntries ?? [],
      setup_time_entries: item.setup_time_entries ?? item.setupTimeEntries ?? [],
      ca: item.ca ?? '',
      cpMay: item.cpMay ?? item.cp_may,
      cpDaoCu: item.cpDaoCu ?? item.cp_dao_cu,
      nguoiVanHanh: item.nguoiVanHanh ?? item.nguoi_van_hanh,
      nguoiKiemTra: item.nguoiKiemTra ?? item.nguoi_kiem_tra,
      tgTrenCa: item.tgTrenCa ?? item.tg_tren_ca,
      tgGaPhoi: item.tgGaPhoi ?? item.tg_ga_phoi,
      gioGa: item.gioGa ?? item.gio_ga,
      gioChay: item.gioChay ?? item.gio_chay,
      chiPhiGa: item.chiPhiGa ?? item.chi_phi_ga,
      chiPhiChayMay: item.chiPhiChayMay ?? item.chi_phi_chay_may,
      chiPhiDao: item.chiPhiDao ?? item.chi_phi_dao,
      status: item.status,
      createdAt: item.createdAt ?? item.created_at,
      updatedAt: item.updatedAt ?? item.updated_at,
      isLocked: item.isLocked ?? item.is_locked,
      lockedBy: item.lockedBy ?? item.locked_by,
      lockedAt: item.lockedAt ?? item.locked_at,
    };
  }

  if (table === 'maintenance_reports') {
    return {
      id: item.id,
      ngay: item.ngay,
      machineName: item.machine_name ?? item.machineName,
      equipmentCode: item.equipment_code ?? item.equipmentCode,
      technician: item.technician,
      jobContent: item.job_content ?? item.jobContent,
      reason: item.reason,
      correctiveAction: item.corrective_action ?? item.correctiveAction,
      replacementParts: item.replacement_parts ?? item.replacementParts,
      completionTime: item.completion_time ?? item.completionTime,
      postMaintenanceStatus: item.post_maintenance_status ?? item.postMaintenanceStatus,
      nextMaintenanceSchedule: item.next_maintenance_schedule ?? item.nextMaintenanceSchedule,
      notesAttachments: item.notes_attachments ?? item.notesAttachments,
      createdAt: item.created_at ?? item.createdAt,
    };
  }

  if (table === 'qc_reports') {
    return {
      id: item.id,
      ngay: item.ngay,
      duAn: item.du_an ?? item.duAn,
      banVeSo: item.ban_ve_so ?? item.banVeSo,
      chiTietSo: item.chi_tiet_so ?? item.chiTietSo,
      tenChiTiet: item.ten_chi_tiet ?? item.tenChiTiet,
      inspectedQuantity: item.inspected_quantity ?? item.inspectedQuantity,
      result: item.result,
      inspector: item.inspector,
      notes: item.notes,
      createdAt: item.created_at ?? item.createdAt,
    };
  }

  return item;
}

export const REPORT_TABLES = ['production_reports', 'maintenance_reports', 'qc_reports'] as const;

export function isReportTable(table: string): boolean {
  return (REPORT_TABLES as readonly string[]).includes(table);
}

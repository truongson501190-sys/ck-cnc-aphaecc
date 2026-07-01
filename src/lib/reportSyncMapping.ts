import type { RawRecord } from '@/types/common';

/** Map báo cáo local (camelCase) → cột Supabase (snake_case). Giữ `id` làm PK. */
export function mapReportToDb(table: string, item: RawRecord): RawRecord | null {
  if (table === 'production_reports') {
    return {
      id: item.id,
      ngay_thang: item.ngayThang ?? item.ngay_thang,
      may_san_xuat: item.maySanXuat ?? item.may_san_xuat,
      du_an: item.duAn ?? item.du_an,
      khach_hang: item.khachHang ?? item.khach_hang,
      ban_ve_so: item.banVeSo ?? item.ban_ve_so,
      chi_tiet_so: item.chiTietSo ?? item.chi_tiet_so,
      ten_chi_tiet: item.tenChiTiet ?? item.ten_chi_tiet,
      noi_dung_gia_cong: item.noiDungGiaCong ?? item.noi_dung_gia_cong,
      so_luong_hoan_thanh: item.soLuongHoanThanh ?? item.so_luong_hoan_thanh ?? 0,
      vat_lieu: item.vatLieu ?? item.vat_lieu,
      nguyen_cong_so: item.nguyenCongSo ?? item.nguyen_cong_so,
      tool_entries: item.toolEntries ?? item.tool_entries ?? [],
      work_time_entries: item.workTimeEntries ?? item.work_time_entries ?? [],
      setup_time_entries: item.setupTimeEntries ?? item.setup_time_entries ?? [],
      ca: item.ca ?? '',
      cp_may: item.cpMay ?? item.cp_may ?? 0,
      cp_dao_cu: item.cpDaoCu ?? item.cp_dao_cu ?? 0,
      nguoi_van_hanh: item.nguoiVanHanh ?? item.nguoi_van_hanh,
      nguoi_kiem_tra: item.nguoiKiemTra ?? item.nguoi_kiem_tra,
      tg_tren_ca: item.tgTrenCa ?? item.tg_tren_ca,
      tg_ga_phoi: item.tgGaPhoi ?? item.tg_ga_phoi,
      gio_ga: item.gioGa ?? item.gio_ga,
      gio_chay: item.gioChay ?? item.gio_chay,
      chi_phi_ga: item.chiPhiGa ?? item.chi_phi_ga,
      chi_phi_chay_may: item.chiPhiChayMay ?? item.chi_phi_chay_may,
      chi_phi_dao: item.chiPhiDao ?? item.chi_phi_dao,
      status: item.status ?? 'pending',
      created_at: item.createdAt ?? item.created_at,
      updated_at: item.updatedAt ?? item.updated_at,
      is_locked: item.isLocked ?? item.is_locked,
      locked_by: item.lockedBy ?? item.locked_by,
      locked_at: item.lockedAt ?? item.locked_at,
    };
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
      ngayThang: item.ngay_thang ?? item.ngayThang,
      maySanXuat: item.may_san_xuat ?? item.maySanXuat,
      duAn: item.du_an ?? item.duAn,
      khachHang: item.khach_hang ?? item.khachHang,
      banVeSo: item.ban_ve_so ?? item.banVeSo,
      chiTietSo: item.chi_tiet_so ?? item.chiTietSo,
      tenChiTiet: item.ten_chi_tiet ?? item.tenChiTiet,
      noiDungGiaCong: item.noi_dung_gia_cong ?? item.noiDungGiaCong,
      soLuongHoanThanh: item.so_luong_hoan_thanh ?? item.soLuongHoanThanh,
      vatLieu: item.vat_lieu ?? item.vatLieu,
      nguyenCongSo: item.nguyen_cong_so ?? item.nguyenCongSo,
      toolEntries: item.tool_entries ?? item.toolEntries ?? [],
      workTimeEntries: item.work_time_entries ?? item.workTimeEntries ?? [],
      setupTimeEntries: item.setup_time_entries ?? item.setupTimeEntries ?? [],
      ca: item.ca ?? '',
      cpMay: item.cp_may ?? item.cpMay,
      cpDaoCu: item.cp_dao_cu ?? item.cpDaoCu,
      nguoiVanHanh: item.nguoi_van_hanh ?? item.nguoiVanHanh,
      nguoiKiemTra: item.nguoi_kiem_tra ?? item.nguoiKiemTra,
      tgTrenCa: item.tg_tren_ca ?? item.tgTrenCa,
      tgGaPhoi: item.tg_ga_phoi ?? item.tgGaPhoi,
      gioGa: item.gio_ga ?? item.gioGa,
      gioChay: item.gio_chay ?? item.gioChay,
      chiPhiGa: item.chi_phi_ga ?? item.chiPhiGa,
      chiPhiChayMay: item.chi_phi_chay_may ?? item.chiPhiChayMay,
      chiPhiDao: item.chi_phi_dao ?? item.chiPhiDao,
      status: item.status,
      createdAt: item.created_at ?? item.createdAt,
      updatedAt: item.updated_at ?? item.updatedAt,
      isLocked: item.is_locked ?? item.isLocked,
      lockedBy: item.locked_by ?? item.lockedBy,
      lockedAt: item.locked_at ?? item.lockedAt,
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

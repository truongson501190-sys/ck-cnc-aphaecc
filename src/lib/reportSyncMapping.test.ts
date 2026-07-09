import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductionReportDbPayload, buildProductionReportStatusUpdatePayload, parseImportedToolEntries } from './reportSyncMapping.ts';

test('buildProductionReportDbPayload uses the column names accepted by the current Supabase schema', () => {
  const payload = buildProductionReportDbPayload({
    id: '1',
    ngayThang: '2026-07-07',
    maySanXuat: 'M1',
    duAn: 'D1',
    khach_hang: 'KH1',
    nguoiVanHanh: 'Nguyen',
    toolEntries: [{ name: 'Tool A' }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  assert.equal(payload.ngayThang, '2026-07-07');
  assert.equal(payload.maySanXuat, 'M1');
  assert.equal(payload.duAn, 'D1');
  assert.equal(payload.khach_hang, 'KH1');
  assert.equal(payload.nguoiVanHanh, 'Nguyen');
  assert.deepEqual(payload.work_time_entries, []);
  assert.equal(payload.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(payload.updatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal('ngay_thang' in payload, false);
  assert.equal('may_san_xuat' in payload, false);
});

test('buildProductionReportStatusUpdatePayload uses camelCase updatedAt for approval writes', () => {
  const payload = buildProductionReportStatusUpdatePayload('approved', '2026-07-08T01:30:00.000Z');

  assert.deepEqual(payload, {
    status: 'approved',
    updatedAt: '2026-07-08T01:30:00.000Z',
  });
  assert.equal('updated_at' in payload, false);
});

test('parseImportedToolEntries extracts dao names and quantities from Excel rows', () => {
  const toolEntries = parseImportedToolEntries({
    'Tên dao': 'Dao phay, Dao tiện',
    'SL cấp': 2,
    'sử dụng': 1,
    'Hỏng': 0,
    'ĐV': 'cái',
    'Đơn giá': 100000,
    'Thành tiền': 100000,
  });

  assert.equal(toolEntries.length, 2);
  assert.deepEqual(toolEntries[0], {
    tenDao: 'Dao phay',
    slCap: 2,
    slSuDung: 1,
    hong: 0,
    donVi: 'cái',
    donGia: 100000,
    thanhTien: 100000,
  });
  assert.equal(toolEntries[1].tenDao, 'Dao tiện');
  assert.equal(toolEntries[1].slCap, 0);
});

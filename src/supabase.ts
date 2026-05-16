import { createClient } from '@supabase/supabase-js';

// ================= ENV =================
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ================= FIX URL =================
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\s+/g, '');

  if (/^https?:\/\//i.test(supabaseUrl)) {
    // OK
  } else if (/^https?\/\//i.test(supabaseUrl)) {
    supabaseUrl = supabaseUrl.replace(/^(https?)/i, '$1:');
  } else {
    supabaseUrl = 'https://' + supabaseUrl;
  }

  supabaseUrl = supabaseUrl.replace(/^(https?:\/\/)+/i, '$1');
}

// ================= CREATE CLIENT (DUY NHẤT 1 LẦN) =================
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ================= DEBUG =================
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase KEY:', supabaseAnonKey);

// ================= SYNC =================
export const syncDataToSupabase = async (table: string, data: any[]) => {
  if (!supabase) return false;

  try {
    console.log(`🔄 Syncing ${data.length} records to ${table}...`);
    
    // Prepare data for Supabase (mapping local fields to DB columns)
    const mappedData = data.map(item => {
      const mapped: any = { ...item };
      
      // User Records mapping
      if (table === 'user_records') {
        if (item.msnv) mapped.employee_code = item.msnv;
        if (item.passwordHash) mapped.password_hash = item.passwordHash;
      }
      
      // Users/Employees mapping
      if (table === 'users') {
        if (item.msnv) mapped.employee_code = item.msnv;
        if (item.fullName) mapped.full_name = item.fullName;
        if (item.ten_nhan_vien) mapped.full_name = item.ten_nhan_vien;
        if (item.ghiChu) mapped.note = item.ghiChu;
        if (!mapped.role) mapped.role = 'user'; // Default role for employees
      }
      
      // Categories mapping
      if (table === 'categories') {
        if (item.maLoai) mapped.code = item.maLoai;
        if (item.tenLoai) mapped.name = item.tenLoai;
        if (item.donVi) mapped.unit = item.donVi;
        if (item.gia) mapped.price = item.gia;
      }
      
      // Machines mapping
      if (table === 'machines') {
        if (item.maMay) mapped.code = item.maMay;
        if (item.tenMay) mapped.name = item.tenMay;
        if (item.ghiChu) mapped.note = item.ghiChu;
      }
      
      // Projects mapping
      if (table === 'projects') {
        if (item.maDuAn) mapped.project_code = item.maDuAn;
        if (item.tenDuAn) mapped.name = item.tenDuAn;
        if (item.ghiChu) mapped.note = item.ghiChu;
      }

      // Warehouses mapping
      if (table === 'warehouses') {
        if (item.maKho) mapped.code = item.maKho;
        if (item.tenKho) mapped.name = item.tenKho;
        if (item.ghiChu) mapped.note = item.ghiChu;
      }

      return mapped;
    });

    // Use upsert instead of delete + insert for better multi-device sync
    let conflictColumn = 'id';
    if (table === 'user_records' || table === 'users') conflictColumn = 'employee_code';
    if (table === 'machines' || table === 'categories' || table === 'warehouses') conflictColumn = 'code';
    if (table === 'projects') conflictColumn = 'project_code';
    
    const { error } = await supabase
      .from(table)
      .upsert(mappedData, { 
        onConflict: conflictColumn,
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.warn(`⚠️ Specific upsert failed for ${table}, trying generic:`, error.message);
      const { error: error2 } = await supabase.from(table).upsert(mappedData);
      if (error2) throw error2;
    }

    console.log(`✅ Synced ${data.length} records to ${table}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Sync error ${table}:`, error.message || error);
    return false;
  }
};

// ================= LOAD =================
export const loadDataFromSupabase = async (table: string) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;

    // Map back from DB columns to local fields
    const unmappedData = (data || []).map(item => {
      const unmapped: any = { ...item };
      
      if (table === 'user_records') {
        if (item.employee_code) unmapped.msnv = item.employee_code;
        if (item.password_hash) unmapped.passwordHash = item.password_hash;
      }
      
      if (table === 'users') {
        if (item.employee_code) unmapped.msnv = item.employee_code;
        if (item.full_name) {
          unmapped.fullName = item.full_name;
          unmapped.ten_nhan_vien = item.full_name;
        }
        if (item.note) unmapped.ghiChu = item.note;
      }
      
      if (table === 'categories') {
        if (item.code) unmapped.maLoai = item.code;
        if (item.name) unmapped.tenLoai = item.name;
        if (item.unit) unmapped.donVi = item.unit;
        if (item.price) unmapped.gia = item.price;
      }
      
      if (table === 'machines') {
        if (item.code) unmapped.maMay = item.code;
        if (item.name) unmapped.tenMay = item.name;
        if (item.note) unmapped.ghiChu = item.note;
      }
      
      if (table === 'projects') {
        if (item.project_code) unmapped.maDuAn = item.project_code;
        if (item.name) unmapped.tenDuAn = item.name;
        if (item.note) unmapped.ghiChu = item.note;
      }

      if (table === 'warehouses') {
        if (item.code) unmapped.maKho = item.code;
        if (item.name) unmapped.tenKho = item.name;
        if (item.note) unmapped.ghiChu = item.note;
      }

      return unmapped;
    });

    console.log(`✅ Loaded ${unmappedData.length} records from ${table}`);
    return unmappedData;
  } catch (error: any) {
    console.error(`❌ Load error ${table}:`, error);
    return null;
  }
};

// ================= GETTER =================
export const getSupabase = () => supabase;
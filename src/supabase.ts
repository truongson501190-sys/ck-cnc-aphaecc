import { createClient } from '@supabase/supabase-js';
import type { RawRecord } from '@/types/common';
import { mapReportToDb, mapReportFromDb, isReportTable } from '@/lib/reportSyncMapping';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
let supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Clean the API Key (remove spaces, etc.)
if (supabaseAnonKey) {
  supabaseAnonKey = supabaseAnonKey.trim().replace(/[\s\uFEFF\xA0]+/g, '');
  
  // Check if it's a valid looking Supabase Anon Key (JWT starts with ey)
  if (supabaseAnonKey.startsWith('sb_publishable_')) {
    console.error('❌ CRITICAL ERROR: VITE_SUPABASE_ANON_KEY is a "Publishable Key" (starts with sb_publishable_). You MUST use the "anon" public key (a long JWT string starting with "ey"). Please check your Supabase Dashboard -> Project Settings -> API.');
  } else if (!supabaseAnonKey.startsWith('ey') && supabaseAnonKey.length < 100) {
    console.warn('⚠️ Warning: VITE_SUPABASE_ANON_KEY does not look like a standard Supabase Anon Key. It should be a long JWT string starting with "ey". Current key starts with:', supabaseAnonKey.substring(0, 10));
  }
}

// ================= FIX URL =================
if (supabaseUrl && typeof supabaseUrl === 'string') {
  // 0. Force cast to string, trim, and remove all whitespace (including tabs/newlines)
  let cleanUrl = String(supabaseUrl).trim().replace(/[\s\uFEFF\xA0]+/g, '');
  
  // 1. Remove all occurrences of encoded spaces
  cleanUrl = cleanUrl.replace(/%20/g, '');
  
  // 2. Handle cases where the URL is "[object Object]"
  if (cleanUrl === '[object Object]') {
    console.error('❌ Supabase: URL is "[object Object]". Check environment configuration.');
    cleanUrl = '';
  }

  // 3. If it contains multiple "http" or "http//", keep only the last one
  // Using a more aggressive pattern to find the start of the actual URL
  const httpMatches = cleanUrl.match(/https?:\/\//gi);
  if ((httpMatches && httpMatches.length > 1) || cleanUrl.includes('http//') || cleanUrl.includes('http:/')) {
    const lastHttpIndex = cleanUrl.toLowerCase().lastIndexOf('http');
    if (lastHttpIndex >= 0) {
      cleanUrl = cleanUrl.substring(lastHttpIndex);
    }
  }

  // 4. Ensure it's not starting with weird prefix characters
  cleanUrl = cleanUrl.replace(/^[^h]+/, '');
  
  // 5. Fix protocol formatting
  // Normalize everything to a clean starting protocol
  if (cleanUrl.toLowerCase().startsWith('http')) {
    // Consume everything that looks like a protocol separator (colons, slashes, spaces)
    // e.g., "http://://", "http : //", "http//"
    cleanUrl = cleanUrl.replace(/^(https?)[^a-z0-9]+/i, '$1://');
  } else if (cleanUrl.length > 0) {
    // If it doesn't start with http but has content, prepend https://
    cleanUrl = 'https://' + cleanUrl;
  }

  // 6. Remove any extra slashes that might have been missed or added
  // e.g., https:///foo -> https://foo
  cleanUrl = cleanUrl.replace(/^(https?:\/\/)[^a-z0-9]+/i, '$1');
  
  // 7. Remove trailing slashes (unless it's just the protocol)
  if (cleanUrl.length > 8) {
    cleanUrl = cleanUrl.replace(/\/+$/, '');
  }

  // 8. Final sanity check: if we still have multiple protocols, take the very last one
  // e.g., https://https://foo -> https://foo
  if ((cleanUrl.match(/https?:\/\//gi) || []).length > 1) {
    const lastHttp = cleanUrl.toLowerCase().lastIndexOf('http');
    cleanUrl = cleanUrl.substring(lastHttp);
  }
  
  supabaseUrl = cleanUrl;
}

// ================= VALIDATE URL =================
// Only force production URL if it's clearly malformed and not a local dev URL
const isLocal = supabaseUrl && (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'));
if (supabaseUrl && !isLocal && (supabaseUrl.includes('%20') || (supabaseUrl.match(/http/gi) || []).length > 1 || !supabaseUrl.startsWith('http') || supabaseUrl.includes(' ') || !supabaseUrl.includes('.'))) {
  console.error('⚠️ Supabase URL still malformed after cleaning, forcing production URL:', supabaseUrl);
  supabaseUrl = 'https://oxolhlkfezihtvtyjyxf.supabase.co';
}

// ================= CREATE CLIENT (DUY NHẤT 1 LẦN) =================
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase: URL or Anon Key is missing');
    return null;
  }
  
  try {
    // 1. Log exact character codes if suspicious
    if (supabaseUrl.includes(' ') || (supabaseUrl.match(/http/gi) || []).length > 1) {
      const charCodes = Array.from(supabaseUrl).map(c => c.charCodeAt(0)).join(',');
      console.warn('🔍 Suspicious Supabase URL detected. Character codes:', charCodes);
    }

    // 2. Final normalization before passing to library
    const finalUrl = supabaseUrl.trim();
    
    // 3. Native URL validation
    try {
      new URL(finalUrl);
    } catch (e) {
      console.error('❌ Supabase: URL is invalid according to browser URL constructor:', finalUrl);
      // Fallback to production if not local
      if (!finalUrl.includes('localhost') && !finalUrl.includes('127.0.0.1')) {
        console.warn('🔄 Falling back to production URL...');
        return createClient('https://oxolhlkfezihtvtyjyxf.supabase.co', supabaseAnonKey);
      }
      return null;
    }

    return createClient(finalUrl, supabaseAnonKey);
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    // Last ditch effort: if it failed but we have a key, try the production URL
    try {
      if (supabaseUrl !== 'https://oxolhlkfezihtvtyjyxf.supabase.co') {
        console.warn('🔄 Final attempt: trying production URL...');
        return createClient('https://oxolhlkfezihtvtyjyxf.supabase.co', supabaseAnonKey);
      }
    } catch (e2) {
      console.error('❌ Production fallback also failed');
    }
    return null;
  }
})();

// Attach to window for browser debugging
if (typeof window !== 'undefined') {
  const win = window as Window & {
    __SUPABASE_URL?: string;
    __SUPABASE_CLIENT?: typeof supabase;
  };
  win.__SUPABASE_URL = supabaseUrl;
  win.__SUPABASE_CLIENT = supabase;
}

// ================= SYNC =================
export const syncDataToSupabase = async (table: string, data: RawRecord[]) => {
  if (!supabase) return false;

  try {
    console.log(`🔄 Syncing ${data.length} records to ${table}...`);
    
    const mappedData = data.map((item) => {
      if (isReportTable(table)) {
        const row = mapReportToDb(table, item);
        if (row?.id) return row;
        console.warn(`[sync] Bỏ qua bản ghi ${table} thiếu id`);
        return null;
      }

      const mapped: RawRecord = { ...item };
      
      // 1. Remove id immediately to avoid SERIAL constraint errors
      delete mapped.id;
      
      // 2. Perform field mapping
      // User Records mapping
      if (table === 'user_records') {
        if (item.msnv) {
          mapped.employee_code = item.msnv;
          delete mapped.msnv;
        }
        if (item.passwordHash) {
          mapped.password_hash = item.passwordHash;
          delete mapped.passwordHash;
        }
      }
      
      // Users/Employees mapping
      if (table === 'users') {
        if (item.msnv) {
          mapped.employee_code = item.msnv;
        }
        if (item.fullName || item.ten_nhan_vien) {
          mapped.full_name = item.fullName || item.ten_nhan_vien;
        }
        if (item.ghiChu || item.note) {
          mapped.note = item.ghiChu || item.note;
        }
        if (!mapped.role) mapped.role = 'user'; 

        // Clean up ALL local fields that are not in the Supabase schema
        const schemaColumns = [
          'id', 'employee_code', 'full_name', 'role', 'note', 'status', 'permissions',
          'created_at', 'updated_at'
        ];
        
        Object.keys(mapped).forEach(key => {
          if (!schemaColumns.includes(key)) {
            delete mapped[key];
          }
        });
      }
      
      // Categories mapping
      if (table === 'categories') {
        if (item.maLoai) mapped.code = item.maLoai;
        if (item.tenLoai) mapped.name = item.tenLoai;
        if (item.donVi) mapped.unit = item.donVi;
        if (item.gia) mapped.price = item.gia;

        const schemaColumns = ['id', 'name', 'code', 'unit', 'price', 'created_at', 'updated_at'];
        Object.keys(mapped).forEach(key => {
          if (!schemaColumns.includes(key)) delete mapped[key];
        });
      }
      
      // Machines mapping
      if (table === 'machines') {
        if (item.maMay) mapped.code = item.maMay;
        if (item.tenMay) mapped.name = item.tenMay;
        if (item.ghiChu) mapped.note = item.ghiChu;

        const schemaColumns = ['id', 'name', 'code', 'note', 'created_at', 'updated_at'];
        Object.keys(mapped).forEach(key => {
          if (!schemaColumns.includes(key)) delete mapped[key];
        });
      }
      
      // Projects mapping
      if (table === 'projects') {
        if (item.maDuAn) mapped.project_code = item.maDuAn;
        if (item.tenDuAn) mapped.name = item.tenDuAn;
        if (item.ghiChu) mapped.note = item.ghiChu;

        const schemaColumns = ['id', 'project_code', 'name', 'note', 'created_at', 'updated_at'];
        Object.keys(mapped).forEach(key => {
          if (!schemaColumns.includes(key)) delete mapped[key];
        });
      }

      // Warehouses mapping
      if (table === 'warehouses') {
        if (item.maKho) mapped.code = item.maKho;
        if (item.tenKho) mapped.name = item.tenKho;
        if (item.ghiChu) mapped.note = item.ghiChu;

        const schemaColumns = ['id', 'name', 'code', 'type', 'address', 'note', 'created_at', 'updated_at'];
        Object.keys(mapped).forEach(key => {
          if (!schemaColumns.includes(key)) delete mapped[key];
        });
      }

      // Transactions mapping
      if (table === 'warehouse_transactions') {
        if (item.referenceNumber) {
          mapped.reference_number = item.referenceNumber;
          delete mapped.referenceNumber;
        }
        if (item.transactionDate) {
          mapped.transaction_date = item.transactionDate;
          delete mapped.transactionDate;
        }
        if (item.totalValue) {
          mapped.total_value = item.totalValue;
          delete mapped.totalValue;
        }
        
        // Map itemId/itemName to category_id
        if (item.itemId || item.category_id) {
          mapped.category_id = item.itemId || item.category_id;
        }
        
        // Map warehouse locations
        if (item.fromLocation) mapped.from_warehouse_id = item.fromLocation;
        if (item.toLocation) mapped.to_warehouse_id = item.toLocation;
        
        // Map users
        if (item.operator) mapped.created_by = item.operator;
        if (item.recipient) mapped.received_by = item.recipient;

        // Map IDs
        if (item.projectId) mapped.project_id = item.projectId;
        if (item.machineId) mapped.machine_id = item.machineId;

        // Clean up ALL local fields that are not in the Supabase schema
        const schemaColumns = [
          'id', 'type', 'category_id', 'quantity', 'unit', 'price', 'total_value', 
          'warehouse_id', 'from_warehouse_id', 'to_warehouse_id', 'project_id', 
          'machine_id', 'created_by', 'received_by', 'approved_by', 'reason', 
          'reference_number', 'status', 'transaction_date', 'notes', 
          'approved_at', 'created_at', 'updated_at'
        ];
        
        Object.keys(mapped).forEach(key => {
          if (!schemaColumns.includes(key)) {
            delete mapped[key];
          }
        });
      }

      // Final check to ensure id is removed before returning
      delete mapped.id;
      return mapped;
    }).filter((row): row is RawRecord => row != null);

    // Use upsert instead of delete + insert for better multi-device sync
    let conflictColumn = '';
    if (isReportTable(table)) conflictColumn = 'id';
    else if (table === 'user_records' || table === 'users') conflictColumn = 'employee_code';
    else if (table === 'machines' || table === 'categories' || table === 'warehouses') conflictColumn = 'code';
    else if (table === 'projects') conflictColumn = 'project_code';
    else if (table === 'warehouse_transactions') conflictColumn = 'reference_number';
    
    const { error } = await supabase
      .from(table)
      .upsert(mappedData, { 
        onConflict: conflictColumn || undefined,
        ignoreDuplicates: false 
      });
    
    if (error) {
      // Check for RLS violation
      if (error.code === '42501' || (error.message && error.message.includes('row-level security'))) {
        console.error(`❌ RLS Violation on ${table}: The current API key does not have permission to write to this table. Please check Supabase policies.`);
        return false;
      }

      console.warn(`⚠️ Specific upsert failed for ${table}, trying generic:`, error.message);
      const { error: error2 } = await supabase.from(table).upsert(mappedData);
      if (error2) throw error2;
    }

    console.log(`✅ Synced ${data.length} records to ${table}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Sync error ${table}:`, errorMessage);
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
    const unmappedData = (data || []).map((item) => {
      const unmapped: RawRecord = { ...item };
      
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

      if (table === 'warehouse_transactions') {
        if (item.reference_number) unmapped.referenceNumber = item.reference_number;
        if (item.transaction_date) unmapped.transactionDate = item.transaction_date;
        if (item.total_value) unmapped.totalValue = item.total_value;
      }

      if (isReportTable(table)) {
        return mapReportFromDb(table, item);
      }

      return unmapped;
    });

    console.log(`✅ Loaded ${unmappedData.length} records from ${table}`);
    return unmappedData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Load error ${table}:`, errorMessage);
    return null;
  }
};

export const getSupabase = () => supabase;

export default supabase;

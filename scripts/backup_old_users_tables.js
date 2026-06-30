
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // Note: Use service role key for full access

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function backupTable(tableName) {
  console.log(`🔄 Backing up ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`❌ Failed to backup ${tableName}:`, error.message);
    throw error;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backup_old_tables');
  fs.mkdirSync(backupDir, { recursive: true });

  const filePath = path.join(backupDir, `${tableName}_backup_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`✅ ${tableName} backed up: ${filePath} (${data.length} rows)`);
  return data;
}

async function main() {
  console.log('🚀 Starting backup...');

  try {
    const users = await backupTable('users');
    const userRecords = await backupTable('user_records');
    const employees = await backupTable('employees');
    const userPermissions = await backupTable('user_permissions');

    console.log('\n✅ Backup complete!');
    console.log(`- users: ${users.length} rows`);
    console.log(`- user_records: ${userRecords.length} rows`);
    console.log(`- employees: ${employees.length} rows`);
    console.log(`- user_permissions: ${userPermissions.length} rows`);
  } catch (e) {
    console.error('\n❌ Backup failed:', e);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

// Script to enable/disable Supabase synchronization
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const supabasePath = path.join(__dirname, 'src', 'lib', 'supabase.ts');

const action = process.argv[2]; // 'enable' or 'disable'

if (!action || !['enable', 'disable'].includes(action)) {
  console.log('Usage: node enable-supabase.js <enable|disable>');
  console.log('Example: node enable-supabase.js enable');
  process.exit(1);
}

try {
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');

  if (action === 'enable') {
    // Enable Supabase
    envContent = envContent.replace(/VITE_ENABLE_SUPABASE=.*/, 'VITE_ENABLE_SUPABASE=true');
    console.log('✅ Supabase enabled in .env');

    // Update supabase.ts to use static import
    const supabaseContent = `// Supabase configuration for data synchronization
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fix malformed URLs (e.g., " http//localhost" or " http://localhost")
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\\s+/g, ''); // Remove all spaces
  
  // Fix missing protocol colon (e.g., http// -> http://)
  if (/^https?:\\/\\//i.test(supabaseUrl)) {
    // Already correct
  } else if (/^https?\\/\\//i.test(supabaseUrl)) {
    supabaseUrl = supabaseUrl.replace(/^(https?)/i, '$1:');
  } else if (!/^https?:\\/\\//i.test(supabaseUrl) && !supabaseUrl.startsWith('//')) {
    // No protocol at all, assume http:// for localhost
    supabaseUrl = 'http://' + supabaseUrl;
  }

  // Ensure no double protocols or other common typos
  supabaseUrl = supabaseUrl.replace(/^(https?:\\/\\/)+/i, '$1');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper functions for data synchronization
export const syncDataToSupabase = async (table: string, data: any[]) => {
  if (!supabase) return false;

  try {
    // Clear existing data
    await supabase.from(table).delete().neq('id', ''); // Delete all records

    // Insert new data
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;

    console.log(\`✅ Synced \${data.length} records to \${table}\`);
    return true;
  } catch (error) {
    console.error(\`❌ Failed to sync \${table}:\`, error);
    return false;
  }
};

export const loadDataFromSupabase = async (table: string) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;

    console.log(\`✅ Loaded \${data?.length || 0} records from \${table}\`);
    return data;
  } catch (error) {
    console.error(\`❌ Failed to load \${table}:\`, error);
    return null;
  }
};

export const getSupabase = () => supabase;`;

    fs.writeFileSync(supabasePath, supabaseContent);
    console.log('✅ Updated supabase.ts for production build');

  } else {
    // Disable Supabase
    envContent = envContent.replace(/VITE_ENABLE_SUPABASE=.*/, 'VITE_ENABLE_SUPABASE=false');
    console.log('✅ Supabase disabled in .env');

    // Update supabase.ts to disable sync
    const supabaseContent = `// Supabase configuration for data synchronization
let supabase: any = null;

// Supabase is disabled for production builds - uses localStorage only
console.log('ℹ️ Supabase disabled. Using localStorage only.');

// Helper functions for data synchronization (disabled)
export const syncDataToSupabase = async (table: string, data: any[]) => {
  console.log(\`⚠️ Supabase sync disabled. Would sync \${data.length} records to \${table}\`);
  return false;
};

export const loadDataFromSupabase = async (table: string) => {
  console.log(\`⚠️ Supabase sync disabled. Would load from \${table}\`);
  return null;
};

export const getSupabase = () => null;`;

    fs.writeFileSync(supabasePath, supabaseContent);
    console.log('✅ Updated supabase.ts for localStorage only');
  }

  // Write updated .env
  fs.writeFileSync(envPath, envContent);

  console.log(`
🎉 Supabase ${action}d successfully!

Next steps:
1. Run: pnpm install
2. Run: pnpm run dev (for development)
3. Or: pnpm run build && pnpm run preview (for production)

Note: When enabled, make sure your Supabase database has the required tables.
Run the SQL in supabase-schema.sql in your Supabase SQL Editor.
  `);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
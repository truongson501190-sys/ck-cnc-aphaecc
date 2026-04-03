// Supabase configuration for data synchronization
const supabase = null;

// Supabase is disabled for production builds - uses localStorage only
console.log('ℹ️ Supabase disabled. Using localStorage only.');

// Helper functions for data synchronization (disabled)
export const syncDataToSupabase = async (table: string, data: unknown[]) => {
  console.log(`⚠️ Supabase sync disabled. Would sync ${data.length} records to ${table}`);
  return false;
};

export const loadDataFromSupabase = async (table: string) => {
  console.log(`⚠️ Supabase sync disabled. Would load from ${table}`);
  return null;
};

export const getSupabase = () => null;
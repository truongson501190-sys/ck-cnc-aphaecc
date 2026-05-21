export {};

declare global {
  interface Window {
    __SUPABASE_URL?: string;
    __SUPABASE_CLIENT?: unknown;
  }
}

export interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  action: 'login' | 'logout' | 'add' | 'edit' | 'delete' | 'approve';
  module: string;
  resource?: string;
  ipAddress: string;
  createdAt: string;
}

export interface BackupRestoreRecord {
  id: string;
  type: 'backup' | 'restore';
  name: string;
  createdAt: string;
  notes?: string;
}

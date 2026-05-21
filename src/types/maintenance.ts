export type PostMaintenanceStatus = 'normal' | 'other';

export const POST_MAINTENANCE_STATUS_LABELS: Record<PostMaintenanceStatus, string> = {
  normal: 'Hoạt động bình thường',
  other: 'Khác',
};

export interface MaintenanceReport {
  id: string;
  ngay: string;
  machineName: string;
  equipmentCode: string;
  technician: string;
  jobContent: string;
  reason: string;
  correctiveAction: string;
  replacementParts: string;
  completionTime: string;
  postMaintenanceStatus: PostMaintenanceStatus;
  nextMaintenanceSchedule: string;
  notesAttachments: string;
  createdAt: string;
}

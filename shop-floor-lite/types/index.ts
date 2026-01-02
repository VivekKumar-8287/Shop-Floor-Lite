export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'operator' | 'supervisor';
  employeeId: string;
  tenant_id: string;
  token: string;
}

export interface Machine {
  id: string;        // This should match what your component expects
  _id?: string;      // Add optional _id for backend
  code?: string;     // Add optional code
  name: string;
  type: string;
  status: 'RUN' | 'IDLE' | 'OFF';
  tenant_id?: string;
  isActive?: boolean;
}
export interface DowntimeReason {
  code: string;
  label: string;
  children?: DowntimeReason[];
}

// In types/index.ts
export interface DowntimeEntry {
  // Backend fields
  _id: string;
  machineId: {
    _id: string;
    name: string;
    code: string;
    type: string;
  };
  operatorId?: string | null;
  reasonCategory: string;  // Changed from reasonCode
  reasonSubCategory?: string;  // Changed from subReasonCode
  startTime: string;
  endTime?: string;
  notes?: string;
  photo?: string;  // Base64 string
  photoSize?: number;
  isSynced: boolean;  // Changed from synced
  tenant_id: string;
  duration?: number;  // In seconds
  createdAt?: string;
  
  // Local fields (for offline)
  localId?: string;
  needsSync?: boolean;
  pendingPhoto?: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  status: 'Created' | 'Acknowledged' | 'Cleared';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  machineId: string;
  title: string;
  status: 'Due' | 'Overdue' | 'Done';
  note?: string;
  completedAt?: string;
}
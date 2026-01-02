import axios from 'axios';
import { storage } from './storage';

// const API_BASE_URL = 'http://localhost:5000/api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '{{shopURL}}api';
// const API_BASE_URL = process.env.EXPO_PUBLIC_NGROK_URL || '{{shopURL}}api';


// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem('token'); // Your token storage method
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Export as default
export default api;

// Export individual APIs as named exports
export const authApi = {
  login: (email: string, password: string, role: string) => 
    api.post('/auth/login', { email, password, role }),
  register: (data: any) => api.post('/auth/register', data),
};

export const machineApi = {
  getAll: () => api.get('/machines'),
  getById: (id: string) => api.get(`/machines/${id}`),
  updateStatus: (id: string, status: string) => 
    api.put(`/machines/${id}/status`, { status }),
};

export const downtimeApi = {
  getAll: () => api.get('/downtime/'),
  getReasons: () => api.get('/downtime/reasons'),
  start: (data: {
    machineId: string;
    reasonCategory: string;
    reasonSubCategory?: string;
    notes?: string;
    tenant_id: string;
    startTime?: string;
  }) => api.post('/downtime/start', data),
  end: (id: string, data: { endTime: string; notes?: string }) => 
    api.post(`/downtime/${id}/end`, data),
  uploadPhoto: (id: string, photoBase64: string) => 
    api.post(`/downtime/${id}/photo`, { photoBase64 }),
  getById: (id: string) => api.get(`/downtime/${id}`),
};

export const maintenanceApi = {
  getAll: (params?: { status?: string }) => 
    api.get('/maintenance/', { params }),
  getByMachine: (machineId: string) => 
    api.get(`/maintenance/machine/${machineId}`),
  create: (data: {
    machineId: string;
    title: string;
    description?: string;
    dueDate?: string;
  }) => api.post('/maintenance/', data),
  complete: (id: string, data: { completionNotes?: string }) => 
    api.put(`/maintenance/${id}/complete`, data),
  updateStatus: (id: string, status: 'DUE' | 'OVERDUE' | 'DONE') => 
    api.put(`/maintenance/${id}/status`, { status }),
  getOverdue: () => api.get('/maintenance/overdue'),
  getById: (id: string) => api.get(`/maintenance/${id}`),
};

// Add these new APIs for reports and sync
export const reportApi = {
  getSummary: () => api.get('/report/summary'),
  getDowntimeReport: (params?: { 
    startDate?: string; 
    endDate?: string; 
    machineId?: string 
  }) => api.get('/report/downtime', { params }),
};

export const syncApi = {
  syncDowntime: (offlineEvents: any[]) => 
    api.post('/sync/downtime', { offlineEvents }),
  syncMaintenance: (offlineTasks: any[]) => 
    api.post('/sync/maintenance', { offlineTasks }),
  getSyncStatus: () => api.get('/sync/status'),
  bulkSync: (data: { 
    downtimeEvents?: any[]; 
    maintenanceTasks?: any[] 
  }) => api.post('/sync/bulk', data),
};
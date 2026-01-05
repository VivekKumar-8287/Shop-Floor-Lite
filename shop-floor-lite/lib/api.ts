// api.ts
import axios from 'axios';
import { storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
// const API_BASE_URL = process.env.EXPO_PUBLIC_NGROK_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) console.log('Request Body:', config.data);
    if (config.params) console.log('Query Params:', config.params);
    return config;
  },
  (error) => {
    console.error('[API REQUEST ERROR]', error.message);
    return Promise.reject(error);
  }
);

// ================= RESPONSE INTERCEPTOR =================
api.interceptors.response.use(
  (response) => {
    console.log(`[API RESPONSE] ${response.status} ${response.config.url}`);
    console.log('Response Data:', response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        `[API ERROR] ${error.response.status} ${error.response.config.url}`,
        error.response.data
      );
    } else if (error.request) {
      console.error('[API ERROR] No response received', error.message);
    } else {
      console.error('[API ERROR] Request setup error', error.message);
    }
    return Promise.reject(error);
  }
);

// ================= AUTH APIS =================
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string, role: string) =>
    api.post('/auth/login', { email, password, role }),
  profile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

// ================= MACHINE APIS =================
export const machineApi = {
  getAll: () => api.get('/machines'),
  getById: (id: string) => api.get(`/machines/${id}`),
  updateStatus: (id: string, status: string) => api.put(`/machines/${id}/status`, { status }),
};

// ================= DOWNTIME APIS =================
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
  end: (id: string, data: { endTime: string; notes?: string }) => api.post(`/downtime/${id}/end`, data),
  uploadPhoto: (id: string, photoBase64: string) => api.post(`/downtime/${id}/photo`, { photoBase64 }),
  getById: (id: string) => api.get(`/downtime/${id}`),
};

// ================= MAINTENANCE APIS =================
export const maintenanceApi = {
  getAll: (params?: { status?: string }) => api.get('/maintenance/', { params }),
  getByMachine: (machineId: string) => api.get(`/maintenance/machine/${machineId}`),
  create: (data: { machineId: string; title: string; description?: string; dueDate?: string }) =>
    api.post('/maintenance/', data),
  complete: (id: string, data: { completionNotes?: string }) => api.put(`/maintenance/${id}/complete`, data),
  updateStatus: (id: string, status: 'DUE' | 'OVERDUE' | 'DONE') =>
    api.put(`/maintenance/${id}/status`, { status }),
  getOverdue: () => api.get('/maintenance/overdue'),
  getById: (id: string) => api.get(`/maintenance/${id}`),
};

// ================= ALERT APIS =================
export const alertApi = {
  getAll: (params?: { status?: string; priority?: string }) => api.get('/alerts/', { params }),
  create: (data: { title: string; description?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }) =>
    api.post('/alerts/', data),
  acknowledge: (id: string, data: { notes?: string }) => api.put(`/alerts/${id}/acknowledge`, data),
  clear: (id: string, data: { notes?: string }) => api.put(`/alerts/${id}/clear`, data),
  simulate: () => api.post('/alerts/simulate'),
  getById: (id: string) => api.get(`/alerts/${id}`),
};

// ================= REPORT APIS =================
export const reportApi = {
  getSummary: () => api.get('/report/summary'),
  getDowntimeReport: (params?: { startDate?: string; endDate?: string; machineId?: string }) =>
    api.get('/report/downtime', { params }),
};

// ================= SYNC APIS =================
export const syncApi = {
  syncDowntime: (offlineEvents: any[]) => api.post('/sync/downtime', { offlineEvents }),
  syncMaintenance: (offlineTasks: any[]) => api.post('/sync/maintenance', { offlineTasks }),
  getSyncStatus: () => api.get('/sync/status'),
  bulkSync: (data: { downtimeEvents?: any[]; maintenanceTasks?: any[] }) => api.post('/sync/bulk', data),
};

// Export default axios instance if needed
export default api;

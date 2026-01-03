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
  // Get all downtime events
  getAll: () => api.get('/downtime/'),
  
  // Get reasons tree
  getReasons: () => api.get('/downtime/reasons'),
  
  // Start downtime
  start: (data: {
    machineId: string;
    reasonCategory: string;
    reasonSubCategory?: string;
    notes?: string;
    tenant_id: string;
    startTime?: string;
  }) => api.post('/downtime/start', data),
  
  // End downtime - CHANGE FROM PUT TO POST to match your backend
  end: (id: string, data: { endTime: string; notes?: string }) => 
    api.post(`/downtime/${id}/end`, data),  // Changed from PUT to POST
    
  // Upload photo (separate endpoint)
  uploadPhoto: (id: string, photoBase64: string) => 
    api.post(`/downtime/${id}/photo`, { photoBase64 }),
  
  // Get single downtime
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

export const alertApi = {
  // Get all alerts with optional filters
  getAll: (params?: { 
    status?: string; 
    priority?: string;
  }) => api.get('/alerts/', { params }),
  
  // Create alert - REMOVED: machineId parameter
  create: (data: {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => api.post('/alerts/', data),
  
  // Acknowledge alert (operator OR supervisor)
  acknowledge: (id: string, data: { notes?: string }) => 
    api.put(`/alerts/${id}/acknowledge`, data),
  
  // Clear alert (supervisor only)
  clear: (id: string, data: { notes?: string }) => 
    api.put(`/alerts/${id}/clear`, data),
  
  // Simulate alert creation (for testing, supervisor only)
  simulate: () => api.post('/alerts/simulate'),
  
  // Get alert by ID
  getById: (id: string) => api.get(`/alerts/${id}`),
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
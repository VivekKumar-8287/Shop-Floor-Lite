import axios from 'axios';
import { storage } from './storage';

// const API_BASE_URL = 'http://localhost:5000/api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '{{shopURL}}api';
// const API_BASE_URL = process.env.EXPO_PUBLIC_NGROK_URL || '{{shopURL}}api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
 

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header added'); // ADD THIS
  } else {
    console.log('No token found'); // ADD THIS
  }
  
    // ADD THIS LOGGING
  console.log('API Request:', {
    url: config.url,
    method: config.method,
    data: config.data,
    headers: config.headers,
  });

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    
    if (error.response?.status === 401) {
      // Handle unauthorized
      storage.removeItem('token');
      storage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  
  login: (email: string, password: string, role?: string) => 
    api.post('/auth/login', { email, password, role }),
  
  profile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

export const machineApi = {
  getAll: () => api.get('/machines/'),
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
  
  // End downtime - CORRECTED: Should be PUT based on your routes
  end: (id: string, data: { endTime: string; notes?: string }) => 
    api.put(`/downtime/${id}/end`, data),
    
  // Upload photo (separate endpoint)
  uploadPhoto: (id: string, photoBase64: string) => 
    api.post(`/downtime/${id}/photo`, { photoBase64 }),
  
  // Get single downtime
  getById: (id: string) => api.get(`/downtime/${id}`),
};

// CORRECTED: Based on your maintenance routes
export const maintenanceApi = {
  // Get all maintenance tasks for a machine
  getByMachine: (machineId: string) => 
    api.get(`/maintenance/machine/${machineId}`),
  
  // Create maintenance task (supervisor only)
  create: (data: {
    machineId: string;
    title: string;
    description?: string;
    dueDate?: string;
  }) => api.post('/maintenance/', data),
  
  // Mark task as complete (operator)
  complete: (id: string, data: { completionNotes?: string }) => 
    api.put(`/maintenance/${id}/complete`, data),
  
  // Update task status
  updateStatus: (id: string, status: 'DUE' | 'OVERDUE' | 'DONE') => 
    api.put(`/maintenance/${id}/status`, { status }),
  
  // Get overdue tasks
  getOverdue: () => api.get('/maintenance/overdue'),
  
  // Get task by ID
  getById: (id: string) => api.get(`/maintenance/${id}`),
};

// CORRECTED: Based on your alert routes
export const alertApi = {
  // Get all alerts with optional status filter
  getAll: (params?: { status?: string }) => 
    api.get('/alerts/', { params }),
  
  // Create alert
  create: (data: {
    machineId: string;
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => api.post('/alerts/', data),
  
  // Acknowledge alert (supervisor only) - CORRECTED: Should be PUT
  acknowledge: (id: string, data: { notes?: string }) => 
    api.put(`/alerts/${id}/acknowledge`, data),
  
  // Clear alert (supervisor only) - CORRECTED: Should be PUT
  clear: (id: string, data: { notes?: string }) => 
    api.put(`/alerts/${id}/clear`, data),
  
  // Simulate alert creation (for testing, supervisor only)
  simulate: () => api.post('/alerts/simulate'),
  
  // Get alert by ID
  getById: (id: string) => api.get(`/alerts/${id}`),
};


export const syncApi = {
  syncPending: (data: any[]) => 
    api.post('/sync/pending', { items: data }),
  
  getLastSync: () => api.get('/sync/last'),
};

// Helper function to get user role from token/storage
export const getUserRole = async (): Promise<string | null> => {
  try {
    const user = await storage.getItem('user');
    return user ? JSON.parse(user).role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Helper function to get tenant_id
export const getTenantId = async (): Promise<string | null> => {
  try {
    const user = await storage.getItem('user');
    return user ? JSON.parse(user).tenant_id : null;
  } catch (error) {
    console.error('Error getting tenant_id:', error);
    return null;
  }
};

export default api;
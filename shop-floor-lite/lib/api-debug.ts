import axios from 'axios';
import { storage } from './storage';

// API Base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Colors for console logs
const colors = {
  request: '\x1b[36m%s\x1b[0m', // Cyan
  success: '\x1b[32m%s\x1b[0m', // Green
  error: '\x1b[31m%s\x1b[0m',   // Red
  info: '\x1b[33m%s\x1b[0m',    // Yellow
  test: '\x1b[35m%s\x1b[0m',    // Purple for tests
};

// Create axios instance with debugging
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - logs all outgoing requests
api.interceptors.request.use(
  async (config) => {
    const timestamp = new Date().toISOString();
    const token = await storage.getItem('token');
    
    console.log(colors.request, '══════════════════════════════════════════════');
    console.log(colors.request, `🌐 API REQUEST [${timestamp}]`);
    console.log(colors.request, `📤 ${config.method?.toUpperCase()} ${config.url}`);
    
    if (config.params) {
      console.log(colors.info, `📦 Query Params:`, config.params);
    }
    
    if (config.data) {
      // Don't log passwords
      const safeData = { ...config.data };
      if (safeData.password) safeData.password = '***HIDDEN***';
      console.log(colors.info, `📦 Request Body:`, safeData);
    }
    
    if (token) {
      console.log(colors.info, `🔑 Token: ${token.substring(0, 20)}...`);
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(colors.request, '──────────────────────────────────────────────');
    return config;
  },
  (error) => {
    console.log(colors.error, '❌ REQUEST SETUP ERROR:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor - logs all incoming responses
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    const duration = response.config.metadata?.endTime 
      ? Date.now() - response.config.metadata.startTime 
      : 'N/A';
    
    console.log(colors.success, '══════════════════════════════════════════════');
    console.log(colors.success, `✅ API RESPONSE [${timestamp}]`);
    console.log(colors.success, `📥 ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    console.log(colors.success, `📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.data) {
      console.log(colors.success, '📦 Response Data:', response.data);
      
      if (response.data.success !== undefined) {
        console.log(colors.success, `✓ Success: ${response.data.success}`);
      }
      
      if (response.data.message) {
        console.log(colors.success, `💬 Message: ${response.data.message}`);
      }
      
      if (Array.isArray(response.data.data)) {
        console.log(colors.success, `📊 Data Count: ${response.data.data.length} items`);
      } else if (response.data.data) {
        console.log(colors.success, `📊 Data Type: Object`);
      }
    }
    
    console.log(colors.success, '──────────────────────────────────────────────');
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    
    console.log(colors.error, '══════════════════════════════════════════════');
    console.log(colors.error, `❌ API ERROR [${timestamp}]`);
    
    if (error.config) {
      console.log(colors.error, `📤 ${error.config.method?.toUpperCase()} ${error.config.url}`);
    }
    
    if (error.response) {
      console.log(colors.error, `📥 Status: ${error.response.status} ${error.response.statusText}`);
      
      if (error.response.data) {
        console.log(colors.error, '📦 Error Response:', error.response.data);
        
        const errorData = error.response.data;
        const errorMessage = 
          errorData.message || 
          errorData.error || 
          errorData.details || 
          JSON.stringify(errorData);
        
        console.log(colors.error, `🚨 Error: ${errorMessage}`);
      }
      
      switch (error.response.status) {
        case 400: console.log(colors.error, '⚠️ Bad Request'); break;
        case 401: console.log(colors.error, '🔐 Unauthorized'); break;
        case 403: console.log(colors.error, '⛔ Forbidden'); break;
        case 404: console.log(colors.error, '🔍 Not Found'); break;
        case 500: console.log(colors.error, '💥 Server Error'); break;
      }
    } else if (error.request) {
      console.log(colors.error, '🌐 Network Error - No response from server');
    } else {
      console.log(colors.error, '⚡ Request Error:', error.message);
    }
    
    console.log(colors.error, '──────────────────────────────────────────────');
    return Promise.reject(error);
  }
);

// Add timing metadata to requests
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() };
    return config;
  }
);

api.interceptors.response.use(
  (response) => {
    if (response.config.metadata) {
      response.config.metadata.endTime = Date.now();
    }
    return response;
  },
  (error) => {
    if (error.config && error.config.metadata) {
      error.config.metadata.endTime = Date.now();
    }
    return Promise.reject(error);
  }
);

// Export as default
export default api;

// ALL YOUR APIS WITH DEBUG LOGGING
export const authApi = {
  register: (data: any) => {
    console.log(colors.info, '👤 Register User:', data.email);
    return api.post('/auth/register', data);
  },
  
  login: (email: string, password: string, role: string) => {
    console.log(colors.info, '🔑 Login Attempt:', { email, role });
    return api.post('/auth/login', { email, password, role });
  },
  
  profile: () => {
    console.log(colors.info, '👤 Fetching User Profile');
    return api.get('/auth/profile');
  },
  
  logout: () => {
    console.log(colors.info, '🚪 Logging out user');
    return api.post('/auth/logout');
  },
};

export const machineApi = {
  getAll: () => {
    console.log(colors.info, '🏭 Fetching all machines');
    return api.get('/machines');
  },
  
  getById: (id: string) => {
    console.log(colors.info, `🔍 Fetching machine with ID: ${id}`);
    return api.get(`/machines/${id}`);
  },
  
  updateStatus: (id: string, status: string) => {
    console.log(colors.info, `🔄 Updating machine ${id} status to: ${status}`);
    return api.put(`/machines/${id}/status`, { status });
  },
};

export const downtimeApi = {
  getAll: () => {
    console.log(colors.info, '⏱️ Fetching all downtime events');
    return api.get('/downtime/');
  },
  
  getReasons: () => {
    console.log(colors.info, '📋 Fetching downtime reasons tree');
    return api.get('/downtime/reasons');
  },
  
  start: (data: {
    machineId: string;
    reasonCategory: string;
    reasonSubCategory?: string;
    notes?: string;
    tenant_id: string;
    startTime?: string;
  }) => {
    console.log(colors.info, '▶️ Starting downtime for machine:', data.machineId);
    return api.post('/downtime/start', data);
  },
  
  end: (id: string, data: { endTime: string; notes?: string }) => {
    console.log(colors.info, `⏹️ Ending downtime with ID: ${id}`);
    return api.post(`/downtime/${id}/end`, data);
  },
  
  uploadPhoto: (id: string, photoBase64: string) => {
    console.log(colors.info, `📸 Uploading photo for downtime ID: ${id}`);
    return api.post(`/downtime/${id}/photo`, { photoBase64 });
  },
  
  getById: (id: string) => {
    console.log(colors.info, `📄 Fetching downtime with ID: ${id}`);
    return api.get(`/downtime/${id}`);
  },
};

export const maintenanceApi = {
  getAll: (params?: { status?: string }) => {
    console.log(colors.info, '🔧 Fetching all maintenance tasks');
    return api.get('/maintenance/', { params });
  },
  
  getByMachine: (machineId: string) => {
    console.log(colors.info, `🔍 Fetching maintenance for machine: ${machineId}`);
    return api.get(`/maintenance/machine/${machineId}`);
  },
  
  create: (data: {
    machineId: string;
    title: string;
    description?: string;
    dueDate?: string;
  }) => {
    console.log(colors.info, '➕ Creating maintenance task for machine:', data.machineId);
    return api.post('/maintenance/', data);
  },
  
  complete: (id: string, data: { completionNotes?: string }) => {
    console.log(colors.info, `✅ Completing maintenance task: ${id}`);
    return api.put(`/maintenance/${id}/complete`, data);
  },
  
  updateStatus: (id: string, status: 'DUE' | 'OVERDUE' | 'DONE') => {
    console.log(colors.info, `🔄 Updating maintenance ${id} status to: ${status}`);
    return api.put(`/maintenance/${id}/status`, { status });
  },
  
  getOverdue: () => {
    console.log(colors.info, '⚠️ Fetching overdue maintenance tasks');
    return api.get('/maintenance/overdue');
  },
  
  getById: (id: string) => {
    console.log(colors.info, `📄 Fetching maintenance with ID: ${id}`);
    return api.get(`/maintenance/${id}`);
  },
};

export const alertApi = {
  getAll: (params?: { status?: string; priority?: string }) => {
    console.log(colors.info, '🚨 Fetching all alerts');
    return api.get('/alerts/', { params });
  },
  
  create: (data: {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => {
    console.log(colors.info, '➕ Creating alert:', data.title);
    return api.post('/alerts/', data);
  },
  
  acknowledge: (id: string, data: { notes?: string }) => {
    console.log(colors.info, `✅ Acknowledging alert: ${id}`);
    return api.put(`/alerts/${id}/acknowledge`, data);
  },
  
  clear: (id: string, data: { notes?: string }) => {
    console.log(colors.info, `🧹 Clearing alert: ${id}`);
    return api.put(`/alerts/${id}/clear`, data);
  },
  
  simulate: () => {
    console.log(colors.info, '🎭 Simulating alert creation');
    return api.post('/alerts/simulate');
  },
  
  getById: (id: string) => {
    console.log(colors.info, `📄 Fetching alert with ID: ${id}`);
    return api.get(`/alerts/${id}`);
  },
};

export const reportApi = {
  getSummary: () => {
    console.log(colors.info, '📊 Fetching summary report');
    return api.get('/report/summary');
  },
  
  getDowntimeReport: (params?: { startDate?: string; endDate?: string; machineId?: string }) => {
    console.log(colors.info, '📈 Fetching downtime report');
    return api.get('/report/downtime', { params });
  },
};

export const syncApi = {
  syncDowntime: (offlineEvents: any[]) => {
    console.log(colors.info, '🔄 Syncing downtime events:', offlineEvents.length);
    return api.post('/sync/downtime', { offlineEvents });
  },
  
  syncMaintenance: (offlineTasks: any[]) => {
    console.log(colors.info, '🔄 Syncing maintenance tasks:', offlineTasks.length);
    return api.post('/sync/maintenance', { offlineTasks });
  },
  
  getSyncStatus: () => {
    console.log(colors.info, '📡 Checking sync status');
    return api.get('/sync/status');
  },
  
  bulkSync: (data: { downtimeEvents?: any[]; maintenanceTasks?: any[] }) => {
    console.log(colors.info, '🚀 Bulk syncing data');
    return api.post('/sync/bulk', data);
  },
};

// ==================== TEST ALL APIS FUNCTION ====================
export const testAllApis = async () => {
  console.log(colors.test, '🧪 ========================================');
  console.log(colors.test, '🧪 STARTING COMPREHENSIVE API TESTS');
  console.log(colors.test, '🧪 ========================================');
  
  const results: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    error?: string;
    data?: any;
  }> = [];
  
  const runTest = async (name: string, testFn: () => Promise<any>, shouldRun = true) => {
    if (!shouldRun) {
      results.push({ name, status: 'SKIP' });
      return;
    }
    
    console.log(colors.test, `🧪 Testing: ${name}`);
    try {
      const response = await testFn();
      console.log(colors.success, `   ✅ ${name}: PASSED`);
      results.push({ 
        name, 
        status: 'PASS', 
        data: response.data 
      });
    } catch (error: any) {
      console.log(colors.error, `   ❌ ${name}: FAILED - ${error.message}`);
      results.push({ 
        name, 
        status: 'FAIL', 
        error: error.message 
      });
    }
  };
  
  // Test 1: Test connection
  await runTest('Connection Test', async () => {
    return axios.get(API_BASE_URL.replace('/api', '') + '/health', { timeout: 3000 });
  });
  
  // Test 2: Auth APIs (skip if not authenticated)
  const token = await storage.getItem('token');
  const isAuthenticated = !!token;
  
  await runTest('Auth - Login (test user)', async () => {
    return authApi.login('test@example.com', 'password', 'operator');
  }, !isAuthenticated);
  
  await runTest('Auth - Profile', async () => {
    return authApi.profile();
  }, isAuthenticated);
  
  // Test 3: Machine APIs
  await runTest('Machines - Get All', async () => {
    return machineApi.getAll();
  });
  
  // Test 4: Downtime APIs
  await runTest('Downtime - Get Reasons', async () => {
    return downtimeApi.getReasons();
  });
  
  await runTest('Downtime - Get All', async () => {
    return downtimeApi.getAll();
  });
  
  // Test 5: Maintenance APIs
  await runTest('Maintenance - Get All', async () => {
    return maintenanceApi.getAll();
  });
  
  await runTest('Maintenance - Get Overdue', async () => {
    return maintenanceApi.getOverdue();
  });
  
  // Test 6: Alert APIs
  await runTest('Alerts - Get All', async () => {
    return alertApi.getAll();
  });
  
  // Test 7: Report APIs
  await runTest('Reports - Get Summary', async () => {
    return reportApi.getSummary();
  });
  
  // Test 8: Sync APIs
  await runTest('Sync - Get Status', async () => {
    return syncApi.getSyncStatus();
  });
  
  // Print summary
  console.log(colors.test, '📊 ========================================');
  console.log(colors.test, '📊 TEST RESULTS SUMMARY');
  console.log(colors.test, '📊 ========================================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  console.log(colors.info, `✅ PASSED: ${passed}`);
  console.log(colors.info, `❌ FAILED: ${failed}`);
  console.log(colors.info, `⏭️ SKIPPED: ${skipped}`);
  console.log(colors.info, `📊 TOTAL: ${results.length}`);
  
  // Show failed tests
  if (failed > 0) {
    console.log(colors.error, '\n🚨 FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach((test, index) => {
      console.log(colors.error, `  ${index + 1}. ${test.name}: ${test.error}`);
    });
  }
  
  return results;
};

// Test connection function
export const testApiConnection = async () => {
  console.log(colors.info, '🔌 Testing API Connection...');
  try {
    const response = await axios.get(API_BASE_URL.replace('/api', '') + '/health', { timeout: 3000 });
    console.log(colors.success, '✅ API Connection Successful!');
    console.log(colors.success, 'Server Status:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.log(colors.error, '❌ API Connection Failed!');
    console.log(colors.error, 'Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(colors.error, '💡 Make sure backend is running on http://localhost:5000');
    } else if (error.code === 'ENOTFOUND') {
      console.log(colors.error, '💡 Cannot resolve localhost');
    }
    
    return { success: false, error: error.message };
  }
};

// Network status checker
export const checkNetworkStatus = async () => {
  console.log(colors.info, '📶 Checking Network Status...');
  
  const endpoints = [
    { url: 'https://google.com', name: 'Internet' },
    { url: API_BASE_URL, name: 'Backend API' },
    { url: 'http://localhost:5000', name: 'Local Server' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      await axios.head(endpoint.url, { timeout: 3000 });
      const duration = Date.now() - startTime;
      console.log(colors.success, `✅ ${endpoint.name}: Connected (${duration}ms)`);
    } catch (error) {
      console.log(colors.error, `❌ ${endpoint.name}: Unreachable`);
    }
  }
};
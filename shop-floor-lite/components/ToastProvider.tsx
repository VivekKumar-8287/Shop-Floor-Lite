import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Toast } from './Toast';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  showToast: (message: string, type?: ToastItem['type']) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Log errors to console automatically
    if (type === 'error') {
      console.error('Toast Error:', message);
    }
    
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container for Web & Mobile */}
      <View style={styles.container}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// ✅ ADD THIS FUNCTION
export function useApiErrorHandler() {
  const { showToast } = useToast();

  const handleApiError = (error: any, context?: string) => {
    console.error(`API Error${context ? ` (${context})` : ''}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config,
    });

    let errorMessage = 'Something went wrong';

    if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid email or password';
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message?.includes('Network Error')) {
      errorMessage = 'Network error. Check your connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    showToast(errorMessage, 'error');
    
    return errorMessage;
  };

  return { handleApiError };
}

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
});
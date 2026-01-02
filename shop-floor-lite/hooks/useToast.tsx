// hooks/useToast.ts
import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  id: number;
}

interface ToastContextType {
  toasts: ToastConfig[];
  showToast: (message: string, type?: ToastConfig['type']) => void;
  hideToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((message: string, type: ToastConfig['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
    
    return id;
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Handle mobile toasts
  const showToastWithPlatform = useCallback((message: string, type: ToastConfig['type'] = 'info') => {
    if (Platform.OS === 'web') {
      showToast(message, type);
    } else {
      // For native platforms, use Alert
      const { Alert } = require('react-native');
      Alert.alert(
        type === 'error' ? 'Error' : 
        type === 'success' ? 'Success' : 
        type === 'warning' ? 'Warning' : 'Info',
        message
      );
    }
  }, [showToast]);

  const value = {
    toasts,
    showToast: showToastWithPlatform, // Use the platform-aware function
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
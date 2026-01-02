// components/ToastProvider.tsx
import React from 'react';
import { Platform, View ,StyleSheet} from 'react-native';
import { WebToast } from './WebToast';
import { useToast } from '../hooks/useToast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, hideToast } = useToast();

  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => (
          <WebToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </View>
    </>
  );
};

const styles =StyleSheet.create({
  toastContainer: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    pointerEvents: 'none',
  },
}) ;
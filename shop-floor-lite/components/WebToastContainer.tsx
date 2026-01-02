// components/WebToastContainer.tsx
import React from 'react';
import { View } from 'react-native';
import { WebToast } from './WebToast';
import { useToast } from '../hooks/useToast';

export const WebToastContainer = () => {
  const { toasts, hideToast } = useToast();

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      pointerEvents: 'none',
      alignItems: 'center',
    }}>
      {toasts.map((toast) => (
        <View 
          key={toast.id} 
          style={{ 
            marginTop: 8,
            pointerEvents: 'auto',
          }}
        >
          <WebToast
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        </View>
      ))}
    </View>
  );
};
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '../lib/offlineQueue';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected || false);
    });

    // Check pending items periodically
    const interval = setInterval(async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      <Text style={styles.text}>
        {!isOnline ? 'Offline' : `Syncing ${pendingCount} items...`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4CAF50',
    padding: 8,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: '#F44336',
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default OfflineIndicator;
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusIndicatorProps {
  status: 'RUN' | 'IDLE' | 'OFF';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 'RUN': return '#4CAF50';
      case 'IDLE': return '#FFC107';
      case 'OFF': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: getColor() }]} />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
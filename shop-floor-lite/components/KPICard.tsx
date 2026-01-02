import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  unit = '', 
  color = '#007AFF' 
}) => {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}{unit}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
    // Platform-specific shadow
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
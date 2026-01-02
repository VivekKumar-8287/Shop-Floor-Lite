import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Machine } from '../types';
import { StatusIndicator } from './StatusIndicator';


interface MachineCardProps {
  machine: Machine;
  onPress: () => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onPress }) => {
   const displayId = machine.id || machine._id || machine.code || 'N/A';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{machine.name}</Text>
        <StatusIndicator status={machine.status} />
      </View>
      <Text style={styles.type}>Type: {machine.type}</Text>
      <Text style={styles.id}>ID: {displayId}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  type: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  id: {
    fontSize: 12,
    color: '#999',
  },
});
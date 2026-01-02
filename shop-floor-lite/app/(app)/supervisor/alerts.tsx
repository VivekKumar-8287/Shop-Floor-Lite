import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  status: 'Created' | 'Acknowledged' | 'Cleared';
  createdAt: string;
  acknowledgedBy?: string;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: '1', title: 'Machine Overheating', message: 'Machine M-101 is overheating', status: 'Created', createdAt: '2024-01-15T10:30:00Z' },
    { id: '2', title: 'Low Pressure', message: 'Pressure below threshold on Roller A', status: 'Acknowledged', acknowledgedBy: 'supervisor@email.com', createdAt: '2024-01-15T09:15:00Z' },
    { id: '3', title: 'Belt Slippage', message: 'Conveyor belt needs adjustment', status: 'Created', createdAt: '2024-01-15T08:45:00Z' },
  ]);

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id 
        ? { ...alert, status: 'Acknowledged', acknowledgedBy: 'current-user@email.com' }
        : alert
    ));
  };

  const clearAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, status: 'Cleared' } : alert
    ));
  };

  const renderAlert = ({ item }: { item: AlertItem }) => (
    <View style={[styles.alertCard, 
      item.status === 'Created' && styles.alertCreated,
      item.status === 'Acknowledged' && styles.alertAcknowledged,
      item.status === 'Cleared' && styles.alertCleared
    ]}>
      <Text style={styles.alertTitle}>{item.title}</Text>
      <Text style={styles.alertMessage}>{item.message}</Text>
      <Text style={styles.alertStatus}>Status: {item.status}</Text>
      <Text style={styles.alertTime}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
      
      {item.status === 'Created' && (
        <TouchableOpacity style={styles.button} onPress={() => acknowledgeAlert(item.id)}>
          <Text style={styles.buttonText}>Acknowledge</Text>
        </TouchableOpacity>
      )}
      
      {item.status === 'Acknowledged' && (
        <TouchableOpacity style={styles.button} onPress={() => clearAlert(item.id)}>
          <Text style={styles.buttonText}>Mark as Cleared</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts Management</Text>
      <Text style={styles.subtitle}>Monitor and respond to shop floor alerts</Text>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.filter(a => a.status === 'Created').length}</Text>
          <Text style={styles.statLabel}>New</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.filter(a => a.status === 'Acknowledged').length}</Text>
          <Text style={styles.statLabel}>Acknowledged</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.filter(a => a.status === 'Cleared').length}</Text>
          <Text style={styles.statLabel}>Cleared</Text>
        </View>
      </View>
      
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlert}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#666' },
  list: { paddingBottom: 20 },
  alertCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    marginBottom: 12, 
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertCreated: { borderLeftColor: '#F44336' },
  alertAcknowledged: { borderLeftColor: '#FF9800' },
  alertCleared: { borderLeftColor: '#4CAF50' },
  alertTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  alertMessage: { fontSize: 14, color: '#666', marginBottom: 8 },
  alertStatus: { fontSize: 12, color: '#999', marginBottom: 4 },
  alertTime: { fontSize: 12, color: '#999', marginBottom: 12 },
  button: { 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#fff', fontWeight: '500' }
});
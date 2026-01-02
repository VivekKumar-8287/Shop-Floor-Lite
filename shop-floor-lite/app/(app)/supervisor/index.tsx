import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { MachineCard } from '../../../components/MachineCard';
import { KPICard } from '../../../components/KPICard';
import { useRouter } from 'expo-router';
import { machineApi } from '../../../lib/api';
import { setMachines } from '../../../store/machineSlice';
import { Redirect } from 'expo-router'; // ADD THIS

export default function SupervisorScreen() { // Changed from DashboardScreen
  // 1. ADD ROLE GUARD AT THE VERY BEGINNING
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Redirect if user is not supervisor
  if (!user || user.role !== 'supervisor') {
    return <Redirect href="/(app)" />; // Redirect to dashboard
  }
  
  // 2. REST OF YOUR EXISTING CODE
  const [refreshing, setRefreshing] = useState(false);
  const machines = useSelector((state: RootState) => state.machines.machines);
  const downtimeEntries = useSelector((state: RootState) => state.downtime.entries);
  
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  useEffect(() => {
    loadMachines();
  }, []);

 const loadMachines = async () => {
  try {
    const response = await machineApi.getAll();
    
    if (response.data.success && Array.isArray(response.data.data)) {
      // Transform the data: map _id to id
      const machinesData = response.data.data.map((machine: any) => ({
        id: machine._id, // Map _id to id
        _id: machine._id, // Keep original _id too
        code: machine.code,
        name: machine.name,
        type: machine.type,
        status: machine.status,
        tenant_id: machine.tenant_id,
        isActive: machine.isActive,
      }));
      
      dispatch(setMachines(machinesData));
    } else {
      console.error('Invalid response format:', response.data);
      dispatch(setMachines([])); // Set empty array as fallback
    }
  } catch (error) {
    console.error('Failed to load machines:', error);
    dispatch(setMachines([])); // Set empty array on error
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMachines();
    setRefreshing(false);
  };

  const handleMachinePress = (machine: any) => {
    if (user?.role === 'operator') {
      router.push(`/(app)/operator/machine-detail?id=${machine._id || machine.code}`);
    }
  };

  // Calculate KPIs
  const totalDowntime = downtimeEntries.filter(d => !d.endTime).length;
  const activeAlerts = 0; // You'll need to calculate this from alerts
  const completionRate = 0; // You'll need to calculate this from checklist

    // DEBUG: Add this to see what machines actually is
  console.log('Machines data:', machines);
  console.log('Type of machines:', typeof machines);
  console.log('Is array?', Array.isArray(machines));

  const kpis = [
    { title: 'Active Machines', value: machines.filter(m => m.status === 'RUN').length },
    { title: 'Total Downtime', value: totalDowntime },
    { title: 'Active Alerts', value: activeAlerts },
    { title: 'Completion Rate', value: `${completionRate}%` },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.email}
        </Text>
        <Text style={styles.roleText}>
          Supervisor
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => (
            <KPICard key={index} title={kpi.title} value={kpi.value} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Machines</Text>
        {machines.map((machine) => (
  <MachineCard
    key={machine._id} // Use _id instead of id
    machine={machine}
    onPress={() => handleMachinePress(machine)}
  />
))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
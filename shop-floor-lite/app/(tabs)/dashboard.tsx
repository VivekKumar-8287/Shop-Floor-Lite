import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { MachineCard } from "../../components/MachineCard";
import { useToast } from '../../components/ToastProvider';
import { alertApi, machineApi } from "../../lib/api";
import { AppDispatch, RootState } from "../../store";
import { acknowledgeAlert } from '../../store/alertSlice';
import { setMachines } from "../../store/machineSlice";

// ADD THIS COMPONENT DECLARATION
export default function DashboardScreen() {
  // Your state declarations...
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  
  const machines = useSelector((state: RootState) => state.machines.machines);
  const user = useSelector((state: RootState) => state.auth.user);
  const downtimeEntries = useSelector(
    (state: RootState) => state.downtime.entries
  );

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    loadMachines();
     loadAlerts(); 
  }, []);


  const loadMachines = async () => {
    setLoading(true);
    setError(null);
    try {
      // REAL API CALL to your backend
      const response = await machineApi.getAll();
      console.log("Response data",response.data)

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
        dispatch(setMachines([]));
      }
    } catch (error: any) {
      console.error("Failed to load machines:", error);
      setError(error.response?.data?.message || "Failed to load machines");

      // Fallback to seed data if API fails
      const seedMachines = [
        {
          id: "M-101",
          name: "Cutter 1",
          type: "cutter",
          status: "RUN" as const,
        },
        {
          id: "M-102",
          name: "Roller A",
          type: "roller",
          status: "IDLE" as const,
        },
        {
          id: "M-103",
          name: "Packing West",
          type: "packer",
          status: "OFF" as const,
        },
      ];
      dispatch(setMachines(seedMachines));
    } finally {
      setLoading(false);
    }
  };

 const loadAlerts = async () => {
  try {
    setLoadingAlerts(true);
    const response = await alertApi.getAll();
    console.log("load alert -dashboard.tsx:",response)
    if (response.data.success && Array.isArray(response.data.data)) {
      setAlerts(response.data.data);
    }
  } catch (error) {
    console.error('Failed to load alerts:', error);
  } finally {
    setLoadingAlerts(false);
  }
};
    
 const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await alertApi.acknowledge(alertId, { 
        notes: 'Acknowledged by operator' 
      });
      
      if (response.data.success) {
        // Update Redux
        dispatch(acknowledgeAlert({
          id: alertId,
          user: {
            _id: user?._id || '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            role: user?.role || 'operator'
          }
        }));
        
        // Update local state
        setAlerts(prev => prev.map(alert => 
          alert._id === alertId 
            ? { 
                ...alert, 
                status: 'ACKNOWLEDGED',
                acknowledgedBy: [...(alert.acknowledgedBy || []), user],
                acknowledgedAt: new Date().toISOString()
              }
            : alert
        ));
        
        showToast('Alert acknowledged', 'success');
      }
    } catch (error: any) {
      console.error('Failed to acknowledge alert:', error);
      showToast(error.response?.data?.error || 'Failed to acknowledge', 'error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMachines();
    setRefreshing(false);
  };

const handleMachinePress = (machine: any) => {
  router.push({
    pathname: `/machine-detail/${machine.id}`,
    params: {
      id: machine.id,
      name: machine.name,
    },
  });
};

  
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.email?.split("@")[0] || "User"}
        </Text>
        <Text style={styles.roleText}>
          {user?.role === "operator" ? "Operator" : "Supervisor"} • Shift: Day
        </Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
        
      </View>

      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Machines</Text>
          <Text style={styles.machineCount}>{machines.length} machines</Text>
        </View>

        {machines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No machines found</Text>
            <Text style={styles.emptyStateSubtext}>
              Check your connection or contact admin
            </Text>
          </View>
        ) : (
          machines.map((machine) => (
            <MachineCard
              key={machine._id} // Use _id instead of id
              machine={machine}
              onPress={() => handleMachinePress(machine)}
            />
          ))
        )}
      </View>
            {/* Alerts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <TouchableOpacity onPress={loadAlerts}>
            <MaterialIcons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {loadingAlerts ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading alerts...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyAlerts}>
            <MaterialIcons name="notifications-off" size={40} color="#D1D5DB" />
            <Text style={styles.emptyAlertsText}>No active alerts</Text>
          </View>
        ) : (
          <FlatList
            data={alerts.filter(a => a.status === 'CREATED' || a.status === 'ACKNOWLEDGED')}
            renderItem={({ item }) => (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <MaterialIcons 
                    name={item.status === 'CREATED' ? 'warning' : 'check-circle'} 
                    size={20} 
                    color={item.status === 'CREATED' ? '#F59E0B' : '#10B981'} 
                  />
                  <Text style={styles.alertTitle}>{item.title}</Text>
                  <View style={[
                    styles.alertStatus,
                    { 
                      backgroundColor: item.status === 'CREATED' ? '#FEF3C7' : 
                                     item.status === 'ACKNOWLEDGED' ? '#D1FAE5' : '#F3F4F6'
                    }
                  ]}>
                    <Text style={[
                      styles.alertStatusText,
                      { 
                        color: item.status === 'CREATED' ? '#92400E' : 
                               item.status === 'ACKNOWLEDGED' ? '#065F46' : '#6B7280'
                      }
                    ]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.alertDescription} numberOfLines={2}>
                  {item.description || 'No description'}
                </Text>
                
                <View style={styles.alertFooter}>
                  <View style={styles.alertMachine}>
                    <MaterialIcons name="precision-manufacturing" size={14} color="#666" />
                    <Text style={styles.alertMachineText}>
                      {typeof item.machineId === 'object' ? item.machineId.name : 'Unknown Machine'}
                    </Text>
                  </View>
                  
                  {item.status === 'CREATED' && user?.role === 'operator' && (
                    <TouchableOpacity
                      style={styles.acknowledgeButton}
                      onPress={() => handleAcknowledge(item._id)}
                    >
                      <MaterialIcons name="check-circle" size={16} color="#fff" />
                      <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        )}
      </View>

      

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated:{" "}
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  errorContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  machineCount: {
    fontSize: 14,
    color: "#666",
  },
  
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
    centerLoader: {
    alignItems: 'center',
    padding: 20,
  },
  emptyAlerts: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyAlertsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  alertStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertMachine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertMachineText: {
    fontSize: 12,
    color: '#666',
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  acknowledgeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
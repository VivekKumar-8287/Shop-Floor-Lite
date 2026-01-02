import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert, // Add this import
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { setMachines } from "../../store/machineSlice";
import { MachineCard } from "../../components/MachineCard";
import { KPICard } from "../../components/KPICard";
import { useRouter } from "expo-router";
import { machineApi, downtimeApi } from "../../lib/api"; // Add downtimeApi import
import { MaterialIcons } from '@expo/vector-icons'; // Add this import

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingDowntimes, setLoadingDowntimes] = useState(false); // Add this state

  const machines = useSelector((state: RootState) => state.machines.machines);
  const user = useSelector((state: RootState) => state.auth.user);
  const downtimeEntries = useSelector(
    (state: RootState) => state.downtime.entries
  );

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  useEffect(() => {
    loadMachines();
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

  // NEW FUNCTION: Fetch all downtime records
  const fetchAllDowntimeRecords = async () => {
    try {
      setLoadingDowntimes(true);
      console.log("📊 Fetching all downtime records...");
      
      const response = await downtimeApi.getAll();
      console.log("📦 Downtime API Response:", response.data);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const allDowntimes = response.data.data;
        console.log(`✅ Found ${allDowntimes.length} downtime records`);
        
        // Show summary in alert
        Alert.alert(
          "All Downtime Records",
          `Found ${allDowntimes.length} downtime records:\n\n` +
          `Active: ${allDowntimes.filter((d: any) => !d.endTime).length}\n` +
          `Completed: ${allDowntimes.filter((d: any) => d.endTime).length}\n\n` +
          "See console for full details.",
          [
            { text: "OK", style: "default" },
            { 
              text: "View Details", 
              onPress: () => {
                // Navigate to a downtime list screen if you have one
                // router.push('/(app)/downtime-list');
                console.log("Full downtime data:", allDowntimes);
              }
            }
          ]
        );
        
        // Log all downtimes to console
        allDowntimes.forEach((downtime: any, index: number) => {
          console.log(`📝 Downtime ${index + 1}:`, {
            id: downtime._id,
            machine: downtime.machineId?.name || downtime.machineId,
            reason: downtime.reasonCategory || downtime.reasonCode,
            startTime: new Date(downtime.startTime).toLocaleString(),
            endTime: downtime.endTime ? new Date(downtime.endTime).toLocaleString() : 'Active',
            duration: downtime.endTime 
              ? Math.round((new Date(downtime.endTime).getTime() - new Date(downtime.startTime).getTime()) / 60000) + ' min'
              : 'Ongoing',
            operator: downtime.operatorId?.email || 'Unknown'
          });
        });
        
      } else {
        Alert.alert(
          "No Data",
          "No downtime records found or failed to load data.",
          [{ text: "OK", style: "default" }]
        );
      }
    } catch (error: any) {
      console.error("❌ Error fetching downtime records:", error);
      Alert.alert(
        "Error",
        `Failed to load downtime records: ${error.message}`,
        [{ text: "OK", style: "cancel" }]
      );
    } finally {
      setLoadingDowntimes(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMachines();
    setRefreshing(false);
  };

  const handleMachinePress = (machine: any) => {
    if (user?.role === "operator") {
      router.push({
        pathname: "/(app)/operator/machine-detail",
        params: { id: machine.id, name: machine.name },
      });
    } else {
      // Supervisor view - maybe show machine details or alerts
      router.push({
        pathname: "/(app)/supervisor/alerts",
        params: { machineId: machine.id },
      });
    }
  };

  // Calculate KPIs from real data
  const calculateKPIs = () => {
    const activeMachines = machines.filter((m) => m.status === "RUN").length;
    const totalDowntime = downtimeEntries.filter((d) => !d.endTime).length;
    const activeAlerts = 0; // You'll need to fetch this from your backend

    // Machine utilization rate (simplified)
    const utilizationRate =
      machines.length > 0
        ? Math.round((activeMachines / machines.length) * 100)
        : 0;

    // Calculate OEE (Overall Equipment Effectiveness) - simplified
    const availability = machines.length > 0 ? 0.85 : 0; // Mock data
    const performance = machines.length > 0 ? 0.9 : 0; // Mock data
    const quality = machines.length > 0 ? 0.95 : 0; // Mock data
    const oee = Math.round(availability * performance * quality * 100);

    return [
      {
        title: "Active Machines",
        value: activeMachines,
        unit: "",
        color: "#4CAF50",
      },
      {
        title: "Total Downtime",
        value: totalDowntime,
        unit: " incidents",
        color: "#F44336",
      },
      {
        title: "Utilization Rate",
        value: utilizationRate,
        unit: "%",
        color: "#2196F3",
      },
      { title: "OEE", value: oee, unit: "%", color: "#FF9800" },
      { title: "Alerts", value: activeAlerts, unit: "", color: "#9C27B0" },
      {
        title: "Total Machines",
        value: machines.length,
        unit: "",
        color: "#607D8B",
      },
    ];
  };

  const kpis = calculateKPIs();

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
        
        {/* All Downtime Records Button */}
        <TouchableOpacity
          style={styles.downtimeButton}
          onPress={fetchAllDowntimeRecords}
          disabled={loadingDowntimes}
        >
          {loadingDowntimes ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="history" size={20} color="#fff" />
              <Text style={styles.downtimeButtonText}>All Downtime Records</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              unit={kpi.unit}
              color={kpi.color}
            />
          ))}
        </View>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {user?.role === "operator" ? (
            <>
              <View style={styles.actionItem}>
                <Text style={styles.actionText}>Record Downtime</Text>
                <Text style={styles.actionSubtext}>Log machine stoppages</Text>
              </View>
              <View style={styles.actionItem}>
                <Text style={styles.actionText}>Maintenance Checklist</Text>
                <Text style={styles.actionSubtext}>Complete daily tasks</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.actionItem}>
                <Text style={styles.actionText}>View Alerts</Text>
                <Text style={styles.actionSubtext}>
                  Monitor shop floor alerts
                </Text>
              </View>
              <View style={styles.actionItem}>
                <Text style={styles.actionText}>Shift Report</Text>
                <Text style={styles.actionSubtext}>
                  Generate performance report
                </Text>
              </View>
            </>
          )}
        </View>
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
  // NEW STYLES for downtime button
  downtimeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  downtimeButtonText: {
    color: "#fff",
    fontWeight: "600",
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
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  emptyState: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionItem: {
    flex: 1,
    minWidth: 150,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 12,
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
});
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { reportApi } from '../../lib/api';
import { useToast } from '../../components/ToastProvider';

interface KPIData {
  shift: {
    start: string;
    end: string;
    currentTime: string;
  };
  kpis: {
    totalMachines: number;
    runningMachines: number;
    idleMachines: number;
    downMachines: number;
    availability: number;
    downtime: {
      totalMinutes: number;
      events: number;
      averageDuration: number;
    };
    maintenance: {
      overdueTasks: number;
      pendingTasks: number;
      completedTasks: number;
    };
    alerts: {
      active: number;
      created: number;
      acknowledged: number;
    };
  };
  topDowntimeReasons: Array<{
    _id: {
      category: string;
      subCategory: string;
    };
    count: number;
    totalDuration: number;
  }>;
}

export default function KPIScreen() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const loadKpiData = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getSummary();
      
      if (response.data.success) {
        console.log('KPI Data loaded:', response.data.data);
        setKpiData(response.data.data);
      } else {
        showToast('Failed to load KPI data', 'error');
      }
    } catch (error: any) {
      console.error('Failed to load KPI:', error);
      showToast('Failed to load KPI data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadKpiData();
  };

  useEffect(() => {
    loadKpiData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading KPI Data...</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>KPI Dashboard</Text>
        <Text style={styles.subtitle}>Real-time Performance Metrics</Text>
        
        {kpiData?.shift && (
          <View style={styles.shiftInfo}>
            <View style={styles.shiftItem}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.shiftText}>
                Shift: {formatDate(kpiData.shift.start)} - {formatDate(kpiData.shift.end)}
              </Text>
            </View>
            <View style={styles.shiftItem}>
              <MaterialIcons name="update" size={16} color="#666" />
              <Text style={styles.shiftText}>
                Last Updated: {formatDate(kpiData.shift.currentTime)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Machine Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Machine Status</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#007AFF' }]}>
              <MaterialIcons name="precision-manufacturing" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{kpiData?.kpis.totalMachines || 0}</Text>
            <Text style={styles.statLabel}>Total Machines</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
              <MaterialIcons name="play-arrow" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{kpiData?.kpis.runningMachines || 0}</Text>
            <Text style={styles.statLabel}>Running</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
              <MaterialIcons name="pause" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{kpiData?.kpis.idleMachines || 0}</Text>
            <Text style={styles.statLabel}>Idle</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
              <MaterialIcons name="power-off" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{kpiData?.kpis.downMachines || 0}</Text>
            <Text style={styles.statLabel}>Down</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        
        {/* Availability Card */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <MaterialIcons name="speed" size={20} color="#007AFF" />
            <Text style={styles.metricTitle}>Availability</Text>
          </View>
          <View style={styles.metricValueContainer}>
            <Text style={styles.metricValue}>
              {kpiData?.kpis.availability || 0}%
            </Text>
            <View style={styles.availabilityBar}>
              <View 
                style={[
                  styles.availabilityFill,
                  { width: `${kpiData?.kpis.availability || 0}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Downtime Card */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <MaterialIcons name="timer-off" size={20} color="#EF4444" />
            <Text style={styles.metricTitle}>Downtime</Text>
          </View>
          <View style={styles.downtimeStats}>
            <View style={styles.downtimeStat}>
              <Text style={styles.downtimeValue}>
                {formatDuration(kpiData?.kpis.downtime.totalMinutes || 0)}
              </Text>
              <Text style={styles.downtimeLabel}>Total Duration</Text>
            </View>
            <View style={styles.downtimeStat}>
              <Text style={styles.downtimeValue}>
                {kpiData?.kpis.downtime.events || 0}
              </Text>
              <Text style={styles.downtimeLabel}>Events</Text>
            </View>
            <View style={styles.downtimeStat}>
              <Text style={styles.downtimeValue}>
                {formatDuration(kpiData?.kpis.downtime.averageDuration || 0)}
              </Text>
              <Text style={styles.downtimeLabel}>Avg. Duration</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Maintenance Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maintenance</Text>
        <View style={styles.maintenanceGrid}>
          <View style={[styles.maintenanceCard, styles.overdueCard]}>
            <MaterialIcons name="warning" size={24} color="#DC2626" />
            <Text style={styles.maintenanceValue}>
              {kpiData?.kpis.maintenance.overdueTasks || 0}
            </Text>
            <Text style={styles.maintenanceLabel}>Overdue</Text>
          </View>
          
          <View style={[styles.maintenanceCard, styles.pendingCard]}>
            <MaterialIcons name="schedule" size={24} color="#3B82F6" />
            <Text style={styles.maintenanceValue}>
              {kpiData?.kpis.maintenance.pendingTasks || 0}
            </Text>
            <Text style={styles.maintenanceLabel}>Pending</Text>
          </View>
          
          <View style={[styles.maintenanceCard, styles.completedCard]}>
            <MaterialIcons name="check-circle" size={24} color="#10B981" />
            <Text style={styles.maintenanceValue}>
              {kpiData?.kpis.maintenance.completedTasks || 0}
            </Text>
            <Text style={styles.maintenanceLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Alerts Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        <View style={styles.alertStats}>
          <View style={styles.alertStat}>
            <View style={[styles.alertBadge, styles.activeAlert]}>
              <MaterialIcons name="notifications" size={16} color="#fff" />
            </View>
            <Text style={styles.alertValue}>
              {kpiData?.kpis.alerts.active || 0}
            </Text>
            <Text style={styles.alertLabel}>Active</Text>
          </View>
          
          <View style={styles.alertStat}>
            <View style={[styles.alertBadge, styles.createdAlert]}>
              <MaterialIcons name="add-alert" size={16} color="#fff" />
            </View>
            <Text style={styles.alertValue}>
              {kpiData?.kpis.alerts.created || 0}
            </Text>
            <Text style={styles.alertLabel}>Created</Text>
          </View>
          
          <View style={styles.alertStat}>
            <View style={[styles.alertBadge, styles.acknowledgedAlert]}>
              <MaterialIcons name="done" size={16} color="#fff" />
            </View>
            <Text style={styles.alertValue}>
              {kpiData?.kpis.alerts.acknowledged || 0}
            </Text>
            <Text style={styles.alertLabel}>Acknowledged</Text>
          </View>
        </View>
      </View>

      {/* Top Downtime Reasons */}
      {kpiData?.topDowntimeReasons && kpiData.topDowntimeReasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Downtime Reasons</Text>
          <View style={styles.reasonsList}>
            {kpiData.topDowntimeReasons.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <View style={styles.reasonHeader}>
                  <Text style={styles.reasonRank}>#{index + 1}</Text>
                  <View style={styles.reasonInfo}>
                    <Text style={styles.reasonCategory}>
                      {reason._id.category || 'Unknown'}
                    </Text>
                    {reason._id.subCategory && (
                      <Text style={styles.reasonSubCategory}>
                        → {reason._id.subCategory}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.reasonStats}>
                  <View style={styles.reasonStat}>
                    <MaterialIcons name="repeat" size={14} color="#666" />
                    <Text style={styles.reasonStatText}>
                      {reason.count} {reason.count === 1 ? 'time' : 'times'}
                    </Text>
                  </View>
                  <View style={styles.reasonStat}>
                    <MaterialIcons name="timer" size={14} color="#666" />
                    <Text style={styles.reasonStatText}>
                      {formatDuration(reason.totalDuration)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadKpiData}>
        <MaterialIcons name="refresh" size={20} color="#007AFF" />
        <Text style={styles.refreshText}>Refresh Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  shiftInfo: {
    marginTop: 16,
    gap: 8,
  },
  shiftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  metricCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  metricValueContainer: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  availabilityBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  availabilityFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  downtimeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  downtimeStat: {
    alignItems: 'center',
    flex: 1,
  },
  downtimeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  downtimeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  maintenanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  maintenanceCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  overdueCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pendingCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  completedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  maintenanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  maintenanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  alertStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertStat: {
    alignItems: 'center',
    flex: 1,
  },
  alertBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeAlert: {
    backgroundColor: '#DC2626',
  },
  createdAlert: {
    backgroundColor: '#3B82F6',
  },
  acknowledgedAlert: {
    backgroundColor: '#10B981',
  },
  alertValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  alertLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reasonsList: {
    gap: 12,
  },
  reasonItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reasonRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonInfo: {
    flex: 1,
  },
  reasonCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reasonSubCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  reasonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reasonStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonStatText: {
    fontSize: 14,
    color: '#666',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { alertApi } from '../../lib/api';
import { router } from 'expo-router';
import { clearAlert } from '../../store/alertSlice';

interface Alert {
  _id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'CREATED' | 'ACKNOWLEDGED' | 'CLEARED';
  machineId: string | { _id: string; name: string; code: string };
  createdBy: string | { _id: string; email: string; firstName?: string; lastName?: string };
  acknowledgedBy?: (string | { _id: string; email: string; firstName?: string; lastName?: string })[];
  clearedBy?: string | { _id: string; email: string; firstName?: string; lastName?: string };
  createdAt: string;
  acknowledgedAt?: string;
  clearedAt?: string;
}

export default function AlertScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CREATED' | 'ACKNOWLEDGED' | 'CLEARED'>('ALL');
  
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const isSupervisor = user?.role === 'supervisor';
  const isOperator = user?.role === 'operator';

  // Load alerts
  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertApi.getAll();
      
      if (response.data.success && Array.isArray(response.data.data)) {
        setAlerts(response.data.data);
      } else {
        setAlerts([]);
      }
    } catch (error: any) {
      console.error('Failed to load alerts:', error);
      showToast('Failed to load alerts', 'error');
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
  };

  // Handle create alert navigation
  const handleCreateAlert = () => {
    router.push('/create-alert');
  };

  // Handle simulate alert (for testing)
  const handleSimulateAlert = async () => {
    try {
      const response = await alertApi.simulate();
      if (response.data.success) {
        showToast('Test alert created', 'success');
        loadAlerts();
      }
    } catch (error) {
      showToast('Failed to simulate alert', 'error');
    }
  };

  // Handle acknowledge (both operator and supervisor)
  const handleAcknowledge = async (alertId: string) => {
    RNAlert.alert(
      'Acknowledge Alert',
      'Are you sure you want to acknowledge this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Acknowledge', 
          onPress: async () => {
            try {
              setActionLoading(alertId);
              const response = await alertApi.acknowledge(alertId, {
                notes: `Acknowledged by ${user?.role}`
              });
              
              if (response.data.success) {
                showToast('Alert acknowledged', 'success');
                await loadAlerts(); // Refresh list
              }
            } catch (error: any) {
              showToast(error.response?.data?.error || 'Failed to acknowledge', 'error');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // Handle clear (supervisor only)
  const handleClearAlert = async (alertId: string) => {
    RNAlert.alert(
      'Clear Alert',
      'Mark this alert as resolved? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Alert', 
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(alertId);
              const response = await alertApi.clear(alertId, {
                notes: 'Issue resolved and cleared'
              });
              
              if (response.data.success) {
                // Update Redux
                dispatch(clearAlert({
                  id: alertId,
                  user: {
                    _id: user?._id || '',
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    email: user?.email || '',
                    role: user?.role || 'supervisor'
                  }
                }));
                
                showToast('Alert cleared successfully', 'success');
                await loadAlerts(); // Refresh list
              }
            } catch (error: any) {
              showToast(error.response?.data?.error || 'Failed to clear alert', 'error');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CREATED': return '#F59E0B';
      case 'ACKNOWLEDGED': return '#3B82F6';
      case 'CLEARED': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'HIGH': return '#DC2626';
      case 'MEDIUM': return '#F59E0B';
      case 'LOW': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get machine name
  const getMachineName = (machineId: any) => {
    if (typeof machineId === 'object' && machineId.name) {
      return machineId.name;
    }
    return 'Unknown Machine';
  };

  // Get created by email
  const getCreatedByEmail = (createdBy: any) => {
    if (typeof createdBy === 'object' && createdBy.email) {
      return createdBy.email;
    }
    return createdBy || 'Unknown';
  };

  const getFilteredAlerts = () => {
    if (filter === 'ALL') return alerts;
    return alerts.filter(alert => alert.status === filter);
  };

  const filteredAlerts = getFilteredAlerts();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Create Alert button for both roles */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {isOperator ? 'View and acknowledge alerts' : 'Manage all alerts'}
          </Text>
        </View>
        
        {/* Both roles can create alerts */}
        <View style={styles.headerButtons}>
          {isSupervisor && (
            <TouchableOpacity
              style={[styles.headerButton, styles.simulateButton]}
              onPress={handleSimulateAlert}
            >
              <MaterialIcons name="play-arrow" size={18} color="#fff" />
              <Text style={styles.headerButtonText}>Simulate</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.headerButton, styles.createButton]}
            onPress={handleCreateAlert}
          >
            <MaterialIcons name="add-alert" size={18} color="#fff" />
            <Text style={styles.headerButtonText}>Create Alert</Text>
          </TouchableOpacity>
        </View>
      </View>

<View style={styles.filterGrid}>
  {/* First row: ALL and CREATED */}
  <View style={styles.filterRow}>
    <TouchableOpacity
      style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
      onPress={() => setFilter('ALL')}
    >
      <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
        All ({alerts.length})
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.filterTab, filter === 'CREATED' && styles.filterTabActive]}
      onPress={() => setFilter('CREATED')}
    >
      <MaterialIcons 
        name="warning" 
        size={18} 
        color={filter === 'CREATED' ? '#fff' : '#F59E0B'} 
      />
      <Text style={[styles.filterTabText, filter === 'CREATED' && styles.filterTabTextActive]}>
        Created ({alerts.filter(a => a.status === 'CREATED').length})
      </Text>
    </TouchableOpacity>
  </View>

  {/* Second row: ACKNOWLEDGED and CLEARED */}
  <View style={styles.filterRow}>
    <TouchableOpacity
      style={[styles.filterTab, filter === 'ACKNOWLEDGED' && styles.filterTabActive]}
      onPress={() => setFilter('ACKNOWLEDGED')}
    >
      <MaterialIcons 
        name="check-circle" 
        size={18} 
        color={filter === 'ACKNOWLEDGED' ? '#fff' : '#3B82F6'} 
      />
      <Text style={[styles.filterTabText, filter === 'ACKNOWLEDGED' && styles.filterTabTextActive]}>
        Acknowledged ({alerts.filter(a => a.status === 'ACKNOWLEDGED').length})
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.filterTab, filter === 'CLEARED' && styles.filterTabActive]}
      onPress={() => setFilter('CLEARED')}
    >
      <MaterialIcons 
        name="verified" 
        size={18} 
        color={filter === 'CLEARED' ? '#fff' : '#10B981'} 
      />
      <Text style={[styles.filterTabText, filter === 'CLEARED' && styles.filterTabTextActive]}>
        Cleared ({alerts.filter(a => a.status === 'CLEARED').length})
      </Text>
    </TouchableOpacity>
  </View>
</View>

      {/* Alerts List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Alerts</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'ALL' 
                ? 'No alerts found'
                : `No ${filter.toLowerCase()} alerts found`
              }
            </Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => (
            <View key={alert._id} style={styles.alertCard}>
              {/* Alert Header with Status */}
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(alert.status) }]} />
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                </View>
                
                <View style={styles.alertMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(alert.priority) }]}>
                    <Text style={styles.priorityText}>{alert.priority}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) }]}>
                    <Text style={styles.statusText}>{alert.status}</Text>
                  </View>
                </View>
              </View>

              {/* Alert Description */}
              {alert.description && (
                <Text style={styles.alertDescription}>{alert.description}</Text>
              )}

              {/* Alert Details */}
              <View style={styles.alertDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="precision-manufacturing" size={14} color="#666" />
                  <Text style={styles.detailLabel}>Machine:</Text>
                  <Text style={styles.detailValue}>{getMachineName(alert.machineId)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="person" size={14} color="#666" />
                  <Text style={styles.detailLabel}>Created By:</Text>
                  <Text style={styles.detailValue}>{getCreatedByEmail(alert.createdBy)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="access-time" size={14} color="#666" />
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>{formatDate(alert.createdAt)}</Text>
                </View>
                
                {alert.acknowledgedAt && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={14} color="#3B82F6" />
                    <Text style={styles.detailLabel}>Acknowledged:</Text>
                    <Text style={styles.detailValue}>{formatDate(alert.acknowledgedAt)}</Text>
                  </View>
                )}
                
                {alert.clearedAt && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="verified" size={14} color="#10B981" />
                    <Text style={styles.detailLabel}>Cleared:</Text>
                    <Text style={styles.detailValue}>{formatDate(alert.clearedAt)}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {/* Operator can acknowledge CREATED alerts */}
                {alert.status === 'CREATED' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acknowledgeButton]}
                    onPress={() => handleAcknowledge(alert._id)}
                    disabled={actionLoading === alert._id}
                  >
                    {actionLoading === alert._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Acknowledge</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {/* Supervisor can clear ACKNOWLEDGED alerts */}
                {isSupervisor && alert.status === 'ACKNOWLEDGED' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.clearButton]}
                    onPress={() => handleClearAlert(alert._id)}
                    disabled={actionLoading === alert._id}
                  >
                    {actionLoading === alert._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="done-all" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Clear Alert</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {/* Show completed badge for CLEARED alerts */}
                {alert.status === 'CLEARED' && (
                  <View style={styles.completedBadge}>
                    <MaterialIcons name="verified" size={16} color="#10B981" />
                    <Text style={styles.completedText}>Resolved</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  simulateButton: {
    backgroundColor: '#8B5CF6',
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  // Filter Grid - 2x2 layout
filterGrid: {
  backgroundColor: '#fff',
  padding: 16,
  paddingTop: 12,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
filterRow: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 12,
},
filterTab: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 12,
  borderRadius: 10,
  backgroundColor: '#f3f4f6',
  gap: 8,
},
filterTabActive: {
  backgroundColor: '#007AFF',
},
filterTabText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#6B7280',
},
filterTabTextActive: {
  color: '#fff',
},
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  alertMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  alertDetails: {
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  clearButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  completedText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '600',
  },
});
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
import { useToast } from '../../hooks/useToast';
import { alertApi } from '../../lib/api';
import { StatusIndicator } from '../../components/StatusIndicator';
import { router } from 'expo-router';

interface Alert {
  _id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'CREATED' | 'ACKNOWLEDGED' | 'CLEARED';
  machineId: {
    _id: string;
    name: string;
    code: string;
  };
  createdBy: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  acknowledgedBy?: {
    email: string;
  };
  clearedBy?: {
    email: string;
  };
  createdAt: string;
  acknowledgedAt?: string;
  clearedAt?: string;
}

export default function AlertScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
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

  // Handle alert creation (Operator only)
  const handleCreateAlert = () => {
    // Navigate to create alert screen or show modal
   router.push('/(app)/create-alert');
  };

  // Handle acknowledge (Supervisor only)
  const handleAcknowledge = async (alertId: string) => {
    if (!isSupervisor) return;
    
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
                notes: 'Acknowledged by supervisor'
              });
              
              if (response.data.success) {
                showToast('Alert acknowledged', 'success');
                await loadAlerts(); // Refresh list
              }
            } catch (error) {
              showToast('Failed to acknowledge alert', 'error');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // Handle clear (Supervisor only)
  const handleClear = async (alertId: string) => {
    if (!isSupervisor) return;
    
    RNAlert.alert(
      'Clear Alert',
      'Mark this alert as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Alert', 
          onPress: async () => {
            try {
              setActionLoading(alertId);
              const response = await alertApi.clear(alertId, {
                notes: 'Issue resolved'
              });
              
              if (response.data.success) {
                showToast('Alert cleared', 'success');
                await loadAlerts(); // Refresh list
              }
            } catch (error) {
              showToast('Failed to clear alert', 'error');
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
      case 'CREATED': return '#F59E0B'; // Orange
      case 'ACKNOWLEDGED': return '#3B82F6'; // Blue
      case 'CLEARED': return '#10B981'; // Green
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

  // Render action buttons based on role and status
  const renderAlertActions = (alert: Alert) => {
    // Operator can only see alerts, no actions
    if (isOperator) {
      return (
        <View style={styles.operatorView}>
          <Text style={styles.viewOnlyText}>View Only</Text>
        </View>
      );
    }

    // Supervisor actions based on status
    if (isSupervisor) {
      switch(alert.status) {
        case 'CREATED':
          return (
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
          );
        
        case 'ACKNOWLEDGED':
          return (
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={() => handleClear(alert._id)}
              disabled={actionLoading === alert._id}
            >
              {actionLoading === alert._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="done-all" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Clear</Text>
                </>
              )}
            </TouchableOpacity>
          );
        
        case 'CLEARED':
          return (
            <View style={styles.completedBadge}>
              <MaterialIcons name="verified" size={14} color="#10B981" />
              <Text style={styles.completedText}>Resolved</Text>
            </View>
          );
      }
    }

    return null;
  };

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {isOperator ? 'View all alerts' : 'Manage shop floor alerts'}
          </Text>
        </View>
        
        {/* Operator-only: Create Alert button */}
        {isOperator && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateAlert}
          >
            <MaterialIcons name="add-alert" size={20} color="#fff" />
            <Text style={styles.createButtonText}>New Alert</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Alerts List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Alerts</Text>
            <Text style={styles.emptyStateText}>
              {isOperator 
                ? 'No active alerts on the shop floor'
                : 'No alerts to manage at the moment'
              }
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert._id} style={styles.alertCard}>
              {/* Alert Header */}
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <MaterialIcons 
                    name="warning" 
                    size={20} 
                    color={getPriorityColor(alert.priority)} 
                  />
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(alert.priority) }]}>
                    <Text style={styles.priorityText}>{alert.priority}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) }]}>
                    <Text style={styles.statusText}>{alert.status}</Text>
                  </View>
                </View>
              </View>

              {/* Alert Description */}
              <Text style={styles.alertDescription}>{alert.description}</Text>

              {/* Alert Details */}
              <View style={styles.alertDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="precision-manufacturing" size={16} color="#666" />
                  <Text style={styles.detailText}>{alert.machineId?.name || 'Unknown'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="person" size={16} color="#666" />
                  <Text style={styles.detailText}>{alert.createdBy?.email || 'Unknown'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="access-time" size={16} color="#666" />
                  <Text style={styles.detailText}>{formatDate(alert.createdAt)}</Text>
                </View>
                
                {alert.acknowledgedAt && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={16} color="#3B82F6" />
                    <Text style={styles.detailText}>
                      Acknowledged: {formatDate(alert.acknowledgedAt)}
                    </Text>
                  </View>
                )}
                
                {alert.clearedAt && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="verified" size={16} color="#10B981" />
                    <Text style={styles.detailText}>
                      Cleared: {formatDate(alert.clearedAt)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons (Role-based) */}
              <View style={styles.actionsContainer}>
                {renderAlertActions(alert)}
              </View>
            </View>
          ))
        )}
        
        {/* Stats Summary */}
        {alerts.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{alerts.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.createdValue]}>
                  {alerts.filter(a => a.status === 'CREATED').length}
                </Text>
                <Text style={styles.statLabel}>Created</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.acknowledgedValue]}>
                  {alerts.filter(a => a.status === 'ACKNOWLEDGED').length}
                </Text>
                <Text style={styles.statLabel}>Acknowledged</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.clearedValue]}>
                  {alerts.filter(a => a.status === 'CLEARED').length}
                </Text>
                <Text style={styles.statLabel}>Cleared</Text>
              </View>
            </View>
          </View>
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    borderRadius: 6,
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
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 8,
  },
  operatorView: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewOnlyText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  clearButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  completedText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  createdValue: {
    color: '#F59E0B',
  },
  acknowledgedValue: {
    color: '#3B82F6',
  },
  clearedValue: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});
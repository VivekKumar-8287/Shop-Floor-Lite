import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { machineApi, maintenanceApi, syncApi } from '../../lib/api';
import { router } from 'expo-router';
import { useApiErrorHandler } from '../../components/ToastProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo'; 
import { STORAGE_KEYS } from '../../lib/storageKeys';

interface MaintenanceTask {
  _id: string;
  title: string;
  description?: string;
  status: 'DUE' | 'OVERDUE' | 'DONE';
  machineId: string | { _id: string; name: string; code: string };
  dueDate?: string;
  completedAt?: string;
  completedBy?: string | { _id: string; firstName?: string; lastName?: string; email: string };
  createdAt: string;
  completionNotes?: string;
}

export default function MaintenanceScreen() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'DUE' | 'OVERDUE' | 'DONE'>('ALL');
  const [machines, setMachines] = useState<{ _id: string; name: string }[]>([]);
const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  
  const user = useSelector((state: RootState) => state.auth.user);
  const { showToast } = useToast();
  const { handleApiError } = useApiErrorHandler();

  const isSupervisor = user?.role === 'supervisor';
  const isOperator = user?.role === 'operator';

const loadTasks = async () => {
  try {
    setLoading(true);

    const { isConnected } = await NetInfo.fetch();
    let responseTasks: MaintenanceTask[] = [];

    if (isConnected) {
      const response = isOperator
        ? await maintenanceApi.getOverdue()
        : await maintenanceApi.getAll({ limit: 50 });

      responseTasks = response.data.data || [];

      if (responseTasks.length > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_CACHE,
          JSON.stringify(responseTasks)
        );
      }
    } else {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCE_CACHE);
      responseTasks = cached ? JSON.parse(cached) : [];
      showToast('Offline mode: showing cached data', 'info');
    }

    setTasks(responseTasks);
  } catch (e) {
    console.error(e);
    showToast('Failed to load maintenance tasks', 'error');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};


useEffect(() => {
  const loadMachines = async () => {
    try {
        const response = await machineApi.getAll();
            console.log("Response data",response.data)
      setMachines(response.data.data);
    } catch (error) {
      showToast('Failed to load machines', 'error');
    }
  };
  loadMachines();
  loadTasks()
}, []);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      // Load offline tasks from AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCE_OFFLINE_QUEUE);
      const offlineTasks = stored ? JSON.parse(stored) : [];

      if (offlineTasks.length > 0) {
        try {
          await syncApi.syncMaintenance(offlineTasks);
          await AsyncStorage.removeItem(STORAGE_KEYS.MAINTENANCE_OFFLINE_QUEUE); // clear synced tasks
          showToast('Offline tasks synced successfully', 'success');
        } catch (error: any) {
          showToast('Failed to sync offline tasks', 'error');
        }
      }

      // Reload tasks from server
      loadTasks();
    }
  });
  return () => unsubscribe();
}, []);


  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
  };

  // Handle create maintenance navigation
  const handleCreateMaintenance = () => {
    router.push('/create-maintenance')
  };

  // Handle mark as complete (operator only)
  const handleCompleteTask = async (taskId: string) => {
  try {
    setActionLoading(taskId);
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected;

    if (isOnline) {
      // Online: complete directly via API
      const response = await maintenanceApi.complete(taskId, {
        completionNotes: 'Task completed by operator'
      });

      if (response.data.success) {
        showToast('Maintenance task completed', 'success');
        await loadTasks();
      } else {
        showToast(response.data.error || 'Failed to complete task', 'error');
      }
    } else {
      // Offline: save task locally to sync later
      const task = tasks.find(t => t._id === taskId);
      if (task) {
          // Save task to AsyncStorage for offline sync
const stored = await AsyncStorage.getItem('offlineMaintenanceTasks');
const offlineTasks = stored ? JSON.parse(stored) : [];
offlineTasks.push({ ...task, completionNotes: 'Task completed offline' });
await AsyncStorage.setItem(STORAGE_KEYS.MAINTENANCE_OFFLINE_QUEUE, JSON.stringify(offlineTasks));

        // Update UI immediately
        setTasks(prev =>
          prev.map(t => t._id === taskId ? { ...t, status: 'DONE', completionNotes: offlineTask.completionNotes } : t)
        );

        showToast('Task marked complete offline. It will sync when online.', 'info');
      }
    }
  } catch (error: any) {
    handleApiError(error, 'Failed to complete task');
  } finally {
    setActionLoading(null);
  }
};


  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'DUE': return '#3B82F6'; // Blue
      case 'OVERDUE': return '#DC2626'; // Red
      case 'DONE': return '#10B981'; // Green
      default: return '#6B7280';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'DUE': return 'schedule';
      case 'OVERDUE': return 'warning';
      case 'DONE': return 'check-circle';
      default: return 'help-outline';
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format date with time
  const formatDateTime = (dateString: string) => {
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

  // Get completed by name
  const getCompletedByName = (completedBy: any) => {
    if (typeof completedBy === 'object') {
      return `${completedBy.firstName || ''} ${completedBy.lastName || ''}`.trim() || completedBy.email;
    }
    return completedBy || 'Unknown';
  };

  // Filter tasks based on selected filter
 // Filter tasks by selected machine
const getFilteredTasks = () => {
  let filtered = tasks;
  if (selectedMachine) {
  filtered = filtered.filter(task => {
    if (typeof task.machineId === 'string') return task.machineId === selectedMachine;
    if (typeof task.machineId === 'object') return task.machineId._id === selectedMachine;
    return false;
  });
}
  if (filter !== 'ALL') {
    filtered = filtered.filter(task => task.status === filter);
  }
  return filtered;
};

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading maintenance tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Maintenance</Text>
          <Text style={styles.headerSubtitle}>
            {isOperator ? 'View and complete maintenance tasks' : 'Manage all maintenance tasks'}
          </Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      

      {/* Filter Tabs */}
      <View style={styles.filterGrid}>
        {/* First row: ALL and DUE */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
              All ({tasks.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterTab, filter === 'DUE' && styles.filterTabActive]}
            onPress={() => setFilter('DUE')}
          >
            <MaterialIcons 
              name="schedule" 
              size={18} 
              color={filter === 'DUE' ? '#fff' : '#3B82F6'} 
            />
            <Text style={[styles.filterTabText, filter === 'DUE' && styles.filterTabTextActive]}>
              Due ({tasks.filter(t => t.status === 'DUE').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Second row: OVERDUE and DONE */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'OVERDUE' && styles.filterTabActive]}
            onPress={() => setFilter('OVERDUE')}
          >
            <MaterialIcons 
              name="warning" 
              size={18} 
              color={filter === 'OVERDUE' ? '#fff' : '#DC2626'} 
            />
            <Text style={[styles.filterTabText, filter === 'OVERDUE' && styles.filterTabTextActive]}>
              Overdue ({tasks.filter(t => t.status === 'OVERDUE').length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterTab, filter === 'DONE' && styles.filterTabActive]}
            onPress={() => setFilter('DONE')}
          >
            <MaterialIcons 
              name="check-circle" 
              size={18} 
              color={filter === 'DONE' ? '#fff' : '#10B981'} 
            />
            <Text style={[styles.filterTabText, filter === 'DONE' && styles.filterTabTextActive]}>
              Done ({tasks.filter(t => t.status === 'DONE').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtonsRow}>
        {/* Supervisor can create maintenance tasks */}
        
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={handleCreateMaintenance}
          >
            <MaterialIcons name="add-task" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Create Maintenance</Text>
          </TouchableOpacity>
      </View>

      {/* Maintenance Tasks List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="construction" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Maintenance Tasks</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'ALL' 
                ? 'No maintenance tasks found'
                : `No ${filter.toLowerCase()} tasks found`
              }
            </Text>
            {isSupervisor && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleCreateMaintenance}
              >
                <MaterialIcons name="add-task" size={18} color="#fff" />
                <Text style={styles.createFirstButtonText}>Create First Task</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTasks.map((task) => (
            <View key={task._id} style={styles.taskCard}>
              {/* Task Header with Status */}
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleRow}>
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(task.status) }]} />
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                
                <View style={styles.taskMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                    <MaterialIcons 
                      name={getStatusIcon(task.status)} 
                      size={14} 
                      color="#fff" 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.statusText}>{task.status}</Text>
                  </View>
                </View>
              </View>

              {/* Task Description */}
              {task.description && (
                <Text style={styles.taskDescription}>{task.description}</Text>
              )}

              {/* Task Details */}
              <View style={styles.taskDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="precision-manufacturing" size={14} color="#666" />
                  <Text style={styles.detailLabel}>Machine:</Text>
                  <Text style={styles.detailValue}>{getMachineName(task.machineId)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="calendar-today" size={14} color="#666" />
                  <Text style={styles.detailLabel}>Due Date:</Text>
                  <Text style={[
                    styles.detailValue,
                    task.status === 'OVERDUE' && { color: '#DC2626', fontWeight: '600' }
                  ]}>
                    {formatDate(task.dueDate)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="access-time" size={14} color="#666" />
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(task.createdAt)}</Text>
                </View>
                
                {task.completedAt && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={14} color="#10B981" />
                    <Text style={styles.detailLabel}>Completed:</Text>
                    <Text style={styles.detailValue}>{formatDateTime(task.completedAt)}</Text>
                  </View>
                )}
                
                {task.completedBy && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="person" size={14} color="#666" />
                    <Text style={styles.detailLabel}>Completed By:</Text>
                    <Text style={styles.detailValue}>{getCompletedByName(task.completedBy)}</Text>
                  </View>
                )}
                
                {task.completionNotes && (
                  <View style={styles.notesContainer}>
                    <MaterialIcons name="notes" size={14} color="#666" />
                    <Text style={styles.notesText}>{task.completionNotes}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {/* Operator can complete DUE or OVERDUE tasks */}
                {isOperator && (task.status === 'DUE' || task.status === 'OVERDUE') && (
                  <TouchableOpacity
                    style={[styles.actionButtonCard, styles.completeButton]}
                    onPress={() => handleCompleteTask(task._id)}
                    disabled={actionLoading === task._id}
                  >
                    {actionLoading === task._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={18} color="#fff" />
                        <Text style={styles.actionButtonCardText}>Mark Complete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {/* Show completed badge for DONE tasks */}
                {task.status === 'DONE' && (
                  <View style={styles.completedBadge}>
                    <MaterialIcons name="verified" size={18} color="#10B981" />
                    <Text style={styles.completedText}>Completed</Text>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#000000ff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Filter Grid
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
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  createFirstButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  taskCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  taskDetails: {
    gap: 10,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    flex: 1,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  actionButtonCardText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  completedText: {
    color: '#047857',
    fontSize: 16,
    fontWeight: '600',
  },
});
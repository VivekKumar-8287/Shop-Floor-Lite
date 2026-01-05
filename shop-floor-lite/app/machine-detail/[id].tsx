import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { machineApi } from '../../lib/api';
import { downtimeApi } from '../../lib/api';
import { StatusIndicator } from '../../components/StatusIndicator';
import { MaterialIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';
import { RootState, AppDispatch } from '../../store';
import { endDowntime } from '../../store/downtimeSlice';
import { syncManager } from '../../lib/sync'; 
import { storage } from '../../lib/storage';

interface MachineDetail {
  _id: string;
  name: string;
  code: string;
  type: string;
  status: 'RUN' | 'IDLE' | 'OFF';
  tenant_id: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface Downtime {
  _id: string;
  id?: string;
  machineId: string | { _id: string };
  startTime: string;
  endTime?: string;
  reasonCategory?: string;
  reasonSubCategory?: string;
  reasonCode?: string;
  notes?: string;
}

export default function MachineDetail() {
  const { id } = useLocalSearchParams();
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDowntime, setActiveDowntime] = useState<Downtime | null>(null);
  const [loadingDowntime, setLoadingDowntime] = useState(false);
  const [endingDowntime, setEndingDowntime] = useState(false);
  
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  const user = useSelector((state: RootState) => state.auth.user);
  
  // Get downtime entries from Redux
  const downtimeEntries = useSelector((state: RootState) =>
  state.downtime.entries.filter(d =>
    (d.machineId === id || d.machineId?._id === id) &&
    d.endTime == null // null OR undefined only
  )
);

  // Load machine details
  const loadMachine = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading machine with ID:', id);
      
      const response = await machineApi.getById(id as string);
      console.log('📦 API Response:', response.data);
      
      if (response.data.success && response.data.data) {
        console.log('✅ Machine data received:', response.data.data);
        setMachine(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to load machine');
      }
    } catch (error: any) {
      console.error('❌ Error loading machine:', error);
      
      setError(error.response?.data?.error || error.message || "Failed to load machine details");

      // For demo/fallback
      const mockMachine: MachineDetail = {
        _id: id as string,
        name: 'Cutter 1',
        code: 'M-101',
        type: 'cutter',
        status: 'IDLE',
        tenant_id: 'tenant-001',
        isActive: true,
        createdAt: '2025-12-29T11:33:53.029Z',
        updatedAt: '2025-12-29T14:36:19.669Z',
      };
      setMachine(mockMachine);
    } finally {
      setLoading(false);
    }
  }, [id]);

const checkActiveDowntime = useCallback(async () => {
  try {
    setLoadingDowntime(true);

       // 1️⃣ Fetch backend downtime for this machine by ID
    const response = await downtimeApi.getById(id as string);
    let activeBackend: Downtime | null = null;

    if (response.data.success && response.data.data) {
      const downtime = response.data.data;
      // Only consider active downtime
      if (!downtime.endTime) {
        activeBackend = downtime;
      }
    }
    // 2️⃣ Update state, Redux, and storage
    if (activeBackend) {
      setActiveDowntime(activeBackend);

      // Update Redux: replace/add downtime
      dispatch(endDowntime(activeBackend)); // or addDowntime if your slice supports

      // Update Secure Storage
      const stored = await storage.getItem('downtimeEntries');
      const localDowntimes: Downtime[] = stored ? JSON.parse(stored) : [];
      const updatedLocal = localDowntimes.filter(d => d._id !== activeBackend!._id);
      updatedLocal.push(activeBackend);
      await storage.setItem('downtimeEntries', JSON.stringify(updatedLocal));
    } else {
      // No active downtime
      setActiveDowntime(null);
    }
   

  } catch (error) {
    console.error('⚠️ Failed to fetch active downtime, fallback to local storage', error);

    // Fallback: check local storage if backend fails
    const stored = await storage.getItem('downtimeEntries');
    const localDowntimes: Downtime[] = stored ? JSON.parse(stored) : [];
    const activeLocal = localDowntimes.find(d =>
      !d.endTime && (typeof d.machineId === 'string' ? d.machineId : d.machineId?._id) === id
    );
    setActiveDowntime(activeLocal || null);
  } finally {
    setLoadingDowntime(false);
  }
}, [id, downtimeEntries]);


 
  // Load all data
  useEffect(() => {
    if (id) {
      loadMachine();
    checkActiveDowntime(); 
    }
  }, [id, loadMachine,endingDowntime]);

  const updateMachineStatus = async (newStatus: MachineDetail['status']) => {
    if (!machine || machine.status === newStatus || updating) return;
    
    try {
      setUpdating(true);
      console.log(`🔄 Updating machine ${machine._id} status to: ${newStatus}`);
      
      const response = await machineApi.updateStatus(machine._id, newStatus);
      console.log('📦 Update response:', response.data);
      
      if (response.data.success) {
        // Update local state
        setMachine(prev => prev ? { ...prev, status: newStatus } : null);
        
        // Show success toast
        showToast(`Machine status updated to ${newStatus}`, 'success');
      } else {
        throw new Error(response.data.error || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      
      showToast(
        error.response?.data?.error || error.message || 'Failed to update status',
        'error'
      );
      
      // For demo/fallback
      if (machine) {
        setMachine({ ...machine, status: newStatus });
        showToast(`[Demo] Status updated to ${newStatus}`, 'info');
      }
    } finally {
      setUpdating(false);
    }
  };

 const handleStartDowntime = async () => {
  
  router.push({ pathname: '/(tabs)/downtime', params: { machineId: id } });
};


// FIXED: End downtime function (API-first, stable)
const handleEndDowntime = async () => {
  if (!activeDowntime || endingDowntime) return;

  setEndingDowntime(true);

  try {
    // Offline-ready: add to queue if offline
    const downtimeId = activeDowntime._id || activeDowntime.id;

    if (!downtimeId) throw new Error('No downtime ID found');

    if (navigator.onLine === false) {
      // Add to queue for offline sync
      await syncManager.addToQueue('downtime_end', { id: downtimeId, notes: 'Ended offline' });

      // Update local state immediately
      dispatch(
        endDowntime({
          id: downtimeId,
          endTime: new Date().toISOString(),
          notes: 'Ended offline',
        })
      );
      setActiveDowntime(null);
      showToast('Downtime queued for syncing (offline mode)', 'info');
    } else {
      // Online: call API directly
      const response = await downtimeApi.end(downtimeId, {});
      if (!response?.data?.success) throw new Error('Failed to end downtime');

      dispatch(
        endDowntime({
          id: downtimeId,
          endTime: response.data.data.endTime,
          notes: 'Downtime ended by operator',
        })
      );

      setActiveDowntime(null);
      await checkActiveDowntime();
      showToast('Downtime ended successfully', 'success');
    }

  } catch (error: any) {
    console.error('End downtime error:', error);
    showToast(error.message || 'Failed to end downtime', 'error');
  } finally {
    setEndingDowntime(false);
  }
};


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDowntimeDuration = () => {
    if (!activeDowntime?.startTime) return '0m';
    
    const start = new Date(activeDowntime.startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUN': return '#10B981';
      case 'IDLE': return '#F59E0B';
      case 'OFF': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUN': return 'play-arrow';
      case 'IDLE': return 'pause';
      case 'OFF': return 'power-off';
      default: return 'help-outline';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading machine details...</Text>
      </View>
    );
  }

  if (!machine) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Machine not found</Text>
        <Text style={styles.subText}>ID: {id}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Machine Details</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.machineHeader}>
          <View>
            <Text style={styles.machineName}>{machine.name}</Text>
            <Text style={styles.machineCode}>Code: {machine.code}</Text>
          </View>
          <StatusIndicator status={machine.status} size="large" />
        </View>
        
        {error && (
          <View style={styles.demoBanner}>
            <MaterialIcons name="warning" size={16} color="#856404" />
            <Text style={styles.demoText}> {error}</Text>
          </View>
        )}
      </View>

      {/* Status Overview Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Overview</Text>
        
        <View style={styles.currentStatusContainer}>
          <View style={styles.currentStatusLabel}>
            <Text style={styles.currentStatusText}>Current Status:</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(machine.status) }]}>
            <MaterialIcons 
              name={getStatusIcon(machine.status)} 
              size={16} 
              color="#fff" 
              style={{ marginRight: 6 }}
            />
            <Text style={styles.statusText}>{machine.status}</Text>
            {updating && (
              <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>
        
        <Text style={styles.statusDescription}>
          {machine.status === 'RUN' ? 'Machine is operating normally and producing' :
           machine.status === 'IDLE' ? 'Machine is idle and available for production' :
           'Machine is powered off and not in use'}
        </Text>
        
        <View style={styles.updateSection}>
          <Text style={styles.updateTitle}>Update Status:</Text>
          <View style={styles.statusButtonsContainer}>
            {/* RUN Button */}
            <TouchableOpacity
              style={[
                styles.statusButton,
                styles.runButton,
                machine.status === 'RUN' && styles.statusButtonActive,
                updating && styles.statusButtonDisabled
              ]}
              onPress={() => updateMachineStatus('RUN')}
              disabled={updating || machine.status === 'RUN'}
            >
              <MaterialIcons name="play-arrow" size={20} color="#fff" />
              <Text style={styles.statusButtonText}>RUN</Text>
            </TouchableOpacity>
            
            {/* IDLE Button */}
            <TouchableOpacity
              style={[
                styles.statusButton,
                styles.idleButton,
                machine.status === 'IDLE' && styles.statusButtonActive,
                updating && styles.statusButtonDisabled
              ]}
              onPress={() => updateMachineStatus('IDLE')}
              disabled={updating || machine.status === 'IDLE'}
            >
              <MaterialIcons name="pause" size={20} color="#fff" />
              <Text style={styles.statusButtonText}>IDLE</Text>
            </TouchableOpacity>
            
            {/* OFF Button */}
            <TouchableOpacity
              style={[
                styles.statusButton,
                styles.offButton,
                machine.status === 'OFF' && styles.statusButtonActive,
                updating && styles.statusButtonDisabled
              ]}
              onPress={() => updateMachineStatus('OFF')}
              disabled={updating || machine.status === 'OFF'}
            >
              <MaterialIcons name="power-off" size={20} color="#fff" />
              <Text style={styles.statusButtonText}>OFF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

    {/* Downtime Management Card */}
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardTitle}>Downtime</Text>
    {activeDowntime && (
      <View style={styles.activeDowntimeBadge}>
        <MaterialIcons name="timer" size={14} color="#DC2626" />
        <Text style={styles.activeDowntimeText}>ACTIVE</Text>
      </View>
    )}
  </View>

  {loadingDowntime ? (
    <View style={styles.centerLoader}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.loadingText}>Checking downtime...</Text>
    </View>
  ) : activeDowntime ? (
    <View style={styles.activeDowntimeContainer}>
      <View style={styles.downtimeInfo}>
        <View style={styles.downtimeHeader}>
          <MaterialIcons name="timer-off" size={24} color="#DC2626" />
          <View style={styles.downtimeDetails}>
            <Text style={styles.downtimeReason}>
              {activeDowntime.reasonCategory || activeDowntime.reasonCode} 
              {activeDowntime.reasonSubCategory ? ` → ${activeDowntime.reasonSubCategory}` : ''}
            </Text>
            <Text style={styles.downtimeTime}>
              Started: {formatDate(activeDowntime.startTime)}
            </Text>
            <Text style={styles.downtimeDuration}>
              Duration: {calculateDowntimeDuration()}
            </Text>
          </View>
        </View>

        <Text style={styles.downtimeNotes}>
          {activeDowntime.notes || 'No additional notes'}
        </Text>

        {/* ONLY END DOWNTIME BUTTON */}
        <TouchableOpacity
          style={[styles.actionButton, styles.endButton]}
          onPress={handleEndDowntime}
          disabled={endingDowntime}
        >
          {endingDowntime ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="stop-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>End Downtime</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  ) : (
    <View style={styles.noDowntimeContainer}>
      <MaterialIcons name="timer-off" size={40} color="#9CA3AF" />
      <Text style={styles.noDowntimeText}>No active downtime</Text>
      <Text style={styles.noDowntimeSubtext}>
        Start downtime to track machine stoppages
      </Text>

      {/* ONLY RECORD DOWNTIME BUTTON */}
      <TouchableOpacity
        style={[styles.actionButton, styles.startButton, styles.flexButton]}
        onPress={handleStartDowntime}
      >
        <MaterialIcons name="play-arrow" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Record Downtime</Text>
      </TouchableOpacity>
    </View>
  )}
</View>


      {/* Machine Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Machine Information</Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{machine.type.toUpperCase()}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Tenant ID</Text>
            <Text style={styles.infoValue}>{machine.tenant_id}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{formatDate(machine.updatedAt)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>{formatDate(machine.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={() => {
        loadMachine();
        checkActiveDowntime();
      }}>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  machineName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  machineCode: {
    fontSize: 16,
    color: '#666',
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  demoText: {
    color: '#856404',
    fontSize: 14,
    marginLeft: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentStatusLabel: {
    flex: 1,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  updateSection: {
    marginTop: 16,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  runButton: {
    backgroundColor: '#10B981',
  },
  idleButton: {
    backgroundColor: '#F59E0B',
  },
  offButton: {
    backgroundColor: '#6B7280',
  },
  statusButtonActive: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Downtime Card Styles
  activeDowntimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeDowntimeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  centerLoader: {
    alignItems: 'center',
    padding: 20,
  },
  activeDowntimeContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  downtimeInfo: {
    gap: 12,
  },
  downtimeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  downtimeDetails: {
    flex: 1,
  },
  downtimeReason: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  downtimeTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  downtimeDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  downtimeNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noDowntimeContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  noDowntimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noDowntimeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  endButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 20,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  
  flexButton: {
    flex: 1,
    minWidth: 0,
  },
  
  endExistingButton: {
    backgroundColor: '#F59E0B',
  },
});
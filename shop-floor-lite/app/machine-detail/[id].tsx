import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Alert
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
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [loadingDowntime, setLoadingDowntime] = useState(false);
  const [endingDowntime, setEndingDowntime] = useState(false);
  
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  const user = useSelector((state: RootState) => state.auth.user);
  
  // Get downtime entries from Redux
  const downtimeEntries = useSelector((state: RootState) => 
    state.downtime.entries.filter(d => 
      (d.machineId === id || d.machineId?._id === id) && 
      !d.endTime
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

  // Check for active downtime
  const checkActiveDowntime = useCallback(async () => {
    try {
      setLoadingDowntime(true);
      console.log('🔍 Checking active downtime for machine:', id);
      console.log('📱 Redux downtime entries:', downtimeEntries);
      
      // First check Redux for local active downtimes
      if (downtimeEntries.length > 0) {
        console.log('📱 Found active downtime in Redux:', downtimeEntries[0]);
        setActiveDowntime(downtimeEntries[0] as Downtime);
        return;
      }
      
      // Then check API for server active downtimes
      console.log('🌐 Checking API for active downtimes...');
      const response = await downtimeApi.getAll();
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const machineDowntimes = response.data.data.filter((downtime: Downtime) => {
          const machineId = downtime.machineId;
          const isMatch = 
            (typeof machineId === 'object' && machineId?._id === id) ||
            machineId === id;
          
          return isMatch && !downtime.endTime;
        });
        
        console.log('🔍 Filtered machine downtimes:', machineDowntimes);
        
        if (machineDowntimes.length > 0) {
          console.log('🌐 Found active downtime on server:', machineDowntimes[0]);
          setActiveDowntime(machineDowntimes[0]);
        } else {
          console.log('✅ No active downtime found');
          setActiveDowntime(null);
        }
      } else {
        setActiveDowntime(null);
      }
    } catch (error) {
      console.error('❌ Error checking active downtime:', error);
      // If API fails, rely on Redux data
      if (downtimeEntries.length > 0) {
        setActiveDowntime(downtimeEntries[0] as Downtime);
      } else {
        setActiveDowntime(null);
      }
    } finally {
      setLoadingDowntime(false);
    }
  }, [id, downtimeEntries]);

  const loadChecklist = async () => {
    // Mock checklist data
    const mockChecklist = [
      { id: '1', task: 'Check lubrication levels', due: 'Today', status: 'pending' },
      { id: '2', task: 'Inspect cutting blades', due: 'Today', status: 'completed' },
      { id: '3', task: 'Clean machine surfaces', due: 'Today', status: 'pending' },
      { id: '4', task: 'Verify safety guards', due: 'Overdue', status: 'overdue' },
    ];
    setChecklistItems(mockChecklist);
  };

  // Load all data
  useEffect(() => {
    if (id) {
      loadMachine();
      loadChecklist();
    }
  }, [id, loadMachine]);


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

  const handleStartDowntime = () => {
    router.push({
      pathname: '/(tabs)/downtime',
      params: { 
        machineId: machine?._id || id, 
        machineName: machine?.name 
      }
    });
  };

  // FIXED: Improved end downtime function
  const handleEndDowntimeSimple = () => {
    if (!activeDowntime) {
      showToast('No active downtime found', 'error');
      return;
    }

    Alert.alert(
      'End Downtime',
      'Are you sure you want to end this downtime?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Downtime', 
          style: 'destructive',
          onPress: async () => {
            try {
              setEndingDowntime(true);
              
              // Get the correct downtime ID
              const downtimeId = activeDowntime._id || activeDowntime.id;
              console.log('🛑 Ending downtime with ID:', downtimeId);
              
              if (!downtimeId) {
                throw new Error('No downtime ID found');
              }
              
              const endTime = new Date().toISOString();
              
              // 1. Update Redux store
              console.log('🔄 Dispatching to Redux...');
              dispatch(endDowntime({
                id: downtimeId,
                endTime: endTime,
                notes: 'Downtime ended by operator'
              }));
              
              // 2. Update local state immediately
              setActiveDowntime(null);
              showToast('Downtime ended locally', 'success');
              
              // 3. Try to sync with API (online)
              console.log('🌐 Attempting API sync...');
              try {
                const response = await downtimeApi.end(downtimeId, {
                  endTime: endTime,
                  notes: 'Downtime ended by operator'
                });
                
                if (response.data.success) {
                  console.log('✅ API sync successful');
                  showToast('Downtime synced to server', 'success');
                } else {
                  console.log('⚠️ API response not successful');
                  // Don't show error - offline sync will handle it
                }
              } catch (apiError) {
                console.log('🌐 API call failed (might be offline)', apiError);
                // This is okay - offline sync will handle it
              }
              
            } catch (error: any) {
              console.error('❌ Error ending downtime:', error);
              showToast('Error ending downtime: ' + error.message, 'error');
              // Reload downtime state to ensure consistency
              checkActiveDowntime();
            } finally {
              setEndingDowntime(false);
            }
          }
        }
      ]
    );
  };

  // Add these functions to your component:

// Function to end an existing downtime (from API)
const handleEndExistingDowntime = async () => {
  try {
    setLoadingDowntime(true);
    
    // Fetch all downtimes from API
    const response = await downtimeApi.getAll();
    
    if (response.data.success && Array.isArray(response.data.data)) {
      const machineDowntimes = response.data.data.filter((downtime: Downtime) => {
        const machineId = downtime.machineId;
        const isMatch = 
          (typeof machineId === 'object' && machineId?._id === id) ||
          machineId === id;
        
        return isMatch && !downtime.endTime;
      });
      
      if (machineDowntimes.length === 0) {
        showToast('No active downtimes found', 'info');
        return;
      }
      
      // If we found active downtimes, show selection
      if (machineDowntimes.length === 1) {
        // Only one active downtime - end it directly
        setActiveDowntime(machineDowntimes[0]);
        handleEndDowntimeSimple();
      } else {
        // Multiple active downtimes - let user choose
        Alert.alert(
          'Select Downtime to End',
          `Found ${machineDowntimes.length} active downtimes`,
          machineDowntimes.map((dt: Downtime, index: number) => ({
            text: `Downtime ${index + 1} (${formatDate(dt.startTime)})`,
            onPress: () => {
              setActiveDowntime(dt);
              handleEndDowntimeSimple();
            }
          })).concat([{ text: 'Cancel', style: 'cancel' }])
        );
      }
    }
  } catch (error) {
    console.error('Error fetching downtimes:', error);
    showToast('Failed to load downtimes', 'error');
  } finally {
    setLoadingDowntime(false);
  }
};

// Function to end ALL downtimes for this machine
const handleEndAllDowntimes = async () => {
  Alert.alert(
    'End All Downtimes',
    'This will end ALL active downtimes for this machine. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'End All', 
        style: 'destructive',
        onPress: async () => {
          try {
            setEndingDowntime(true);
            
            // Fetch all active downtimes
            const response = await downtimeApi.getAll();
            
            if (response.data.success && Array.isArray(response.data.data)) {
              const activeDowntimes = response.data.data.filter((downtime: Downtime) => {
                const machineId = downtime.machineId;
                const isMatch = 
                  (typeof machineId === 'object' && machineId?._id === id) ||
                  machineId === id;
                
                return isMatch && !downtime.endTime;
              });
              
              let endedCount = 0;
              const endTime = new Date().toISOString();
              
              // End each downtime
              for (const downtime of activeDowntimes) {
                try {
                  const downtimeId = downtime._id || downtime.id;
                  if (downtimeId) {
                    // Update Redux
                    dispatch(endDowntime({
                      id: downtimeId,
                      endTime: endTime,
                      notes: 'All downtimes ended by operator'
                    }));
                    
                    // Call API
                    await downtimeApi.end(downtimeId, {
                      endTime: endTime,
                      notes: 'All downtimes ended by operator'
                    });
                    
                    endedCount++;
                  }
                } catch (error) {
                  console.error(`Error ending downtime ${downtime._id}:`, error);
                }
              }
              
              // Update local state
              setActiveDowntime(null);
              
              if (endedCount > 0) {
                showToast(`Ended ${endedCount} downtime(s)`, 'success');
              } else {
                showToast('No downtimes to end', 'info');
              }
              
              // Refresh data
              await checkActiveDowntime();
            }
          } catch (error) {
            console.error('Error ending all downtimes:', error);
            showToast('Failed to end all downtimes', 'error');
          } finally {
            setEndingDowntime(false);
          }
        }
      }
    ]
  );
};

  const handleViewChecklist = () => {
    router.push({
      pathname: '/(tabs)/maintenance',
      params: { 
        machineId: machine?._id || id, 
        machineName: machine?.name 
      }
    });
  };

  const handleCompleteChecklistItem = (itemId: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'completed', completedAt: new Date().toISOString() }
          : item
      )
    );
    showToast('Task marked as completed', 'success');
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
        
        {/* END DOWNTIME BUTTON (shows when there IS active downtime) */}
        <TouchableOpacity
          style={[styles.actionButton, styles.endButton]}
          onPress={handleEndDowntimeSimple}
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
      
      {/* BUTTONS ROW: Shows both buttons when NO active downtime */}
      <View style={styles.buttonRow}>
        {/* RECORD DOWNTIME BUTTON */}
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton, styles.flexButton]}
          onPress={handleStartDowntime}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Record Downtime</Text>
        </TouchableOpacity>
        
        {/* END DOWNTIME BUTTON (for ending existing downtimes) */}
        <TouchableOpacity
          style={[styles.actionButton, styles.endExistingButton, styles.flexButton]}
          onPress={handleEndExistingDowntime}
        >
          <MaterialIcons name="stop-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>End Existing</Text>
        </TouchableOpacity>
      </View>
      
      {/* Or show a single button to end ALL downtimes */}
      <TouchableOpacity
        style={[styles.actionButton, styles.endAllButton]}
        onPress={handleEndAllDowntimes}
      >
        <MaterialIcons name="stop" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>End All Downtimes</Text>
      </TouchableOpacity>
    </View>
  )}
</View>

      {/* Maintenance Checklist Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Maintenance Checklist</Text>
          <TouchableOpacity onPress={handleViewChecklist}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.checklistSummary}>
          <View style={styles.checklistStat}>
            <Text style={styles.checklistStatValue}>
              {checklistItems.filter(item => item.status === 'completed').length}
            </Text>
            <Text style={styles.checklistStatLabel}>Completed</Text>
          </View>
          <View style={styles.checklistStat}>
            <Text style={styles.checklistStatValue}>
              {checklistItems.filter(item => item.status === 'pending').length}
            </Text>
            <Text style={styles.checklistStatLabel}>Pending</Text>
          </View>
          <View style={styles.checklistStat}>
            <Text style={[styles.checklistStatValue, styles.overdueValue]}>
              {checklistItems.filter(item => item.status === 'overdue').length}
            </Text>
            <Text style={styles.checklistStatLabel}>Overdue</Text>
          </View>
        </View>
        
        <View style={styles.checklistItems}>
          {checklistItems.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistItem}
              onPress={() => handleCompleteChecklistItem(item.id)}
            >
              <View style={styles.checklistItemLeft}>
                <MaterialIcons 
                  name={item.status === 'completed' ? 'check-circle' : 'radio-button-unchecked'} 
                  size={24} 
                  color={item.status === 'completed' ? '#10B981' : 
                         item.status === 'overdue' ? '#DC2626' : '#9CA3AF'} 
                />
                <View style={styles.checklistItemInfo}>
                  <Text style={styles.checklistItemTask}>{item.task}</Text>
                  <Text style={[
                    styles.checklistItemDue,
                    item.status === 'overdue' && styles.overdueText
                  ]}>
                    {item.due} • {item.status === 'completed' ? 'Completed' : 'Pending'}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
        
        {checklistItems.length > 3 && (
          <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewChecklist}>
            <Text style={styles.viewMoreText}>
              View {checklistItems.length - 3} more items
            </Text>
          </TouchableOpacity>
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

// Styles remain the same as in your code
const styles = StyleSheet.create({
  // ... (your existing styles remain exactly the same)
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
  // Checklist Styles
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  checklistSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  checklistStat: {
    alignItems: 'center',
  },
  checklistStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  overdueValue: {
    color: '#DC2626',
  },
  checklistStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  checklistItems: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checklistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checklistItemInfo: {
    flex: 1,
  },
  checklistItemTask: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  checklistItemDue: {
    fontSize: 12,
    color: '#666',
  },
  overdueText: {
    color: '#DC2626',
    fontWeight: '500',
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewMoreText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Machine Info Styles
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
    minWidth: 0, // Important for flex to work properly
  },
  
  endExistingButton: {
    backgroundColor: '#F59E0B', // Orange color
  },
  
  endAllButton: {
    backgroundColor: '#8B5CF6', // Purple color
    marginTop: 12,
  },
});
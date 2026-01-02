import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhotoUploader } from '../../components/PhotoUploader';
import { addDowntimeEntry } from '../../store/downtimeSlice';
import { RootState } from '../../store';
import { downtimeApi } from '../../lib/api';
import { useToast } from '../../components/ToastProvider';
import { MaterialIcons } from '@expo/vector-icons';

// Define reason tree type
interface ReasonNode {
  code: string;
  label: string;
  children?: ReasonNode[];
}

interface Machine {
  _id: string;
  id?: string;
  name: string;
  code: string;
  type: string;
  status: string;
}

export default function DowntimeScreen() {
  const { machineId: initialMachineId, machineName: initialMachineName } = useLocalSearchParams<{ 
    machineId: string; 
    machineName?: string 
  }>();
  
  const [reasons, setReasons] = useState<ReasonNode[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedSubReason, setSelectedSubReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  const router = useRouter();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  
  const user = useSelector((state: RootState) => state.auth.user);
  const machines = useSelector((state: RootState) => state.machines.machines);

  // Set selected machine if machineId is provided in params
  useEffect(() => {
    if (initialMachineId && machines.length > 0) {
      const machine = machines.find(m => m._id === initialMachineId || m.id === initialMachineId);
      if (machine) {
        setSelectedMachine({
          _id: machine._id || machine.id,
          id: machine.id,
          name: initialMachineName || machine.name,
          code: machine.code || machine.id?.substring(0, 6) || 'N/A',
          type: machine.type || 'unknown',
          status: machine.status || 'IDLE'
        });
      }
    }
  }, [initialMachineId, initialMachineName, machines]);

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      setLoadingReasons(true);
      console.log('📡 Loading downtime reasons...');
      
      // Try to get reasons from API
      const response = await downtimeApi.getReasons();
      
      if (response.data.success && Array.isArray(response.data.data)) {
        console.log('✅ Reasons loaded from API:', response.data.data);
        setReasons(response.data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('❌ Failed to load reasons from API:', error);
      
      // Fallback to seed data from PDF
      const seedReasons: ReasonNode[] = [
        {
          code: 'POWER',
          label: 'Power',
          children: [
            { code: 'GRID', label: 'Grid' },
            { code: 'INTERNAL', label: 'Internal' },
          ]
        },
        {
          code: 'CHANGEOVER',
          label: 'Changeover',
          children: [
            { code: 'TOOLING', label: 'Tooling' },
          ]
        }
      ];
      
      setReasons(seedReasons);
      showToast('Using demo reason data', 'info');
    } finally {
      setLoadingReasons(false);
    }
  };

  const getSelectedReasonLabel = () => {
    if (!selectedReason) return '';
    const reason = reasons.find(r => r.code === selectedReason);
    return reason?.label || '';
  };

  const getSelectedSubReasonLabel = () => {
    if (!selectedReason || !selectedSubReason) return '';
    const reason = reasons.find(r => r.code === selectedReason);
    const subReason = reason?.children?.find(c => c.code === selectedSubReason);
    return subReason?.label || '';
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('📷 Converting photo to base64:', uri);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          console.log('✅ Photo converted, size:', base64.length, 'chars');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Error converting image to base64:', error);
      throw error;
    }
  };

  const handleStartDowntime = async () => {
    if (!selectedMachine) {
      Alert.alert('Error', 'Please select a machine first');
      return;
    }
    
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a primary reason');
      return;
    }

    setLoading(true);
    try {
      // Prepare downtime data
      const downtimeData = {
        machineId: selectedMachine._id,
        reasonCategory: selectedReason,
        reasonSubCategory: selectedSubReason || undefined,
        notes: notes || undefined,
        tenant_id: user?.tenant_id || 'tenant-001',
        startTime: new Date().toISOString(),
      };

      console.log('📤 Sending downtime data to backend:', downtimeData);

      // 1. Start downtime with backend
      const response = await downtimeApi.start(downtimeData);
      
      if (response.data.success) {
        const serverDowntimeId = response.data.data?._id;
        console.log('✅ Downtime started on server. ID:', serverDowntimeId);
        
        // 2. If photo exists, upload it separately
        if (photoUri && serverDowntimeId) {
          try {
            console.log('📷 Uploading photo...');
            const photoBase64 = await convertToBase64(photoUri);
            
            const sizeInKB = Math.ceil(photoBase64.length * 0.75) / 1024;
            if (sizeInKB > 200) {
              console.warn('⚠️ Photo size:', sizeInKB.toFixed(2), 'KB - exceeds 200KB limit');
              showToast('Photo exceeds 200KB limit and was not uploaded', 'warning');
            } else {
              await downtimeApi.uploadPhoto(serverDowntimeId, photoBase64);
              console.log('✅ Photo uploaded to server');
              showToast('Photo uploaded successfully', 'success');
            }
          } catch (photoError: any) {
            console.error('❌ Failed to upload photo:', photoError);
            showToast('Downtime saved but photo upload failed', 'warning');
          }
        }
        
        // 3. Create local entry with backend ID
        const downtimeEntry = {
          _id: serverDowntimeId || `local-${Date.now()}`,
          id: serverDowntimeId || `downtime-${Date.now()}`,
          machineId: {
            _id: selectedMachine._id,
            name: selectedMachine.name,
            code: selectedMachine.code,
            type: selectedMachine.type
          },
          reasonCategory: selectedReason,
          reasonSubCategory: selectedSubReason || undefined,
          startTime: new Date().toISOString(),
          endTime: undefined,
          notes: notes || undefined,
          photo: photoUri ? 'uploaded' : undefined,
          isSynced: true,
          tenant_id: user?.tenant_id || 'tenant-001',
          createdAt: new Date().toISOString(),
        };

        // Add to Redux store
        dispatch(addDowntimeEntry(downtimeEntry));
        
        showToast('Downtime started successfully', 'success');
        router.back();
      } else {
        throw new Error(response.data.error || 'Failed to start downtime');
      }
    } catch (error: any) {
      console.error('❌ Error starting downtime:', error);
      
      const isNetworkError = error.message?.includes('Network Error') || 
                            error.message?.includes('network') ||
                            !error.response;
      
      if (isNetworkError) {
        // Store in offline queue
        console.log('📶 Offline mode - saving locally');
        
        const offlineEntry = {
          id: `offline-${Date.now()}`,
          _id: `local-${Date.now()}`,
          machineId: selectedMachine._id,
          machineName: selectedMachine.name,
          startTime: new Date().toISOString(),
          endTime: undefined,
          reasonCategory: selectedReason,
          reasonSubCategory: selectedSubReason || undefined,
          notes: notes || undefined,
          photoUri: photoUri || undefined,
          isSynced: false,
          needsSync: true,
          tenant_id: user?.tenant_id || 'tenant-001',
        };
        
        dispatch(addDowntimeEntry(offlineEntry));
        
        Alert.alert(
          'Queued Offline',
          'Downtime saved locally. It will sync automatically when you reconnect.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                showToast('Downtime saved offline', 'info');
                router.back();
              }
            }
          ]
        );
      } else {
        console.error('API Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        Alert.alert(
          'Error',
          error.response?.data?.error || error.message || 'Failed to start downtime'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = (uri: string) => {
    setPhotoUri(uri);
    showToast('Photo captured', 'success');
  };

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const renderMachineItem = ({ item }: { item: Machine }) => {
    const isSelected = selectedMachine?._id === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.machineItem,
          isSelected && styles.machineItemSelected
        ]}
        onPress={() => handleSelectMachine(item)}
      >
        <View style={styles.machineItemContent}>
          <View style={styles.machineInfo}>
            <Text style={styles.machineName}>{item.name}</Text>
            <Text style={styles.machineCode}>Code: {item.code}</Text>
          </View>
          <View style={styles.machineStatusContainer}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: 
                item.status === 'RUN' ? '#10B981' : 
                item.status === 'IDLE' ? '#F59E0B' : 
                '#6B7280' 
              }
            ]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            {isSelected && (
              <MaterialIcons name="check-circle" size={20} color="#007AFF" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loadingReasons) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading downtime reasons...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Record Downtime</Text>
          
          {/* Machine Selection */}
          {!selectedMachine ? (
            <View style={styles.machineSelectionSection}>
              <Text style={styles.sectionTitle}>Select Machine</Text>
              <Text style={styles.sectionSubtitle}>
                Choose a machine to record downtime for
              </Text>
              
              <FlatList
                data={machines.map(m => ({
                  _id: m._id || m.id,
                  id: m.id,
                  name: m.name,
                  code: m.code || m.id?.substring(0, 6) || 'N/A',
                  type: m.type || 'unknown',
                  status: m.status || 'IDLE'
                }))}
                renderItem={renderMachineItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                contentContainerStyle={styles.machineList}
              />
            </View>
          ) : (
            <View style={styles.selectedMachineCard}>
              <View style={styles.selectedMachineHeader}>
                <MaterialIcons name="precision-manufacturing" size={24} color="#007AFF" />
                <View style={styles.selectedMachineInfo}>
                  <Text style={styles.selectedMachineName}>{selectedMachine.name}</Text>
                  <Text style={styles.selectedMachineCode}>
                    Code: {selectedMachine.code} • Type: {selectedMachine.type}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setSelectedMachine(null)}
                  style={styles.changeMachineButton}
                >
                  <Text style={styles.changeMachineText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Only show downtime form if machine is selected */}
        {selectedMachine && (
          <>
            {/* Current Selection Display */}
            {(selectedReason || selectedSubReason) && (
              <View style={styles.selectionCard}>
                <Text style={styles.selectionTitle}>Selected Reason:</Text>
                <View style={styles.selectionChips}>
                  {selectedReason && (
                    <View style={styles.reasonChip}>
                      <Text style={styles.reasonChipText}>
                        {getSelectedReasonLabel()}
                      </Text>
                      <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    </View>
                  )}
                  {selectedSubReason && (
                    <View style={[styles.reasonChip, styles.subReasonChip]}>
                      <Text style={styles.reasonChipText}>
                        {getSelectedSubReasonLabel()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Reason Selection - 2 Level Tree */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Downtime Reason</Text>
              <Text style={styles.sectionSubtitle}>
                Select primary category, then specific reason
              </Text>

              <View style={styles.reasonTree}>
                {reasons.map((reasonItem) => (
                  <View key={reasonItem.code} style={styles.reasonCategory}>
                    {/* Primary Reason Button */}
                    <TouchableOpacity
                      style={[
                        styles.primaryReasonButton,
                        selectedReason === reasonItem.code && styles.primaryReasonSelected
                      ]}
                      onPress={() => {
                        setSelectedReason(reasonItem.code);
                        setSelectedSubReason('');
                      }}
                    >
                      <View style={styles.reasonButtonContent}>
                        <MaterialIcons 
                          name="category" 
                          size={20} 
                          color={selectedReason === reasonItem.code ? '#007AFF' : '#666'} 
                        />
                        <Text style={[
                          styles.primaryReasonText,
                          selectedReason === reasonItem.code && styles.primaryReasonTextSelected
                        ]}>
                          {reasonItem.label}
                        </Text>
                      </View>
                      {selectedReason === reasonItem.code && (
                        <MaterialIcons name="check-circle" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>

                    {/* Sub-reasons */}
                    {selectedReason === reasonItem.code && reasonItem.children && (
                      <View style={styles.subReasonsContainer}>
                        <Text style={styles.subReasonTitle}>Select specific reason:</Text>
                        <View style={styles.subReasonGrid}>
                          {reasonItem.children.map((child) => (
                            <TouchableOpacity
                              key={child.code}
                              style={[
                                styles.subReasonButton,
                                selectedSubReason === child.code && styles.subReasonSelected
                              ]}
                              onPress={() => setSelectedSubReason(child.code)}
                            >
                              <Text style={[
                                styles.subReasonText,
                                selectedSubReason === child.code && styles.subReasonTextSelected
                              ]}>
                                {child.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Additional Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
              <Input
                placeholder="Describe the issue, actions taken, or any other relevant information..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                style={styles.notesInput}
              />
            </View>

            {/* Photo Upload */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Photo (Optional)</Text>
              <Text style={styles.photoSubtitle}>Max size: 200KB</Text>
              
              <PhotoUploader
                onPhotoTaken={handleTakePhoto}
                maxSizeKB={200}
                compressQuality={0.7}
              />
              
              {photoUri && (
                <View style={styles.photoPreview}>
                  <MaterialIcons name="photo" size={20} color="#007AFF" />
                  <Text style={styles.photoText}>Photo ready</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <Button
                title="Start Downtime"
                onPress={handleStartDowntime}
                loading={loading}
                disabled={!selectedReason}
                style={styles.startButton}
                icon={<MaterialIcons name="play-arrow" size={20} color="#fff" />}
              />
              
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
                style={styles.cancelButton}
                icon={<MaterialIcons name="close" size={20} color="#666" />}
              />
            </View>

            {/* Offline Status Indicator */}
            <View style={styles.offlineInfo}>
              <MaterialIcons name="cloud-off" size={16} color="#666" />
              <Text style={styles.offlineText}>
                This app works offline. Data will sync automatically when connected.
              </Text>
            </View>
          </>
        )}
      </View>
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
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  machineSelectionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  machineList: {
    gap: 8,
  },
  machineItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  machineItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  machineItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  machineCode: {
    fontSize: 14,
    color: '#666',
  },
  machineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedMachineCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  selectedMachineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedMachineInfo: {
    flex: 1,
  },
  selectedMachineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  selectedMachineCode: {
    fontSize: 14,
    color: '#4F46E5',
  },
  changeMachineButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changeMachineText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  selectionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },
  subReasonChip: {
    backgroundColor: '#F0F9FF',
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
  },
  section: {
    marginBottom: 28,
  },
  reasonTree: {
    gap: 16,
  },
  reasonCategory: {
    gap: 12,
  },
  primaryReasonButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryReasonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  reasonButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryReasonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  primaryReasonTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  subReasonsContainer: {
    marginLeft: 24,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  subReasonTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
  },
  subReasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subReasonButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subReasonSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#007AFF',
  },
  subReasonText: {
    fontSize: 14,
    color: '#666',
  },
  subReasonTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#E5E7EB',
  },
  photoSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  photoText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 8,
    gap: 12,
  },
  startButton: {
    marginTop: 12,
  },
  cancelButton: {
    marginBottom: 20,
  },
  offlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  offlineText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { PhotoUploader } from '../../../components/PhotoUploader';
import { addDowntimeEntry } from '../../../store/downtimeSlice';
import { RootState } from '../../../store';
import { downtimeApi } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import { MaterialIcons } from '@expo/vector-icons';

// Define reason tree type
interface ReasonNode {
  code: string;
  label: string;
  children?: ReasonNode[];
}

export default function DowntimeScreen() {
  const { machineId, machineName } = useLocalSearchParams<{ 
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
  
  const router = useRouter();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  
  const user = useSelector((state: RootState) => state.auth.user);
  const activeDowntimes = useSelector((state: RootState) => 
    state.downtime.entries.filter(d => !d.endTime && d.machineId === machineId)
  );

  useEffect(() => {
    loadReasons();
    
    // Check if machine already has active downtime
    if (activeDowntimes.length > 0) {
      Alert.alert(
        'Active Downtime',
        `This machine already has an active downtime. Do you want to end it first?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Active', 
            onPress: () => router.push({
              pathname: '/(app)/operator/active-downtime',
              params: { downtimeId: activeDowntimes[0].id }
            })
          }
        ]
      );
    }
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
  

 // Add this helper function at the top of your component, after imports but before the component
const convertToBase64 = async (uri: string): Promise<string> => {
  try {
    console.log('📷 Converting photo to base64:', uri);
    
    // For React Native - fetch the image
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

// Then update your handleStartDowntime function:
const handleStartDowntime = async () => {
  if (!selectedReason) {
    Alert.alert('Error', 'Please select a primary reason');
    return;
  }

  setLoading(true);
  try {
    // Prepare downtime data - MATCHING BACKEND FORMAT
    const downtimeData = {
      machineId: machineId!,
      reasonCategory: selectedReason,  // Changed from reasonCode to match backend
      reasonSubCategory: selectedSubReason || undefined,  // Changed from subReasonCode
      notes: notes || undefined,
      tenant_id: user?.tenant_id || 'tenant-001',
      startTime: new Date().toISOString(),
      // NOTE: Don't send photo here - upload separately
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
          
          // Check if photo is too large (approx calculation)
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
          // Don't fail the whole operation if photo upload fails
          showToast('Downtime saved but photo upload failed', 'warning');
        }
      }
      
      // 3. Create local entry with backend ID
      const downtimeEntry = {
        _id: serverDowntimeId || `local-${Date.now()}`,
        id: serverDowntimeId || `downtime-${Date.now()}`,
        machineId: {
          _id: machineId!,
          name: machineName || 'Unknown Machine',
          code: machineId!.substring(0, 6), // Extract code from ID if possible
          type: 'unknown'
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
    
    // Check if it's a network error (offline)
    const isNetworkError = error.message?.includes('Network Error') || 
                          error.message?.includes('network') ||
                          !error.response;
    
    if (isNetworkError) {
      // Store in offline queue
      console.log('📶 Offline mode - saving locally');
      
      const offlineEntry = {
        id: `offline-${Date.now()}`,
        _id: `local-${Date.now()}`,
        machineId: machineId!,
        machineName: machineName || 'Unknown Machine',
        startTime: new Date().toISOString(),
        endTime: undefined,
        reasonCategory: selectedReason,  // Changed to match backend
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
      // Other API error
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
          <Text style={styles.subtitle}>
            Machine: {machineName || 'Unknown'} ({machineId})
          </Text>
        </View>

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
                  <MaterialIcons 
                    name="check-circle" 
                    size={16} 
                    color="#10B981" 
                  />
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
                    setSelectedSubReason(''); // Reset sub-reason when changing primary
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

                {/* Sub-reasons (only show if this category is selected) */}
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
      </View>
    </ScrollView>
  );
}

// Add TouchableOpacity import
import { TouchableOpacity } from 'react-native';

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
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
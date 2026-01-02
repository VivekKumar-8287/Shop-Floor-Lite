import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useToast } from '../../hooks/useToast';
import { alertApi, machineApi } from '../../lib/api';
import { RootState } from '../../store';

interface Machine {
  _id: string;
  name: string;
  code: string;
  status: 'RUN' | 'IDLE' | 'OFF';
  type: string;
}

export default function CreateAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  
  // Data state
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Get machineId from params if coming from machine details
  const machineIdFromParams = params.machineId as string;

  // Load machines from API
  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading machines for alert creation...');
      
      const response = await machineApi.getAll();
      console.log('📦 Machines API response:', response.data);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        console.log(`✅ Found ${response.data.data.length} machines`);
        setMachines(response.data.data);
        
        // If coming from machine details, pre-select that machine
        if (machineIdFromParams) {
          console.log('🎯 Pre-selecting machine from params:', machineIdFromParams);
          const machineExists = response.data.data.find(m => m._id === machineIdFromParams);
          if (machineExists) {
            setSelectedMachineId(machineIdFromParams);
          } else {
            showToast('Machine not found', 'error');
          }
        } else if (response.data.data.length > 0) {
          // Otherwise select first machine
          setSelectedMachineId(response.data.data[0]._id);
        }
      } else {
        console.warn('⚠️ No machine data received');
        setMachines([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load machines:', error);
      showToast(
        error.response?.data?.error || error.message || 'Failed to load machines',
        'error'
      );
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
  if (!validateForm()) return;
  
  try {
    setSubmitting(true);
    
    // THIS IS THE MAIN API CALL
    const response = await alertApi.create({
      machineId: selectedMachineId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
    });
    
    if (response.data.success) {
      showToast('Alert created successfully!', 'success');
      router.back(); // Go back to previous screen
    } else {
      showToast(response.data.error || 'Failed to create alert', 'error');
    }
  } catch (error: any) {
    console.error('Error creating alert:', error);
    showToast(error.message || 'Failed to create alert', 'error');
  } finally {
    setSubmitting(false);
  }
};

  // Validate form
  const validateForm = () => {
    if (!title.trim()) {
      showToast('Alert title is required', 'error');
      return false;
    }
    
    if (!selectedMachineId) {
      showToast('Please select a machine', 'error');
      return false;
    }
    
    if (title.length < 3) {
      showToast('Title must be at least 3 characters', 'error');
      return false;
    }
    
    return true;
  };

  // Handle machine selection
 const handleSelectMachine = () => {
  console.log('🎯 DROPDOWN BUTTON CLICKED');
  
  // Create the options array CORRECTLY
  const buttons = machines.map(machine => ({
    text: `${machine.name} (${machine.code})`,
    onPress: () => {
      console.log('Selected machine:', machine._id);
      setSelectedMachineId(machine._id);
    }
  }));
  
  // Add cancel button
  buttons.push({
    text: 'Cancel',
    style: 'cancel',
    onPress: () => console.log('Cancelled')
  });
  
  console.log('📊 Alert buttons prepared:', buttons.length);
  
  // Show Alert with CORRECT syntax
  Alert.alert(
    'Select Machine',  // Title
    'Choose a machine:',  // Message
    buttons,  // Buttons array
    { cancelable: true }  // Options
  );
  
  console.log('✅ Alert.alert() called successfully');
};
  // Get selected machine object
  const getSelectedMachine = () => {
    return machines.find(m => m._id === selectedMachineId);
  };

  // Get selected machine name for display
const getSelectedMachineName = () => {
  // Log all machines first
  console.log('📊 ALL MACHINES IN DATABASE:', machines);
  console.log('📊 Total machines count:', machines.length);
  
  // Log each machine details
  machines.forEach((machine, index) => {
    console.log(`📦 Machine ${index + 1}:`, {
      id: machine._id,
      name: machine.name,
      code: machine.code,
      status: machine.status,
      type: machine.type
    });
  });
  
  // Find and return selected machine name
  const selectedMachine = machines.find(m => m._id === selectedMachineId);
  
  if (selectedMachine) {
    console.log('✅ SELECTED MACHINE:', {
      id: selectedMachine._id,
      name: selectedMachine.name,
      code: selectedMachine.code
    });
    return `${selectedMachine.name} (${selectedMachine.code})`;
  }
  
  console.log('❌ NO MACHINE SELECTED or machine not found');
  console.log('Selected Machine ID:', selectedMachineId);
  console.log('Available IDs:', machines.map(m => m._id));
  
  return 'Select a machine';
};

  // Get machine status color
  const getMachineStatusColor = (status: string) => {
    switch(status) {
      case 'RUN': return '#10B981'; // Green
      case 'IDLE': return '#F59E0B'; // Orange
      case 'OFF': return '#6B7280'; // Gray
      default: return '#6B7280';
    }
  };

  // Get priority color
  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'HIGH': return '#DC2626';
      case 'MEDIUM': return '#F59E0B';
      case 'LOW': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Submit alert using alertApi.create
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    Alert.alert(
      'Create Alert',
      `Are you sure you want to create this alert?\n\n` +
      `Machine: ${getSelectedMachineName()}\n` +
      `Title: ${title}\n` +
      `Priority: ${priority}\n\n` +
      `This will notify all supervisors.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              
              // Prepare data for alertApi.create
              const alertData = {
                machineId: selectedMachineId,
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
              };
              
              console.log('🚀 Creating alert with data:', alertData);
              
              // Call the API
              const response = await alertApi.create(alertData);
              console.log('📦 Alert creation response:', response.data);
              
              if (response.data.success) {
                showToast('Alert created successfully!', 'success');
                
                // Clear form
                setTitle('');
                setDescription('');
                setPriority('MEDIUM');
                
                // Navigate back after success
                setTimeout(() => {
                  if (params.from === 'machine-detail') {
                    router.back(); // Go back to machine details
                  } else {
                    router.push('/(app)/alerts'); // Go to alerts list
                  }
                }, 1500);
              } else {
                throw new Error(response.data.error || 'Failed to create alert');
              }
            } catch (error: any) {
              console.error('❌ Error creating alert:', error);
              
              // Handle specific error cases
              if (error.response?.status === 400) {
                showToast('Invalid data. Please check your inputs.', 'error');
              } else if (error.response?.status === 401) {
                showToast('Please login again', 'error');
                // Optionally redirect to login
              } else if (error.response?.status === 404) {
                showToast('Machine not found', 'error');
              } else {
                showToast(
                  error.response?.data?.error || 
                  error.message || 
                  'Failed to create alert. Please try again.',
                  'error'
                );
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading machines...</Text>
      </View>
    );
  }

  // No machines state
  if (machines.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={64} color="#DC2626" />
        <Text style={styles.errorTitle}>No Machines Available</Text>
        <Text style={styles.errorText}>
          Unable to load machines. Please check your connection or contact support.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadMachines}
        >
          <MaterialIcons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Alert</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Machine Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Machine</Text>
        <TouchableOpacity
  style={styles.dropdownButton}
  onPress={handleSelectMachine}  // ADD THIS
  disabled={machines.length === 0}
>
  <View style={styles.dropdownContent}>
    <MaterialIcons name="precision-manufacturing" size={20} color="#666" />
    <Text style={styles.dropdownText}>{getSelectedMachineName()}</Text>
  </View>
  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
</TouchableOpacity>

          <TouchableOpacity 
  style={styles.debugButton}
  onPress={() => {
    console.log('🔍 DEBUG: Testing getSelectedMachineName');
    getSelectedMachineName();
  }}
>
  <Text>Debug: Log Machines</Text>
</TouchableOpacity>
          
          {/* Machine Status Info */}
          {selectedMachineId && (
            <View style={styles.machineInfo}>
              <View style={styles.machineStatusRow}>
                <Text style={styles.machineInfoLabel}>Status:</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getMachineStatusColor(getSelectedMachine()?.status || 'OFF') }
                ]}>
                  <Text style={styles.statusText}>{getSelectedMachine()?.status}</Text>
                </View>
              </View>
              <Text style={styles.machineInfoText}>
                Type: {getSelectedMachine()?.type}
              </Text>
            </View>
          )}
        </View>

        {/* Priority Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.priorityButtons}>
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  priority === p && { backgroundColor: getPriorityColor(p) }
                ]}
                onPress={() => setPriority(p)}
                disabled={submitting}
              >
                <MaterialIcons 
                  name={
                    p === 'HIGH' ? 'warning' :
                    p === 'MEDIUM' ? 'info' : 'low-priority'
                  } 
                  size={20} 
                  color={priority === p ? '#fff' : getPriorityColor(p)} 
                />
                <Text style={[
                  styles.priorityButtonText,
                  priority === p && styles.priorityButtonTextActive,
                ]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.priorityDescription}>
            <Text style={styles.descriptionText}>
              {priority === 'HIGH' ? '🟥 Critical: Requires immediate attention' :
               priority === 'MEDIUM' ? '🟨 Important: Address within this shift' :
               '🟩 Minor: Monitor and address when possible'}
            </Text>
          </View>
        </View>

        {/* Alert Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Alert Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., High Temperature Warning"
            maxLength={100}
            autoCapitalize="sentences"
            autoCorrect={true}
            editable={!submitting}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Alert Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail...\n• What happened?\n• When did it start?\n• Any safety concerns?"
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
            editable={!submitting}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Preview Section */}
        {title.trim() && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Alert Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <MaterialIcons name="warning" size={20} color={getPriorityColor(priority)} />
                <Text style={styles.previewAlertTitle}>{title}</Text>
              </View>
              {description.trim() && (
                <Text style={styles.previewDescription}>{description}</Text>
              )}
              <View style={styles.previewDetails}>
                <View style={styles.previewDetailItem}>
                  <MaterialIcons name="precision-manufacturing" size={14} color="#666" />
                  <Text style={styles.previewDetailText}>{getSelectedMachineName()}</Text>
                </View>
                <View style={styles.previewDetailItem}>
                  <MaterialIcons name="flag" size={14} color={getPriorityColor(priority)} />
                  <Text style={[styles.previewDetailText, { color: getPriorityColor(priority) }]}>
                    {priority} Priority
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      // After your form, add this warning:
{machines.length === 0 && !loading && (
  <View style={styles.warningContainer}>
    <MaterialIcons name="warning" size={20} color="#F59E0B" />
    <Text style={styles.warningText}>
      No machines found. Please check your connection.
    </Text>
    <TouchableOpacity 
      style={styles.retryButton}
      onPress={loadMachines}
    >
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  </View>
)}

// Add this TEMPORARY button to test Alert
<TouchableOpacity
  style={{
    backgroundColor: 'green',
    padding: 10,
    margin: 10,
    borderRadius: 8,
  }}
  onPress={() => {
    console.log('🧪 Testing simple Alert...');
    Alert.alert('Test', 'Can you see this?', [
      { text: 'YES', onPress: () => console.log('✅ YES clicked') },
      { text: 'NO', onPress: () => console.log('❌ NO clicked') }
    ]);
  }}
>
  <Text style={{ color: 'white', textAlign: 'center' }}>
    Test Simple Alert
  </Text>
</TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            (!title.trim() || !selectedMachineId || submitting) && styles.submitButtonDisabled,
          ]}
         onPress={handleCreateAlert}  
            disabled={submitting || !title.trim() || !selectedMachineId}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitButtonText}>Creating...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="add-alert" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Alert</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Help Info */}
      <View style={styles.helpContainer}>
        <MaterialIcons name="info" size={16} color="#666" />
        <Text style={styles.helpText}>
          This alert will be visible to all supervisors for review and action.
          Please provide accurate information for quick resolution.
        </Text>
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
    backgroundColor: '#f5f5f5',
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  required: {
    color: '#DC2626',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  machineInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  machineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  machineInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  machineInfoText: {
    fontSize: 14,
    color: '#666',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  priorityDescription: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  previewSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    paddingLeft: 28, // Align with icon
  },
  previewDetails: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  previewDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewDetailText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
  backgroundColor: '#8B5CF6',
  padding: 10,
  borderRadius: 8,
  alignItems: 'center',
  marginBottom: 10,
},warningContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFBEB',
  padding: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#FDE68A',
  marginBottom: 16,
},
warningText: {
  color: '#92400E',
  fontSize: 14,
  marginLeft: 8,
  flex: 1,
},
retryButton: {
  backgroundColor: '#F59E0B',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
},
retryText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 12,
},
});
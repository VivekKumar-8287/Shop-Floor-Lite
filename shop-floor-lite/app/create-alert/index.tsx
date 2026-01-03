import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { useToast } from '../../components/ToastProvider';
import { alertApi } from '../../lib/api';
import { RootState } from '../../store';

export default function CreateAlertScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Form state - REMOVED: selectedMachineId
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  
  // Loading state
  const [submitting, setSubmitting] = useState(false);

  // Validate form - REMOVED: machineId validation
  const validateForm = () => {
    if (!title.trim()) {
      showToast('Alert title is required', 'error');
      return false;
    }
    
    if (title.length < 3) {
      showToast('Title must be at least 3 characters', 'error');
      return false;
    }
    
    return true;
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

  // Submit alert
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    Alert.alert(
      'Create Alert',
      `Are you sure you want to create this alert?\n\n` +
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
              
              // Prepare data for alertApi.create - REMOVED: machineId
              const alertData = {
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
                // setTimeout(() => {
                //   router.push('/(tabs)/alerts'); // Go to alerts list
                // }, 1500);
                router.push('/(tabs)/alerts'); 
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
                  <MaterialIcons name="flag" size={14} color={getPriorityColor(priority)} />
                  <Text style={[styles.previewDetailText, { color: getPriorityColor(priority) }]}>
                    {priority} Priority
                  </Text>
                </View>
                <View style={styles.previewDetailItem}>
                  <MaterialIcons name="person" size={14} color="#666" />
                  <Text style={styles.previewDetailText}>
                    Created by: {user?.firstName} {user?.lastName}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

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
            (!title.trim() || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !title.trim()}
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
    paddingLeft: 28,
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
});
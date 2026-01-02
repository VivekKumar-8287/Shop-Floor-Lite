import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,  
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { useToast, useApiErrorHandler } from '../../components/ToastProvider';
import { maintenanceApi } from '../../lib/api';
import { Calendar } from 'react-native-calendars';

interface Machine {
  _id: string;
  name: string;
  code: string;
  type: string;
  status: string;
}

export default function CreateMaintenanceScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { handleApiError } = useApiErrorHandler();
  
  const user = useSelector((state: RootState) => state.auth.user);
  const machines = useSelector((state: RootState) => state.machines.machines);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // Initialize calendar with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setMarkedDates({
      [today]: { selected: true, marked: true, selectedColor: '#007AFF' }
    });
    setSelectedDate(today);
  }, []);
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!selectedMachine) {
      showToast('Please select a machine', 'error');
      return;
    }
    
    if (!title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    
    if (title.length < 3) {
      showToast('Title must be at least 3 characters', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare data
      const maintenanceData = {
        machineId: selectedMachine._id,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      };
      
      console.log('📤 Creating maintenance task:', maintenanceData);
      
      // Call API
      const response = await maintenanceApi.create(maintenanceData);
      
      if (response.data.success) {
        showToast('Maintenance task created successfully', 'success');
        
        // Navigate back after success
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        showToast(response.data.error || 'Failed to create task', 'error');
      }
    } catch (error: any) {
      console.error('❌ Error creating maintenance task:', error);
      handleApiError(error, 'Failed to create maintenance task');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle calendar day press
  const onDayPress = (day: any) => {
    // Check if selected date is not in the past
    const selectedDateObj = new Date(day.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for comparison
    
    if (selectedDateObj < today) {
      showToast('Cannot select past dates', 'error');
      return;
    }
    
    // Update marked dates for calendar
    const newMarkedDates = {
      [day.dateString]: { selected: true, marked: true, selectedColor: '#007AFF' }
    };
    
    setMarkedDates(newMarkedDates);
    setSelectedDate(day.dateString);
    
    // Update due date state
    setDueDate(selectedDateObj);
    
    // Close calendar modal after selection
    setTimeout(() => {
      setShowCalendarModal(false);
    }, 300);
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Get min and max dates for calendar
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1); // One year from now
    return maxDate.toISOString().split('T')[0];
  };
  
  // Clear selected date
  const clearDueDate = () => {
    setDueDate(null);
    setMarkedDates({});
    setSelectedDate('');
  };
  
  // Handle machine selection
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
            <Text style={styles.machineType}>Type: {item.type}</Text>
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
        <Text style={styles.headerTitle}>Create Maintenance</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.formContainer}>
        {/* Machine Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Machine <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.sectionSubtitle}>
            Choose a machine for maintenance
          </Text>
          
          {!selectedMachine ? (
            <FlatList
              data={machines.map(m => ({
                _id: m._id,
                name: m.name,
                code: m.code || 'N/A',
                type: m.type || 'unknown',
                status: m.status || 'IDLE'
              }))}
              renderItem={renderMachineItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.machineList}
            />
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
        
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="title" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter maintenance task title"
              maxLength={100}
              editable={!loading}
            />
          </View>
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>
        
        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="description" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the maintenance task..."
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>
        
        {/* Due Date Selection - Calendar Modal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due Date (Optional)</Text>
          
          {/* Date Selection Button */}
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowCalendarModal(true)}
            disabled={loading}
          >
            <View style={styles.datePickerButtonContent}>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
              <Text style={[
                styles.datePickerText,
                !dueDate && styles.datePickerTextPlaceholder
              ]}>
                {dueDate ? formatDate(dueDate) : 'Select a due date'}
              </Text>
            </View>
            <MaterialIcons 
              name="arrow-drop-down" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {/* Selected Date Display and Clear Button */}
          {dueDate && (
            <View style={styles.selectedDateContainer}>
              <View style={styles.selectedDateInfo}>
                <MaterialIcons name="event-available" size={16} color="#10B981" />
                <Text style={styles.selectedDateText}>
                  Due: {formatDate(dueDate)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={clearDueDate}
                disabled={loading}
              >
                <MaterialIcons name="clear" size={16} color="#DC2626" />
                <Text style={styles.clearDateText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Calendar Modal */}
          <Modal
            visible={showCalendarModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCalendarModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Due Date</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowCalendarModal(false)}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.calendarContainer}>
                  <Calendar
                    current={getMinDate()}
                    minDate={getMinDate()}
                    maxDate={getMaxDate()}
                    onDayPress={onDayPress}
                    markedDates={markedDates}
                    theme={{
                      backgroundColor: '#ffffff',
                      calendarBackground: '#ffffff',
                      textSectionTitleColor: '#666',
                      selectedDayBackgroundColor: '#007AFF',
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: '#007AFF',
                      dayTextColor: '#333',
                      textDisabledColor: '#d9e1e8',
                      monthTextColor: '#333',
                      arrowColor: '#007AFF',
                      textDayFontWeight: '400',
                      textMonthFontWeight: '600',
                      textDayHeaderFontWeight: '600',
                    }}
                    style={styles.calendar}
                  />
                </View>
                
                <View style={styles.calendarInfo}>
                  <View style={styles.infoItem}>
                    <View style={styles.selectedIndicator} />
                    <Text style={styles.infoText}>Selected date</Text>
                  </View>
                  <Text style={styles.infoNote}>
                    Only future dates can be selected. Dates cannot be in the past.
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.modalDoneButton}
                  onPress={() => setShowCalendarModal(false)}
                >
                  <Text style={styles.modalDoneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
        
        {/* Preview Section */}
        {(title.trim() || description.trim()) && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <MaterialIcons name="construction" size={20} color="#007AFF" />
                <Text style={styles.previewTaskTitle}>
                  {title.trim() || 'New Maintenance Task'}
                </Text>
              </View>
              
              {description.trim() && (
                <Text style={styles.previewDescription}>{description}</Text>
              )}
              
              <View style={styles.previewDetails}>
                {selectedMachine && (
                  <View style={styles.previewDetailItem}>
                    <MaterialIcons name="precision-manufacturing" size={14} color="#666" />
                    <Text style={styles.previewDetailText}>{selectedMachine.name}</Text>
                  </View>
                )}
                
                {dueDate && (
                  <View style={styles.previewDetailItem}>
                    <MaterialIcons name="calendar-today" size={14} color="#666" />
                    <Text style={styles.previewDetailText}>Due: {formatDate(dueDate)}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              (!title.trim() || !selectedMachine || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !title.trim() || !selectedMachine}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="add-task" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Create Task</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Help Info */}
        <View style={styles.helpContainer}>
          <MaterialIcons name="info" size={16} color="#666" />
          <Text style={styles.helpText}>
            This maintenance task will be visible to operators for completion.
            Operators will be able to mark it as complete when finished.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  required: {
    color: '#DC2626',
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
    marginBottom: 2,
  },
  machineType: {
    fontSize: 12,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
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
  datePickerButton: {
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
  datePickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  datePickerTextPlaceholder: {
    color: '#9CA3AF',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#0284C7',
    fontWeight: '500',
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearDateText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  calendarContainer: {
    padding: 20,
  },
  calendar: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calendarInfo: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  infoNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalDoneButton: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  previewTaskTitle: {
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
    marginTop: 8,
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
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
});
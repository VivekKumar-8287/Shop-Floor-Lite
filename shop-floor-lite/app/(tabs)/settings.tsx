import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { RootState } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { authApi } from '../../lib/api';
import { storage } from '../../lib/storage';
import { router } from 'expo-router';
import { logout } from '../../store/authSlice';

export default function SettingsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Call logout API
              await authApi.logout();
              
              // Clear storage
              await storage.removeItem('token');
              await storage.removeItem('user');
              
              // Clear Redux state
              dispatch(logout());
              
              // Show success message
              showToast('Logged out successfully', 'success');
              
              // Redirect to login page
              router.replace('/(auth)/login');
              
            } catch (error: any) {
              console.error('Logout error:', error);
              showToast('Logout failed', 'error');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={40} color="#007AFF" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.fullName || user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.userRole}>
            {user?.role === 'operator' ? 'Operator' : 'Supervisor'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          <Text style={styles.userEmployeeId}>
            Employee ID: {user?.employeeId || 'N/A'}
          </Text>
        </View>
      </View>

      {/* User Details */}
      <View style={styles.section}>
        <View style={styles.detailRow}>
          <MaterialIcons name="badge" size={20} color="#666" />
          <Text style={styles.detailLabel}>Employee ID:</Text>
          <Text style={styles.detailValue}>{user?.employeeId || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="business" size={20} color="#666" />
          <Text style={styles.detailLabel}>Tenant ID:</Text>
          <Text style={styles.detailValue}>{user?.tenant_id || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="calendar-today" size={20} color="#666" />
          <Text style={styles.detailLabel}>Member Since:</Text>
          <Text style={styles.detailValue}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="login" size={20} color="#666" />
          <Text style={styles.detailLabel}>Last Login:</Text>
          <Text style={styles.detailValue}>
            {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          icon={<MaterialIcons name="logout" size={20} color="#EF4444" />}
          style={styles.logoutButton}
        />
      </View>

      <Text style={styles.footerText}>Shop Floor Lite © 2024</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userEmployeeId: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  logoutSection: {
    margin: 16,
  },
  logoutButton: {
    borderColor: '#EF4444',
  },
  footerText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 30,
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/authSlice';
import { storage } from '../../lib/storage';
import { authApi } from '../../lib/api';
import { useToast, useApiErrorHandler } from '../../components/ToastProvider';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<'operator' | 'supervisor'>('operator');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const dispatch = useDispatch();
  const { showToast } = useToast();
const { handleApiError } = useApiErrorHandler();


 const handleRegister = async () => {
  console.log('=== REGISTER BUTTON CLICKED ===', Date.now());
  
  // Validation
  if (!email || !password || !confirmPassword || !firstName || !lastName || !employeeId) {
    console.log('Validation failed - missing fields');
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  console.log('All fields filled, proceeding...');

  if (password !== confirmPassword) {
    console.log('Password mismatch');
    showToast('Passwords do not match','error');
    return;
  }

  if (password.length < 6) {
    console.log('Password too short');
   showToast('Password must be at least 6 characters','error');
    return;
  }

  if (!email.includes('@')) {
    console.log('Invalid email');
    showToast('Please enter a valid email address','error');
    return;
  }

  console.log('All validation passed, setting loading...');
  setLoading(true);

  try {
    const registerData = {
      email,
      password,
      firstName,
      lastName,
      role,
      employeeId,
    };
    
    console.log('Making API request...');
    const response = await authApi.register(registerData);
    
    console.log('API response received:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed');
    }

    // Extract user data from response
    // Response format: {success: true, message: "...", data: {...}}
    const backendData = response.data.data || {};
    
    console.log('Backend user data:', backendData);

    // Create user object - handle both possible response structures
    const userData = {
      id: backendData._id || backendData.id || response.data._id || response.data.id || `user-${Date.now()}`,
      email: backendData.email || response.data.email || email,
      firstName: backendData.firstName || response.data.firstName || firstName,
      lastName: backendData.lastName || response.data.lastName || lastName,
      fullName: backendData.fullName || response.data.fullName || `${firstName} ${lastName}`,
      role: backendData.role || response.data.role || role,
      employeeId: backendData.employeeId || response.data.employeeId || employeeId,
      tenant_id: backendData.tenant_id || response.data.tenant_id || 'tenant-001',
      // Token could be in different places
      token: backendData.token || response.data.token || response.data.accessToken,
    };

    console.log('Processed user data:', userData);

    // Final check for token
    if (!userData.token) {
      console.warn('Token not found in expected locations, checking whole response:', response.data);
      // Try to find token anywhere in response
      const responseString = JSON.stringify(response.data);
      const tokenMatch = responseString.match(/"token":"([^"]+)"/);
      if (tokenMatch) {
        userData.token = tokenMatch[1];
      }
    }

    if (!userData.token) {
      throw new Error('No authentication token received. Please contact support.');
    }

    // Save to storage
    await storage.setItem('token', userData.token);
    await storage.setItem('user', JSON.stringify(userData));

    // Verify storage
    const saved = await storage.getItem('user');
    console.log('User saved to storage:', saved ? 'Yes' : 'No');

    // Update Redux state
    dispatch(setUser(userData));

    // Show success and redirect
    Alert.alert(
      '🎉 Registration Successful', 
      response.data.message || 'Your account has been created!',
      [
        { 
          text: 'Go to Dashboard', 
          onPress: () => {
            console.log('Manual navigation to app...');
            router.replace('/(tabs)');
          }
        }
      ]
    );

    // Auto-navigate after 2 seconds
    setTimeout(() => {
      console.log('Auto-navigating to app...');
      router.replace('/(tabs)/dashboard');
    }, 2000);
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.response?.data?.error === 'User already exists') {
      Alert.alert(
        'Registration Failed', 
        'This email is already registered. Please login instead.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Login', onPress: () => router.push('/(auth)/login') }
        ]
      );
    } else {
      Alert.alert(
        'Registration Failed', 
        error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create account'
      );
    }
  } finally {
    setLoading(false);
  }
};

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Shop Floor Lite</Text>

          <View style={styles.nameRow}>
            <View style={styles.nameInput}>
              <Input
                label="First Name"
                placeholder="Enter first name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
              />
            </View>
            <View style={styles.nameInput}>
              <Input
                label="Last Name"
                placeholder="Enter last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </View>
          </View>

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Input
            label="Employee ID"
            placeholder="Enter employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle={true}
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            showPasswordToggle={true}
            autoComplete="new-password"
          />

          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Select Your Role:</Text>
            <View style={styles.roleButtons}>
              <Button
                title="Operator"
                variant={role === 'operator' ? 'primary' : 'outline'}
                onPress={() => setRole('operator')}
                style={styles.roleButton}
              />
              <Button
                title="Supervisor"
                variant={role === 'supervisor' ? 'primary' : 'outline'}
                onPress={() => setRole('supervisor')}
                style={styles.roleButton}
              />
            </View>
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          {/* Add a test button */}
          {/* <Button
            title="Test Direct Fetch"
            onPress={async () => {
              try {
                console.log('Testing direct fetch...');
                const response = await fetch('http://localhost:5000/api/auth/register', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email: 'testdirect@example.com',
                    password: 'test123',
                    firstName: 'Direct',
                    lastName: 'Test',
                    role: 'operator',
                    employeeId: 'DIR001'
                  }),
                });
                const data = await response.json();
                console.log('Direct fetch response:', data);
                Alert.alert('Direct Fetch', JSON.stringify(data));
              } catch (error) {
                console.error('Direct fetch error:', error);
                Alert.alert('Direct Fetch Error', String(error));
              }
            }}
            variant="outline"
            style={{ marginBottom: 10 }}
          /> */}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Button
              title="Login"
              variant="outline"
              onPress={handleLogin}
            />
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By registering, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  roleContainer: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
  },
  registerButton: {
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#666',
  },
  termsContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});
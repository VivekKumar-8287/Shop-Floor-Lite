import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { setUser } from '../../store/authSlice';
import { storage } from '../../lib/storage';
import { authApi } from '../../lib/api';
import { useToast } from '../../components/ToastProvider';
import { setRole } from '../../store/authSlice';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'operator' | 'supervisor'>('operator');
  
  const router = useRouter();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  useEffect(() => {
    debugStorage();
  }, []);

  const handleLogin = async () => {
  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  setLoading(true);
  try {
    console.log('Login attempt:', { email, password, role });

    // Make API call to backend
    const response = await authApi.login(email, password, role);
    
    console.log('Login response:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message || 'Login failed');
    }

    const backendData = response.data.data || response.data.user || {};
    
    // Create user object from backend response
    const userData = {
      id: backendData._id || backendData.id || `user-${Date.now()}`,
      email: backendData.email || email,
      role: backendData.role || role,
      tenant_id: backendData.tenant_id || 'tenant-001',
      token: backendData.token || response.data.token,
    };
    
    console.log('Processed user data:', userData);
    
    // Validate we have a token
    if (!userData.token) {
      throw new Error('No authentication token received');
    }

    // Save to storage
    await storage.setItem('token', userData.token);
    await storage.setItem('user', JSON.stringify(userData));
    
    // Update Redux state
    dispatch(setUser(userData));

    // Show success message
    showToast('Login successful!', 'success');

    // ✅ FIXED: Navigate to tabs instead of /(app)
    router.replace('/(tabs)');
    
  } catch (error: any) {
    // ... (keep your error handling code as is)
  } finally {
    setLoading(false);
  }
};

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  const debugStorage = async () => {
    const user = await storage.getItem('user');
    const token = await storage.getItem('token');
    
    console.log('=== STORAGE DEBUG ===');
    console.log('User from storage:', user);
    console.log('Token from storage:', token);
    
    if (user) {
      try {
        const parsed = JSON.parse(user);
        console.log('Parsed user:', parsed);
      } catch (e) {
        console.log('Parse error:', e);
      }
    }
  };

  return (
    <KeyboardAvoidingView
    
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Shop Floor Lite</Text>
          <Text style={styles.subtitle}>Login to continue</Text>

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
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle={true}
            autoComplete="current-password"
          />

          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Select Role:</Text>
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
            title="Login"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          {/* Debug button - optional */}
          <Button
            title="Debug Storage"
            onPress={debugStorage}
            variant="outline"
            style={{ marginBottom: 10 }}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Button
              title="Register"
              variant="outline"
              onPress={handleRegister}
            />
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
  loginButton: {
    marginBottom: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    color: '#666',
  },
});
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setUser, logout } from '../store/authSlice';
import { storage } from '../lib/storage';
import { authApi } from '../lib/api'; // Import your API
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

export const useAuth = () => {
   const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
  try {
    const userStr = await storage.getItem('user');
    const token = await storage.getItem('token');
    
    console.log('Auth check - Platform:', Platform.OS);
    console.log('Auth check - User from storage:', userStr ? 'Exists' : 'Null');
    console.log('Auth check - Token from storage:', token ? 'Exists' : 'Null');
    
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        console.log('Auth check - Parsed user:', user);
        
        // Update Redux state
        dispatch(setUser(user));
      } catch (parseError) {
        console.error('Failed to parse user JSON:', parseError);
        // Clear invalid data
        await storage.removeItem('user');
        await storage.removeItem('token');
      }
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    // Don't crash the app - just continue
  } finally {
    setIsLoading(false);
  }
};

  // REMOVE this mock login function - use real API in your login screen
  // const login = async (email: string, role: 'operator' | 'supervisor') => {
  //   setIsLoading(true);
  //   try {
  //     const mockUser = {
  //       id: `user-${Date.now()}`,
  //       email,
  //       role,
  //       tenant_id: 'tenant-001',
  //       token: `mock-jwt-${Date.now()}`
  //     };

  //     await storage.setItem('user', JSON.stringify(mockUser));
  //     await storage.setItem('token', mockUser.token);
      
  //     dispatch(setUser(mockUser));
  //     return mockUser;
  //   } catch (error) {
  //     throw error;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const signOut = async () => {
  try {
    // Call backend logout endpoint
    try {
      await authApi.logout();
      console.log('Backend logout successful');
    } catch (backendError) {
      console.log('Backend logout failed, continuing with client-side logout:', backendError);
      // Continue with client-side logout even if backend fails
    }
    
    // Clear local storage
    await storage.removeItem('user');
    await storage.removeItem('token');
    
    // Update Redux state
    dispatch(logout());
    
    console.log('Client-side logout completed');
    router.replace('/(auth)/login');
    
  } catch (error) {
    console.error('Logout error:', error);
  }
};

  return {
    user,
    isAuthenticated,
    isLoading,
    // login, // Remove this - login is handled in login screen
    signOut,
  };
};
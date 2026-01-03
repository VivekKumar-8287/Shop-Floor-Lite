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
    console.log('🔐 Starting auth check...');
    
    const userStr = await storage.getItem('user');
    const token = await storage.getItem('token');
    
    console.log('📦 Storage check - User:', userStr ? 'Exists' : 'Null');
    console.log('📦 Storage check - Token:', token ? 'Exists' : 'Null');
    
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        console.log('✅ Parsed user:', user.email, user.role);
        
        // Update Redux state
        dispatch(setUser(user));
      } catch (parseError) {
        console.error('❌ Failed to parse user JSON:', parseError);
        // Clear invalid data
        await storage.removeItem('user');
        await storage.removeItem('token');
      }
    } else {
      console.log('⚠️ No user/token found, user is not authenticated');
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
  } finally {
    console.log('🏁 Auth check completed, setting isLoading false');
    setIsLoading(false);
  }
};

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
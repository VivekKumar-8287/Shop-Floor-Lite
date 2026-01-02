import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      console.log(`📦 Storage GET "${key}" on ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        // Web: use localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      } else {
        // Mobile: use SecureStore
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Storage get error for "${key}":`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      console.log(`📦 Storage SET "${key}" on ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        // Web
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, value);
        }
      } else {
        // Mobile
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Storage set error for "${key}":`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      console.log(`📦 Storage REMOVE "${key}" on ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(key);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Storage remove error for "${key}":`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      console.log(`📦 Storage CLEAR on ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.clear();
        }
      } else {
        // SecureStore doesn't have clear(), so remove each item
        // You'll need to know your keys or use a different approach
        console.log('Note: SecureStore.clear() not available on mobile');
      }
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};
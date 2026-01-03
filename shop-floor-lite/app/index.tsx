import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  
  console.log('🏠 Index Screen - Auth Status:', { 
    isAuthenticated, 
    isLoading,
    timestamp: new Date().toISOString() 
  });
  
  // Handle loading state properly
  if (isLoading) {
    console.log('⏳ Showing loading screen...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666' }}>Checking authentication...</Text>
      </View>
    );
  }
  
  console.log('➡️ Redirecting based on auth:', isAuthenticated);
  
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
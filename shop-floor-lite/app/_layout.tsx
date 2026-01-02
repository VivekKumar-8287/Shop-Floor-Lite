import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { useAuth } from '../hooks/useAuth';
import { ActivityIndicator, Text, View } from 'react-native';
import { ToastProvider } from '../hooks/useToast';

import { WebToastContainer } from '../components/WebToastContainer';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();

   console.log('RootLayoutNav - Auth state:', { isLoading, isAuthenticated });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
         <Text>Loading authentication...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="(app)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StatusBar style="auto" />
        <RootLayoutNav />
           <WebToastContainer />
      </ToastProvider>
      </QueryClientProvider>
    </Provider>
  );
}
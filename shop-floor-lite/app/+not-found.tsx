import { Stack, Redirect } from 'expo-router';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useEffect, useState } from 'react';

export default function NotFoundScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);
  
  useEffect(() => {
    // Small delay to ensure Redux state is loaded
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking auth status
  if (isChecking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Auto-redirect based on login status
  if (user) {
    // User is logged in, redirect to dashboard
    return <Redirect href="/(tabs)/dashboard" />;
  } else {
    // User is not logged in, redirect to login
    return <Redirect href="/(auth)/login" />;
  }

  // This won't be reached due to redirects above, but keeping for safety
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Text style={styles.redirectText}>
          Redirecting you to {user ? 'dashboard' : 'login'}...
        </Text>
        <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  redirectText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
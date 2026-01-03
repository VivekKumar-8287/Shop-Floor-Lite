import { Tabs, Redirect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useEffect } from 'react';

export default function TabLayout() {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role;

  // If no user role, redirect to login
  if (!userRole) {
    return <Redirect href="/(auth)/login" />;
  }

  // Operator tabs
  if (userRole === 'operator') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="downtime"
          options={{
            title: 'Downtime',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="timer-off" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="maintenance"
          options={{
            title: 'Maintenance',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="checklist" size={size} color={color} />
            ),
          }}
        />
        {/* Hide supervisor and unused tabs */}
        <Tabs.Screen name="alerts" options={{ href: null }} />
        <Tabs.Screen name="kpi" options={{ href: null }} />
        <Tabs.Screen name="index" options={{ href: null }} />
      </Tabs>
    );
  }

  // Supervisor tabs
  if (userRole === 'supervisor') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="kpi"
          options={{
            title: 'KPI Reports',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="analytics" size={size} color={color} />
            ),
          }}
        />
        {/* Hide operator tabs */}
        <Tabs.Screen name="downtime" options={{ href: null }} />
        <Tabs.Screen name="maintenance" options={{ href: null }} />
        <Tabs.Screen name="index" options={{ href: null }} />
      </Tabs>
    );
  }

  // Fallback redirect
  return <Redirect href="/(auth)/login" />;
}
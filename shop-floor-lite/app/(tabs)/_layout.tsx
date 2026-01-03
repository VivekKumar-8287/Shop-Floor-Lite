import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function TabLayout() {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role; // Get role from Redux user

  // If no role, don't show tabs (should redirect to login)
  if (!userRole) {
    return null;
  }

  if (userRole === 'operator') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        {/* Operator Tabs */}
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
        {/* Hide supervisor tabs */}
        <Tabs.Screen name="alerts" options={{ href: null }} />
      </Tabs>
    );
  }

  if (userRole === 'supervisor') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        {/* Supervisor Tabs */}
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
        {/* Hide operator tabs */}
        <Tabs.Screen name="downtime" options={{ href: null }} />
        <Tabs.Screen name="maintenance" options={{ href: null }} />
      </Tabs>
    );
  }

  return null;
} 
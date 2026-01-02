import { Tabs, Redirect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import OfflineIndicator from '../../components/OfflineIndicator';

export default function AppLayout() {
  const user = useSelector((state: RootState) => state.auth.user);
  
  if (!user) {
    return null;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {/* Common Dashboard for both roles */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="dashboard" size={size} color={color} />
            ),
          }}
        />
        
        {/* Operator Tab - ONLY shows for operators */}
        <Tabs.Screen
          name="operator"
          options={{
            title: 'Operator',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="build" size={size} color={color} />
            ),
            headerShown: false,
            // Hide tab if not operator
             href: user.role === 'operator' ? undefined : null,
          }}
        />
        
        {/* Supervisor Tab - ONLY shows for supervisors */}
        <Tabs.Screen
          name="supervisor"
          options={{
            title: 'Supervisor',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="supervisor-account" size={size} color={color} />
            ),
            headerShown: false,
            // Hide tab if not supervisor
            href: user.role === 'supervisor' ? undefined : null,
          }}
        />
        
        {/* Add a redirect for direct access attempts */}
        <Tabs.Screen
          name="+not-found"
          options={{
            href: null,
          }}
        />
      </Tabs>
      {/* <OfflineIndicator /> */}
    </>
  );
}
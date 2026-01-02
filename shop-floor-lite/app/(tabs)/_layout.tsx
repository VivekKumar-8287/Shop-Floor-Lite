import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

export default function TabLayout() {
  const { userRole } = useSelector((state: any) => state.auth);

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
      
      {userRole === 'operator' && (
        <>
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
            name="checklist"
            options={{
              title: 'Checklist',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="checklist" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
      
      {userRole === 'supervisor' && (
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="notifications" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}
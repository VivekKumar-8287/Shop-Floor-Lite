import { Stack } from 'expo-router';

export default function SupervisorLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Supervisor Dashboard',
        }}
      />
      <Stack.Screen
        name="alerts"
        options={{
          title: 'Alerts Management',
        }}
      />
    </Stack>
  );
}
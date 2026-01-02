import { Stack } from 'expo-router';

export default function OperatorLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Operator Dashboard',
        }}
      />
      <Stack.Screen
        name="machine-detail"
        options={{
          title: 'Machine Details',
        }}
      />
      <Stack.Screen
        name="downtime"
        options={{
          title: 'Record Downtime',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="checklist"
        options={{
          title: 'Maintenance Checklist',
        }}
      />
    </Stack>
  );
}
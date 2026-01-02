import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";

export default function TabLayout() {
  const { userRole } = useSelector((state: any) => state.auth);

  if (userRole === "operator") {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        {/* Operator Tabs */}
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="downtime"
          options={{
            title: "Downtime",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="timer-off" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="maintenance"
          options={{
            title: "Maintenance",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="checklist" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
        {/* Hide supervisor tabs */}
        <Tabs.Screen name="alerts" options={{ href: null }} />
        <Tabs.Screen name="kpi" options={{ href: null }} />
      </Tabs>
    );
  }

  if (userRole === "supervisor") {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        {/* Supervisor Tabs */}
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: "Alerts",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="kpi"
          options={{
            title: "KPI Reports",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="analytics" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
        {/* Hide operator tabs */}
        <Tabs.Screen name="downtime" options={{ href: null }} />
        <Tabs.Screen name="maintenance" options={{ href: null }} />
      </Tabs>
    );
  }

  return null; // or loading screen
}

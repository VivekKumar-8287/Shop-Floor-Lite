import { Stack } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import { useEffect } from "react";

import { store, RootState } from "../store";
import { ToastProvider } from "../components/ToastProvider";
import { storage } from "../lib/storage";
import { setUser, setAuthChecked } from "../store/authSlice";
import { setOnline } from "../store/syncSlice";
import { syncOfflineData } from "../lib/sync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDowntimeEntries } from '../store/downtimeSlice';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: {
      onError: (error: any) => {
        console.error("Mutation Error:", error);
      },
    },
  },
});

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { isAuthenticated, isAuthChecked  } = useSelector(
    (state: RootState) => state.auth
  );

  // 🔐 Restore auth ONCE
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await storage.getItem("user");
        if (storedUser) {
          dispatch(setUser(JSON.parse(storedUser)));
        }
        const storedDowntime = await AsyncStorage.getItem('downtime_entries');
if (storedDowntime) {
  dispatch(setDowntimeEntries(JSON.parse(storedDowntime)));
}
      } catch (e) {
        console.error("Failed to restore user", e);
      } finally {
        dispatch(setAuthChecked(true));
      }
    };

    initAuth();
  }, []);

  // Network sync
  useEffect(() => {
    if (!isAuthChecked  || !isAuthenticated) return;

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected;
      dispatch(setOnline(online));

      if (online) {
        try {
          await syncOfflineData();
          console.log("✅ Offline queue synced");
        } catch (e) {
          console.error("❌ Sync failed", e);
        }
      }
    });

    return () => unsubscribe();
  }, [isAuthChecked , isAuthenticated]);

  if (!isAuthChecked ) return null; 

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <AppInitializer>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />

                <Stack.Screen
                  name="machine-detail/[id]"
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen
                  name="create-maintenance/index"
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen
                  name="create-alert/index"
                  options={{ presentation: "modal" }}
                />
              </Stack>
            </AppInitializer>
          </QueryClientProvider>
        </ToastProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

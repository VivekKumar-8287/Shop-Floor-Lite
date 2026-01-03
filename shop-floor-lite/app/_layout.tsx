import { Stack } from "expo-router";
import { Provider, useDispatch } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { store } from "../store";
import { ToastProvider } from "../components/ToastProvider";
import { useEffect } from "react";
import { storage } from "../lib/storage";
import { setUser, setAuthChecked } from "../store/authSlice";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      
    },
    mutations: {
      onError: (error: any) => {
        console.error("Mutation Error:", error);
      },
    },
  },
});

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await storage.getItem("user");
        if (storedUser) {
          dispatch(setUser(JSON.parse(storedUser)));
        }
      } catch (e) {
        console.error("Failed to load user from storage", e);
      } finally {
        dispatch(setAuthChecked(true));
      }
    };

    initAuth();
  }, []);

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

                {/* Modals */}
                <Stack.Screen
                  name="machine-detail/[id]"
                  options={{ presentation: "modal", title: "Machine Details" }}
                />
                <Stack.Screen
                  name="create-maintenance/index"
                  options={{ presentation: "modal", title: "Create Maintenance" }}
                />
                <Stack.Screen
                  name="create-alert/index"
                  options={{ presentation: "modal", title: "Create Alert" }}
                />
              </Stack>
            </AppInitializer>
          </QueryClientProvider>
        </ToastProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

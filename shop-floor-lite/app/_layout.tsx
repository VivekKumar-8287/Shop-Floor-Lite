import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { store } from "../store";
import { ToastProvider } from "../components/ToastProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      onError: (error: any) => {
        console.error("Query Error:", error);
      },
    },
    mutations: {
      onError: (error: any) => {
        console.error("Mutation Error:", error);
      },
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />

              {/* Modals */}
              <Stack.Screen
                name="machine-detail/[id]"
                options={{
                  presentation: "modal",
                  title: "Machine Details",
                }}
              />
              <Stack.Screen
                name="start-downtime"
                options={{
                  presentation: "modal",
                  title: "Start Downtime",
                }}
              />
              <Stack.Screen
                name="create-alert"
                options={{
                  presentation: "modal",
                  title: "Create Alert",
                }}
              />
            </Stack>
          </ToastProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

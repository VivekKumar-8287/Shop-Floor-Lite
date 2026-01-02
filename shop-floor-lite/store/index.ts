import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import machineReducer from './machineSlice';
import downtimeReducer from './downtimeSlice';
import alertReducer from './alertSlice';
import syncReducer from './syncSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    machines: machineReducer,
    downtime: downtimeReducer,
    alerts: alertReducer,
    sync: syncReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
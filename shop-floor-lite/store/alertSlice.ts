import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Alert } from '../types';

interface AlertState {
  alerts: Alert[];
  loading: boolean;
}

const initialState: AlertState = {
  alerts: [],
  loading: false,
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.unshift(action.payload);
    },
    acknowledgeAlert: (state, action: PayloadAction<{id: string, email: string}>) => {
      const alert = state.alerts.find(a => a.id === action.payload.id);
      if (alert) {
        alert.status = 'Acknowledged';
        alert.acknowledgedBy = action.payload.email;
        alert.acknowledgedAt = new Date().toISOString();
      }
    },
    clearAlert: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.status = 'Cleared';
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setAlerts, addAlert, acknowledgeAlert, clearAlert, setLoading } = alertSlice.actions;
export default alertSlice.reducer;
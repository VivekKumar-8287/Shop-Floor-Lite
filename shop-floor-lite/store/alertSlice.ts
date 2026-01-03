// features/alerts/alertSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  alerts: [],
  selectedAlert: null,
  loading: false,
  error: null,
  filterStatus: null,
  filterPriority: null
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts: (state, action) => {
      state.alerts = action.payload;
    },
    setSelectedAlert: (state, action) => {
      state.selectedAlert = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    updateAlertStatus: (state, action) => {
      const { alertId, status, acknowledgedBy, clearedBy, clearedAt } = action.payload;
      const alert = state.alerts.find(a => a._id === alertId);
      if (alert) {
        alert.status = status;
        if (acknowledgedBy) {
          alert.acknowledgedBy = acknowledgedBy;
        }
        if (clearedBy) {
          alert.clearedBy = clearedBy;
          alert.clearedAt = clearedAt;
        }
      }
    },
    addAlert: (state, action) => {
      state.alerts.unshift(action.payload);
    },
    setFilterStatus: (state, action) => {
      state.filterStatus = action.payload;
    },
    setFilterPriority: (state, action) => {
      state.filterPriority = action.payload;
    }
  }
});

export const {
  setAlerts,
  setSelectedAlert,
  setLoading,
  setError,
  updateAlertStatus,
  addAlert,
  setFilterStatus,
  setFilterPriority
} = alertSlice.actions;

export default alertSlice.reducer;
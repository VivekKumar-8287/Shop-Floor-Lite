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
    // UPDATED: Now tracks user object instead of just email
    acknowledgeAlert: (state, action: PayloadAction<{
      id: string; 
      user: { _id: string; firstName: string; lastName: string; email: string; role: string }
    }>) => {
      const alert = state.alerts.find(a => a._id === action.payload.id || a.id === action.payload.id);
      if (alert) {
        // Add user to acknowledgedBy array
        const acknowledgedByArray = Array.isArray(alert.acknowledgedBy) ? alert.acknowledgedBy : [];
        
        // Check if user already acknowledged
        const alreadyAcknowledged = acknowledgedByArray.some((user: any) => 
          (typeof user === 'object' && user._id === action.payload.user._id) ||
          user === action.payload.user._id
        );
        
        if (!alreadyAcknowledged) {
          // Add user to array
          alert.acknowledgedBy = [...acknowledgedByArray, action.payload.user];
          
          // Update status if first acknowledgment
          if (alert.status === 'CREATED') {
            alert.status = 'ACKNOWLEDGED';
            alert.acknowledgedAt = new Date().toISOString();
          }
        }
      }
    },
    // UPDATED: Clear alert with supervisor info
    clearAlert: (state, action: PayloadAction<{
      id: string;
      user: { _id: string; firstName: string; lastName: string; email: string; role: string }
    }>) => {
      const alert = state.alerts.find(a => a._id === action.payload.id || a.id === action.payload.id);
      if (alert) {
        alert.status = 'CLEARED';
        alert.clearedBy = action.payload.user;
        alert.clearedAt = new Date().toISOString();
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setAlerts, addAlert, acknowledgeAlert, clearAlert, setLoading } = alertSlice.actions;
export default alertSlice.reducer;
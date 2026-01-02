import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DowntimeEntry } from '../types';

interface DowntimeState {
  entries: DowntimeEntry[];
  loading: boolean;
}

const initialState: DowntimeState = {
  entries: [],
  loading: false,
};

const downtimeSlice = createSlice({
  name: 'downtime',
  initialState,
  reducers: {
    setDowntimeEntries: (state, action: PayloadAction<DowntimeEntry[]>) => {
      state.entries = action.payload;
    },
    addDowntimeEntry: (state, action: PayloadAction<DowntimeEntry>) => {
      state.entries.push(action.payload);
    },
    endDowntime: (state, action: PayloadAction<{id: string, endTime: string}>) => {
      const entry = state.entries.find(e => e._id === action.payload.id);
      if (entry) {
        entry.endTime = action.payload.endTime;
      }
    },
    setEntrySynced: (state, action: PayloadAction<string>) => {
      const entry = state.entries.find(e => e._id === action.payload);
      if (entry) {
        entry.synced = true;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setDowntimeEntries, addDowntimeEntry, endDowntime, setEntrySynced, setLoading } = downtimeSlice.actions;
export default downtimeSlice.reducer;
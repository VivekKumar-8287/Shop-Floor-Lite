import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncState {
  isOnline: boolean;
  pendingItems: number;
  lastSync: string | null;
  syncing: boolean;
}

const initialState: SyncState = {
  isOnline: true,
  pendingItems: 0,
  lastSync: null,
  syncing: false,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setPendingItems: (state, action: PayloadAction<number>) => {
      state.pendingItems = action.payload;
    },
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.syncing = action.payload;
    },
    incrementPending: (state) => {
      state.pendingItems += 1;
    },
    decrementPending: (state) => {
      state.pendingItems = Math.max(0, state.pendingItems - 1);
    },
  },
});

export const { setOnline, setPendingItems, setLastSync, setSyncing, incrementPending, decrementPending } = syncSlice.actions;
export default syncSlice.reducer;
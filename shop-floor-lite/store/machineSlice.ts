import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Machine } from '../types';

interface MachineState {
  machines: Machine[];
  selectedMachine: Machine | null;
  loading: boolean;
}

const initialState: MachineState = {
  machines: [],
  selectedMachine: null,
  loading: false,
};

const machineSlice = createSlice({
  name: 'machines',
  initialState,
  reducers: {
    setMachines: (state, action: PayloadAction<Machine[]>) => {
      state.machines = action.payload;
    },
    selectMachine: (state, action: PayloadAction<Machine>) => {
      state.selectedMachine = action.payload;
    },
    updateMachineStatus: (state, action: PayloadAction<{id: string, status: string}>) => {
      const machine = state.machines.find(m => m.id === action.payload.id);
      if (machine) {
        machine.status = action.payload.status as any;
      }
      if (state.selectedMachine?.id === action.payload.id) {
        state.selectedMachine.status = action.payload.status as any;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setMachines, selectMachine, updateMachineStatus, setLoading } = machineSlice.actions;
export default machineSlice.reducer;
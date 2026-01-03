import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../types';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  userRole: null,
  error: null,
  isAuthChecked: false,
};


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      state.isAuthChecked = true; // mark auth as checked
    },
    setRole: (state, action: PayloadAction<'operator' | 'supervisor'>) => {
      state.userRole = action.payload;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      state.isAuthChecked = true; // mark auth as checked
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.userRole = null;
      state.error = null;
      state.isAuthChecked = true; // prevent immediate redirect loop
    },
    setAuthChecked: (state, action: PayloadAction<boolean>) => {
  state.isAuthChecked = action.payload;
},
  },
});

export const { login, setRole, setUser, setLoading, setError, logout, setAuthChecked } = authSlice.actions;
export default authSlice.reducer;
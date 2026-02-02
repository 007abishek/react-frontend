import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  uid: string;
  email: string | null;
  provider: "google" | "github" | "password" | "guest";
  isGuest: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true, // app checking auth on startup
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },

    authResolved: (state) => {
      // auth check finished but no user
      state.loading = false;
    },
  },
});

export const { loginSuccess, logout, authResolved } =
  authSlice.actions;

export default authSlice.reducer;

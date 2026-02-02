import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/* ---------------- USER MODEL ---------------- */

export type AuthProvider =
  | "password"
  | "google"
  | "github"
  | "guest";

export interface AuthUser {
  uid: string;
  email: string | null;
  provider: AuthProvider;
  isGuest: boolean;
}

/* ---------------- STATE ---------------- */

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean; // app checking auth on startup
}

/* ---------------- INITIAL STATE ---------------- */

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true, // 🔑 important: wait for authListener
};

/* ---------------- SLICE ---------------- */

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /* ✅ Called after successful VERIFIED login */
    loginSuccess: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    },

    /* 🚪 User logged out or auth invalid */
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },

    /* 🔍 Auth check finished, no user */
    authResolved: (state) => {
      state.loading = false;
    },

    /* 🔄 Reset auth state (optional but useful) */
    resetAuth: () => initialState,
  },
});

/* ---------------- EXPORTS ---------------- */

export const {
  loginSuccess,
  logout,
  authResolved,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;

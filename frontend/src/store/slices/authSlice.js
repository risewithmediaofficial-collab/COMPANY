import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      localStorage.setItem('accessToken', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Login failed' });
    }
  }
);

// fetchMe uses raw axios to avoid circular import with api/index.js
// The api instance imports from store which imports authSlice → circular.
// Raw axios is safe here: on first load the token is fresh enough.
export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!token || !refreshToken) {
        return rejectWithValue({ isAuthError: true, message: 'No active session' });
      }

      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      // If 401 — try refreshing once before giving up
      if (error.response?.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          return rejectWithValue({ isAuthError: true, message: 'Session expired. Please log in again.' });
        }

        try {
          const refreshRes = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', refreshRes.data.accessToken);
          if (refreshRes.data.refreshToken) {
            localStorage.setItem('refreshToken', refreshRes.data.refreshToken);
          }

          // Retry /me with new token
          const retryRes = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${refreshRes.data.accessToken}` },
          });
          return retryRes.data;
        } catch (_refreshError) {
          // Refresh failed — session is truly expired
          return rejectWithValue({ isAuthError: true, message: 'Session expired. Please log in again.' });
        }
      }
      return rejectWithValue({ isAuthError: false, message: error.response?.data?.message || 'Server connection issue' });
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken') || null,
    activeWorkspace: localStorage.getItem('activeWorkspace') || null,
    loading: false,
    error: null,
    isAuthenticated: Boolean(localStorage.getItem('accessToken') && localStorage.getItem('refreshToken')),
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.activeWorkspace = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('activeWorkspace');
    },
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
    },
    updateCurrentUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setActiveWorkspace: (state, action) => {
      state.activeWorkspace = action.payload;
      if (action.payload) {
        localStorage.setItem('activeWorkspace', action.payload);
      } else {
        localStorage.removeItem('activeWorkspace');
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login ──
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Login failed';
      })
      // ── Fetch Me ──
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        if (action.payload?.isAuthError) {
          state.user = null;
          state.accessToken = null;
          state.isAuthenticated = false;
          state.error = action.payload?.message || 'Session expired';
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        } else {
          state.error = action.payload?.message || 'Temporary connection issue';
        }
      });
  },
});

export const { logout, setAuth, updateCurrentUser, setActiveWorkspace, clearError } = authSlice.actions;
export default authSlice.reducer;


import { createSlice } from '@reduxjs/toolkit';

// Apply persisted theme class immediately on load (before any renders)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: savedTheme === 'dark',
    sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
    activeModule: 'dashboard',
  },
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem('theme', state.darkMode ? 'dark' : 'light');
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setActiveModule: (state, action) => {
      state.activeModule = action.payload;
    },
  },
});

export const { toggleDarkMode, toggleSidebar, setSidebarOpen, setActiveModule } = uiSlice.actions;
export default uiSlice.reducer;


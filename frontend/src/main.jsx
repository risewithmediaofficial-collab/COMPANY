import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { store } from './store'
import { queryClient } from './queryClient'
import App from './App.jsx'
import './index.css'
import { SocketProvider } from './context/SocketContext'
import { DateFilterProvider } from './context/DateFilterContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <DateFilterProvider>
            <App />
          </DateFilterProvider>
        </SocketProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
)

// Prevent mouse wheel / touchpad scrolling from increasing or decreasing number inputs
document.addEventListener(
  'wheel',
  () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  },
  { passive: true }
);

// Register Service Worker for Browser Push Notifications & PWA Updates
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('Service worker registration bypassed:', err.message);
      });
  });
}

// Automatically reload window when a new production build invalidates stale dynamic chunks
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const storageKey = 'vite_chunk_reload_ts';
  const lastReload = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
  const now = Date.now();
  if (now - lastReload > 10000) {
    sessionStorage.setItem(storageKey, String(now));
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Expected a JavaScript-or-Wasm module script')
  ) {
    const storageKey = 'vite_chunk_reload_ts';
    const lastReload = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
    const now = Date.now();
    if (now - lastReload > 10000) {
      sessionStorage.setItem(storageKey, String(now));
      window.location.reload();
    }
  }
});


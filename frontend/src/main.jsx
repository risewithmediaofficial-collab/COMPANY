import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { store } from './store'
import App from './App.jsx'
import './index.css'
import { SocketProvider } from './context/SocketContext'
import { DateFilterProvider } from './context/DateFilterContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 2000,
      refetchInterval: 8000, // Automatic background polling safety net (8s) across all pages
      refetchIntervalInBackground: false,
    },
  },
})

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


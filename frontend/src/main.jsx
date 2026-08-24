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
      staleTime: 5000,
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

// Register Service Worker for Browser Push Notifications
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration bypassed:', err.message);
    });
  });
}

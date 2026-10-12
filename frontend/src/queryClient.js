import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 30 * 1000, // 30 seconds default domain stale time
      refetchInterval: false, // Eliminate unneeded continuous background polling
      refetchIntervalInBackground: false,
    },
  },
});

export const purgeQueryCache = () => {
  try {
    queryClient.clear();
  } catch (err) {
    console.error('Failed to purge query cache:', err);
  }
};

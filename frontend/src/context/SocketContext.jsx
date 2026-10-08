import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { sendBrowserNotification } from '../utils/browserNotification';
import { logout } from '../store/slices/authSlice';
import { toast } from 'sonner';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Connect to the same origin — Vite proxies /socket.io → :5000 in dev
    const newSocket = io(window.location.origin, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    // Auto-register user room on connect and reconnect
    newSocket.on('connect', () => {
      if (user?._id) {
        newSocket.emit('register', user._id.toString());
      }
    });

    newSocket.on('reconnect', () => {
      if (user?._id) {
        newSocket.emit('register', user._id.toString());
      }
    });

    newSocket.on('connect_error', () => {
      // Clean silent error handling for WebSocket dev server reconnections
    });

    newSocket.on('newNotification', (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (data) {
        // 1. In-app toast notification so user sees it instantly on screen
        toast.info(data.title || 'New CRM Notification', {
          description: data.message || '',
          action: data.link ? {
            label: 'View',
            onClick: () => {
              if (window.location.pathname !== data.link) {
                window.location.href = data.link;
              }
            },
          } : undefined,
          duration: 5000,
        });

        // 2. Native OS / Desktop Browser Push Notification
        sendBrowserNotification({
          title: data.title || 'New CRM Notification',
          message: data.message || '',
          link: data.link || '/',
        });
      }
    });

    // Targeted session termination for password / permissions / status changes
    newSocket.on('forceLogout', (data) => {
      console.warn('Targeted forceLogout received:', data);
      toast.error(data?.message || 'Your session has ended. Please log in again.');
      dispatch(logout());
      setTimeout(() => {
        window.location.href = '/login';
      }, 600);
    });

    // Real-time invalidations across data models so changes reflect live without refresh
    const handleInvalidate = (keys) => {
      if (Array.isArray(keys)) {
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      } else {
        queryClient.invalidateQueries();
      }
    };

    newSocket.on('projectUpdated', () => handleInvalidate(['projects', 'project', 'tasks']));
    newSocket.on('projectCreated', () => handleInvalidate(['projects']));
    newSocket.on('projectDeleted', () => handleInvalidate(['projects']));

    newSocket.on('taskCreated', () => handleInvalidate(['tasks', 'task', 'projects']));
    newSocket.on('taskUpdated', () => handleInvalidate(['tasks', 'task', 'projects']));
    newSocket.on('taskDeleted', () => handleInvalidate(['tasks', 'task', 'projects']));
    newSocket.on('taskMoved', () => handleInvalidate(['tasks', 'projects']));

    newSocket.on('leadCreated', () => handleInvalidate(['leads', 'lead', 'leads-kanban']));
    newSocket.on('leadUpdated', () => handleInvalidate(['leads', 'lead', 'leads-kanban']));
    newSocket.on('leadDeleted', () => handleInvalidate(['leads', 'leads-kanban']));

    newSocket.on('clientCreated', () => handleInvalidate(['clients', 'client']));
    newSocket.on('clientUpdated', () => handleInvalidate(['clients', 'client']));
    newSocket.on('clientDeleted', () => handleInvalidate(['clients']));

    newSocket.on('financeUpdated', () => handleInvalidate(['finance', 'invoices', 'expenses', 'proposals']));
    newSocket.on('attendanceUpdated', () => handleInvalidate(['attendance']));
    newSocket.on('accessRequestCreated', () => handleInvalidate(['access-requests']));

    newSocket.on('smmTrackerUpdated', () => handleInvalidate(['smm-tracker', 'smmTracker', 'smm-clients', 'clients']));
    newSocket.on('smmClientCreated', () => handleInvalidate(['clients', 'client', 'smm-clients']));
    newSocket.on('smmClientUpdated', () => handleInvalidate(['clients', 'client', 'smm-clients']));
    newSocket.on('smmClientDeleted', () => handleInvalidate(['clients', 'client', 'smm-clients']));

    // Universal catch-all for live CRM mutations
    newSocket.on('crmLiveUpdate', ({ event }) => {
      if (!event) return;
      if (event.startsWith('task')) handleInvalidate(['tasks', 'task', 'projects']);
      else if (event.startsWith('client') || event.startsWith('smmClient')) handleInvalidate(['clients', 'client', 'smm-clients']);
      else if (event.startsWith('lead')) handleInvalidate(['leads', 'lead', 'leads-kanban']);
      else if (event.startsWith('project')) handleInvalidate(['projects', 'project', 'tasks']);
      else if (event.startsWith('smmTracker')) handleInvalidate(['smm-tracker', 'smmTracker']);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id, queryClient]);

  // Register user room after socket connects or user changes
  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('register', user._id);
    }
  }, [socket, user?._id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};


import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '../store/slices/authSlice';
import { toast } from 'sonner';
import { reconcilePushSubscription } from '../utils/webPush';
import { triggerBannerNotification, sendBrowserNotification } from '../utils/browserNotification';

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

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Connect to the same origin with authenticated handshake
    const newSocket = io(window.location.origin, {
      auth: { token },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    // Reconcile push subscription on connect
    newSocket.on('connect', () => {
      reconcilePushSubscription().catch(() => {});
    });

    newSocket.on('reconnect', () => {
      reconcilePushSubscription().catch(() => {});
      queryClient.invalidateQueries();
    });

    newSocket.on('connect_error', () => {
      // Clean silent error handling for WebSocket dev server reconnections
    });

    newSocket.on('newNotification', (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (data) {
        const title = data.title || 'ðŸ”” RISE WITH MEDIA Notification';
        const message = data.message || '';
        const link = data.link || '/';

        // 1. Trigger the rich in-app floating banner notification at top of screen
        triggerBannerNotification({
          id: data._id || `notif-${Date.now()}`,
          title,
          message,
          link,
          type: data.type || 'system',
          createdAt: data.createdAt,
        });

        // 2. Trigger native OS Desktop / Mobile banner notification (shows even if window minimized or inactive)
        sendBrowserNotification({
          title,
          message,
          link,
          tag: data._id?.toString() || `crm-notif-${Date.now()}`,
        }).catch(() => {});

        // 3. Fallback toast
        toast.info(title, {
          description: message,
          action: link ? {
            label: 'View',
            onClick: () => {
              if (window.location.pathname !== link) {
                window.location.href = link;
              }
            },
          } : undefined,
          duration: 5000,
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

    // Real-time invalidations across data models with burst batching (150ms window)
    const pendingKeys = new Set();
    let batchTimer = null;

    const handleInvalidate = (keys) => {
      if (Array.isArray(keys)) {
        keys.forEach((key) => pendingKeys.add(key));
      } else if (typeof keys === 'string') {
        pendingKeys.add(keys);
      }

      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          const keysToInvalidate = Array.from(pendingKeys);
          pendingKeys.clear();
          batchTimer = null;
          keysToInvalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
        }, 150);
      }
    };

    // Specific registered named events
    const handledNamedEvents = new Set([
      'projectUpdated', 'projectCreated', 'projectDeleted',
      'taskCreated', 'taskUpdated', 'taskDeleted', 'taskMoved', 'taskStatusUpdated',
      'leadCreated', 'leadUpdated', 'leadDeleted',
      'clientCreated', 'clientUpdated', 'clientDeleted',
      'financeUpdated', 'invoicePaid', 'expenseApproved',
      'attendanceUpdated', 'eodSubmitted', 'accessRequestCreated', 'accessRequestUpdated',
      'smmTrackerUpdated', 'smmClientCreated', 'smmClientUpdated', 'smmClientDeleted',
      'dmCalendarUpdated', 'contentProductionUpdated',
      'content_production:created', 'content_production:updated', 'content_production:revision', 'content_production:deleted',
      'userCreated', 'userUpdated',
    ]);

    newSocket.on('projectUpdated', () => handleInvalidate(['projects', 'project', 'tasks']));
    newSocket.on('projectCreated', () => handleInvalidate(['projects']));
    newSocket.on('projectDeleted', () => handleInvalidate(['projects']));

    newSocket.on('taskCreated', () => handleInvalidate(['tasks', 'task', 'projects']));
    newSocket.on('taskUpdated', () => handleInvalidate(['tasks', 'task', 'projects']));
    newSocket.on('taskDeleted', () => handleInvalidate(['tasks', 'task', 'projects']));
    newSocket.on('taskMoved', () => handleInvalidate(['tasks', 'projects']));
    newSocket.on('taskStatusUpdated', () => handleInvalidate(['tasks', 'task', 'projects']));

    newSocket.on('leadCreated', () => handleInvalidate(['leads', 'lead', 'leads-kanban']));
    newSocket.on('leadUpdated', () => handleInvalidate(['leads', 'lead', 'leads-kanban']));
    newSocket.on('leadDeleted', () => handleInvalidate(['leads', 'leads-kanban']));

    newSocket.on('clientCreated', () => handleInvalidate(['clients', 'client', 'smm-clients']));
    newSocket.on('clientUpdated', () => handleInvalidate(['clients', 'client', 'smm-clients']));
    newSocket.on('clientDeleted', () => handleInvalidate(['clients', 'smm-clients']));

    newSocket.on('financeUpdated', () => handleInvalidate([
      'finance', 'invoices', 'invoice', 'expenses', 'expense', 'proposals',
      'payments', 'payment-reminders', 'loans',
      'finance-records', 'finance-record', 'finance-entries',
      'finance-summary', 'finance-dashboard-summary',
      'finance-overview', 'finance-module-overview', 'finance-payroll',
      'reports',
    ]));
    newSocket.on('invoicePaid', () => handleInvalidate(['finance', 'invoices', 'reports']));
    newSocket.on('expenseApproved', () => handleInvalidate(['finance', 'expenses', 'reports']));

    newSocket.on('attendanceUpdated', () => handleInvalidate(['attendance', 'team-attendance-today', 'hr-employees', 'reports', 'eod-reports']));
    newSocket.on('eodSubmitted', () => handleInvalidate(['eod-reports', 'attendance', 'reports']));

    newSocket.on('accessRequestCreated', () => handleInvalidate(['access-requests', 'projects', 'project']));
    newSocket.on('accessRequestUpdated', () => handleInvalidate(['access-requests', 'projects', 'project']));

    newSocket.on('smmTrackerUpdated', () => handleInvalidate(['smm-tracker', 'smmTracker', 'smm-clients', 'clients']));
    newSocket.on('smmClientCreated', () => handleInvalidate(['clients', 'client', 'smm-clients']));
    newSocket.on('smmClientUpdated', () => handleInvalidate(['clients', 'client', 'smm-clients']));
    newSocket.on('smmClientDeleted', () => handleInvalidate(['clients', 'client', 'smm-clients']));

    newSocket.on('dmCalendarUpdated', () => handleInvalidate([
      'dm-master-events', 'dm-dashboard-summary', 'dm-video-shoots',
      'dm-client-performance', 'dm-team-performance', 'dm-audit-logs',
      'dm-rj-promotions', 'dm-vj-promotions',
    ]));

    newSocket.on('contentProductionUpdated', () => handleInvalidate(['content-production', 'tasks', 'task']));
    newSocket.on('content_production:created', () => handleInvalidate(['content-production', 'tasks', 'task']));
    newSocket.on('content_production:updated', () => handleInvalidate(['content-production', 'tasks', 'task']));
    newSocket.on('content_production:revision', () => handleInvalidate(['content-production', 'tasks', 'task']));
    newSocket.on('content_production:deleted', () => handleInvalidate(['content-production', 'tasks', 'task']));

    newSocket.on('userCreated', () => handleInvalidate(['users', 'hr-employees', 'reports']));
    newSocket.on('userUpdated', () => handleInvalidate(['users', 'hr-employees', 'reports']));

    // Catch-all for other live CRM mutations that do not already have dedicated listeners
    newSocket.on('crmLiveUpdate', ({ event }) => {
      if (!event || handledNamedEvents.has(event)) return; // Deduplicate: already handled by specific named listener
      if (event.startsWith('task')) handleInvalidate(['tasks', 'task', 'projects']);
      else if (event.startsWith('client') || event.startsWith('smmClient')) handleInvalidate(['clients', 'client', 'smm-clients']);
      else if (event.startsWith('lead')) handleInvalidate(['leads', 'lead', 'leads-kanban']);
      else if (event.startsWith('project')) handleInvalidate(['projects', 'project', 'tasks']);
      else if (event.startsWith('smmTracker')) handleInvalidate(['smm-tracker', 'smmTracker']);
      else if (event.startsWith('finance') || event.startsWith('invoice') || event.startsWith('expense')) {
        handleInvalidate(['finance', 'invoices', 'expenses', 'finance-records', 'reports']);
      } else if (event.startsWith('attendance') || event.startsWith('wfh')) {
        handleInvalidate(['attendance', 'team-attendance-today', 'reports']);
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (batchTimer) clearTimeout(batchTimer);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id, queryClient]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};


import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { sendBrowserNotification } from '../utils/browserNotification';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const socketRef = useRef(null);

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

    newSocket.on('connect_error', () => {
      // Clean silent error handling for WebSocket dev server reconnections
    });

    newSocket.on('newNotification', (data) => {
      if (data) {
        sendBrowserNotification({
          title: data.title || 'New CRM Notification',
          message: data.message || '',
          link: data.link || '/',
        });
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id]);

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


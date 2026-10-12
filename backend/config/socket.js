// =============================================
// SOCKET.IO CONFIGURATION & EVENT HANDLERS
// =============================================

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';

// Map userId -> socketId for targeted notifications
const userSocketMap = new Map();

export const initSocket = (io) => {
  // 1. Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const secret = process.env.JWT_SECRET || 'dev-super-secret-jwt-key';
      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      if (decoded.tokenType && decoded.tokenType !== 'access') {
        return next(new Error('Authentication error: Invalid token type'));
      }

      const user = await User.findById(decoded.id).select('+passwordChangedAt -password -refreshToken');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Authentication error: Account deactivated'));
      }

      if (user.approvalStatus && user.approvalStatus !== 'approved') {
        return next(new Error('Authentication error: Account not approved'));
      }

      if (user.passwordChangedAt && decoded.iat) {
        const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (decoded.iat < changedTimestamp) {
          return next(new Error('Authentication error: Password changed, please re-authenticate'));
        }
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('[Socket Auth] Authentication failed:', err.message);
      next(new Error('Authentication error'));
    }
  });

  // 2. Connection Handler
  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const userId = user._id.toString();
    userSocketMap.set(userId, socket.id);

    // Auto-join authorized rooms derived strictly server-side
    socket.join(`user:${userId}`);

    if (user.organizationId) {
      socket.join(`org:${user.organizationId.toString()}`);
    }

    if (user.brandId) {
      socket.join(`brand:${user.brandId.toString()}`);
    }

    // Auto-join CRM room only for agency staff (superAdmin, admin, manager, employee)
    const isAgencyStaff = ['superAdmin', 'admin', 'manager', 'employee', 'editor', 'designer', 'adsManager'].includes(user.role);
    if (isAgencyStaff) {
      socket.join('crm');
    }

    console.log(`🔌 Socket connected: ${socket.id} (User: ${userId}, Role: ${user.role})`);

    // Deprecate caller-controlled 'register' event; enforce server-derived identity
    socket.on('register', () => {
      // Identity already derived server-side on handshake
      socket.join(`user:${userId}`);
    });

    // Authorized project room join
    socket.on('joinProject', async (projectId) => {
      try {
        if (!projectId) return;

        // Admins can join any project
        if (user.role === 'superAdmin' || user.role === 'admin') {
          socket.join(`project:${projectId}`);
          return;
        }

        const project = await Project.findById(projectId).select('manager team client brandId').lean();
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        const isManager = project.manager?.toString() === userId;
        const isTeamMember = Array.isArray(project.team) && project.team.some((m) => m.toString() === userId);
        const isClientOwner = user.clientId && project.client?.toString() === user.clientId.toString();
        const isBrandAssigned =
          project.brandId &&
          Array.isArray(user.assignedBrands) &&
          user.assignedBrands.some((b) => b.toString() === project.brandId.toString());

        if (isManager || isTeamMember || isClientOwner || isBrandAssigned || user.role === 'manager') {
          socket.join(`project:${projectId}`);
          console.log(`📋 Socket ${socket.id} (User: ${userId}) joined authorized project room: ${projectId}`);
        } else {
          socket.emit('error', { message: 'Not authorized to join this project room' });
        }
      } catch (err) {
        console.error('[Socket joinProject Error]:', err.message);
      }
    });

    socket.on('leaveProject', (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // Join CRM room explicitly if authorized
    socket.on('joinCRM', () => {
      if (isAgencyStaff) {
        socket.join('crm');
      } else {
        socket.emit('error', { message: 'Not authorized to join CRM room' });
      }
    });

    // Join Workspace / Brand room if authorized
    socket.on('joinWorkspace', (brandId) => {
      if (!brandId) return;
      if (user.role === 'superAdmin' || user.role === 'admin') {
        socket.join(`brand:${brandId}`);
      } else if (user.brandId?.toString() === brandId.toString()) {
        socket.join(`brand:${brandId}`);
      } else if (Array.isArray(user.assignedBrands) && user.assignedBrands.some((b) => b.toString() === brandId.toString())) {
        socket.join(`brand:${brandId}`);
      }
    });

    socket.on('leaveWorkspace', (brandId) => {
      if (brandId) {
        socket.leave(`brand:${brandId}`);
      }
    });

    // Typing indicators with server-derived identity
    socket.on('typing', ({ roomId }) => {
      if (roomId) {
        socket.to(roomId).emit('userTyping', { userId, userName: user.name });
      }
    });

    socket.on('stopTyping', ({ roomId }) => {
      if (roomId) {
        socket.to(roomId).emit('userStopTyping', { userId });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (userSocketMap.get(userId) === socket.id) {
        userSocketMap.delete(userId);
      }
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${userId})`);
    });
  });

  // Attach helper methods to io
  io.sendToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  io.broadcastToProject = (projectId, event, data) => {
    io.to(`project:${projectId}`).emit(event, data);
  };

  io.broadcastToWorkspace = (brandId, event, data) => {
    io.to(`brand:${brandId}`).emit(event, data);
  };

  io.broadcastToCRM = (event, data) => {
    io.to('crm').emit(event, data);
  };
};

export { userSocketMap };


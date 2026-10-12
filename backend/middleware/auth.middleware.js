// =============================================
// AUTH MIDDLEWARE - JWT Verification + RBAC
// =============================================

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Protect routes - verifies JWT access token
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-super-secret-jwt-key');
    if (decoded.tokenType && decoded.tokenType !== 'access') {
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token type' });
    }
    const user = await User.findById(decoded.id).select('+passwordChangedAt -password -refreshToken');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'Password or security settings were recently changed. Please log in again.',
        });
      }
    }

    if (user.approvalStatus && user.approvalStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account is not approved' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth protect error:', error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

/**
 * Role-based access control
 * Usage: authorize('superAdmin', 'manager')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Admin and superAdmin have universal access across the entire platform
    if (req.user && (req.user.role === 'superAdmin' || req.user.role === 'admin')) {
      return next();
    }
    let allowedRoles = [...roles];
    if (allowedRoles.includes('superAdmin') && !allowedRoles.includes('admin')) {
      allowedRoles.push('admin');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};
/**
 * Granular permission check
 * Usage: requirePermission('canViewReports')
 */
export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    // SuperAdmins & Admins bypass permission checks
    if (req.user.role === 'superAdmin' || req.user.role === 'admin') return next();
    
    if (!req.user.permissions?.[permissionKey]) {
      return res.status(403).json({
        success: false,
        message: `Missing required permission: ${permissionKey}`,
      });
    }
    next();
  };
};

/**
 * Filter query builder based on workspace
 * Hardened to fail closed and validate membership against x-workspace-id headers
 * Usage: const query = withWorkspaceScope(req, baseQuery)
 */
export const withWorkspaceScope = (req, baseQuery = {}) => {
  const user = req?.user;
  // Fail closed if user is missing
  if (!user) {
    return { ...baseQuery, _id: null };
  }

  const query = user.organizationId ? { ...baseQuery, organizationId: user.organizationId } : { ...baseQuery };
  const requestedWorkspace = req.headers?.['x-workspace-id'];

  // 1. SuperAdmin & Admin: Universal visibility, with optional workspace filter
  if (user.role === 'superAdmin' || user.role === 'admin') {
    if (requestedWorkspace && requestedWorkspace !== 'global') {
      query.brandId = requestedWorkspace;
    }
    return query;
  }

  // 2. Client-side users: Strictly restricted to their own brand/client.
  // Must NOT allow arbitrary x-workspace-id to access other brands.
  if (['client', 'clientAdmin', 'clientMember'].includes(user.role)) {
    if (user.brandId) {
      if (requestedWorkspace && requestedWorkspace !== 'global' && String(requestedWorkspace) !== String(user.brandId)) {
        return { ...query, brandId: null, _id: null };
      }
      query.brandId = user.brandId;
    } else if (user.clientId) {
      query.client = user.clientId;
    } else {
      // Client has neither brandId nor clientId: fail closed
      return { ...query, _id: null };
    }
    return query;
  }

  // 3. Agency specialists (editor, designer, adsManager):
  // Must be restricted to assignedBrands. Empty assignedBrands MUST FAIL CLOSED ({ $in: [] }).
  if (['editor', 'designer', 'adsManager'].includes(user.role)) {
    const assigned = Array.isArray(user.assignedBrands) ? user.assignedBrands : [];
    if (assigned.length === 0) {
      return { ...query, brandId: { $in: [] } };
    }

    if (requestedWorkspace && requestedWorkspace !== 'global') {
      const isAuthorized = assigned.map(String).includes(String(requestedWorkspace));
      if (!isAuthorized) {
        return { ...query, brandId: null, _id: null };
      }
      query.brandId = requestedWorkspace;
      return query;
    }

    query.brandId = { $in: assigned };
    return query;
  }

  // 4. Employees & Managers:
  // If assignedBrands is defined and non-empty, scope to it.
  if (Array.isArray(user.assignedBrands) && user.assignedBrands.length > 0) {
    if (requestedWorkspace && requestedWorkspace !== 'global') {
      const isAuthorized = user.assignedBrands.map(String).includes(String(requestedWorkspace));
      if (!isAuthorized) {
        return { ...query, brandId: null, _id: null };
      }
      query.brandId = requestedWorkspace;
    } else {
      query.brandId = { $in: user.assignedBrands };
    }
    return query;
  }

  // General employee with no specific brand restriction:
  if (requestedWorkspace && requestedWorkspace !== 'global') {
    query.brandId = requestedWorkspace;
  }

  return query;
};
/**
 * Optional auth - attaches user if token present, doesn't block if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password -refreshToken');
    }
  } catch (_) {
    // silently ignore
  }
  next();
};

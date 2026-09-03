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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
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
 * Usage: const query = withWorkspaceScope(req, baseQuery)
 */
export const withWorkspaceScope = (req, baseQuery = {}) => {
  const user = req.user;
  if (!user) return baseQuery;
  
  if (user.role === 'superAdmin' || user.role === 'admin') {
    if (req.headers['x-workspace-id']) {
      return { ...baseQuery, brandId: req.headers['x-workspace-id'] };
    }
    return baseQuery;
  }
  
  const query = { ...baseQuery, organizationId: user.organizationId };
  
  // Explicit workspace selection from UI
  if (req.headers['x-workspace-id']) {
    query.brandId = req.headers['x-workspace-id'];
    return query;
  }
  
  // If user is client-side, restrict to their specific brand
  if (user.role === 'clientAdmin' || user.role === 'clientMember') {
    query.brandId = user.brandId;
  }
  // If user is agency-side but not an owner/manager, restrict to assigned brands
  else if (['editor', 'designer', 'adsManager'].includes(user.role)) {
     if (user.assignedBrands && user.assignedBrands.length > 0) {
       query.brandId = { $in: user.assignedBrands };
     }
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

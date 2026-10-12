// =============================================
// SECURE ADMIN BOOTSTRAP SCRIPT
// Explicit CLI command to create or reset SuperAdmin
// Usage: node utils/bootstrapAdmin.js
// =============================================

import crypto from 'crypto';
import User from '../models/user.model.js';
import { connectDB } from '../config/db.js';
import { loadEnv } from '../config/env.js';

loadEnv();

const bootstrapAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || 'admin@agencycrm.com';
    const name = process.env.BOOTSTRAP_ADMIN_NAME || process.env.DEFAULT_ADMIN_NAME || 'DINESH M';
    // Use explicitly provided password or generate a cryptographically strong random password
    const password =
      process.env.BOOTSTRAP_ADMIN_PASSWORD ||
      (process.env.NODE_ENV === 'production'
        ? crypto.randomBytes(16).toString('base64url')
        : process.env.DEFAULT_ADMIN_PASSWORD || 'password123');

    let admin = await User.findOne({ email });

    if (admin) {
      admin.name = name;
      admin.password = password;
      admin.role = 'superAdmin';
      admin.isActive = true;
      admin.approvalStatus = 'approved';
      admin.passwordChangedAt = new Date();
      admin.permissions = {
        canManageLeads: true,
        canManageFinance: true,
        canManageHR: true,
        canViewReports: true,
      };
      await admin.save();
      console.log(`\n✅ Existing SuperAdmin updated successfully: ${email}`);
    } else {
      admin = await User.create({
        name,
        email,
        password,
        role: 'superAdmin',
        isActive: true,
        approvalStatus: 'approved',
        permissions: {
          canManageLeads: true,
          canManageFinance: true,
          canManageHR: true,
          canViewReports: true,
        },
      });
      console.log(`\n✅ SuperAdmin created successfully: ${email}`);
    }

    if (process.env.NODE_ENV === 'production' && !process.env.BOOTSTRAP_ADMIN_PASSWORD) {
      console.log(`👉 Generated temporary password (save this immediately): ${password}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ SuperAdmin bootstrap failed:', error.message);
    process.exit(1);
  }
};

bootstrapAdmin();

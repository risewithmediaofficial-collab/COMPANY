export const canViewFinanceOverview = (user) => {
  if (!user) return false;

  if (user.role === 'superAdmin' || user.role === 'manager') return true;

  return Boolean(user.permissions?.canViewFinanceOverview || user.permissions?.canManageFinance);
};

export const canManageFinance = (user) => {
  if (!user) return false;

  if (user.role === 'superAdmin') return true;

  return Boolean(user.permissions?.canManageFinance);
};

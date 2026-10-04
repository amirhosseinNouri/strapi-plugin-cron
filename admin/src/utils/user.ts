import type { AdminUserSummary } from '../../../types';

export const formatUser = (user: AdminUserSummary | null | undefined): string => {
  if (!user) return '—';
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email || `User #${user.id}`;
};

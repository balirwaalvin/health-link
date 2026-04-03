import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';

type RoleGuardProps = {
  allowedRoles: Array<'admin' | 'staff'>;
  children: ReactElement;
  redirectTo?: string;
};

export default function RoleGuard({ allowedRoles, children, redirectTo = '/' }: RoleGuardProps) {
  const isSignedIn = Boolean(localStorage.getItem('session_token'));
  const role = (localStorage.getItem('role') || 'staff') as 'admin' | 'staff';

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

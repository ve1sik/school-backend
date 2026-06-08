import { Navigate } from 'react-router-dom';
import { getRole, isTokenValid, logout, homePathForRole, hasAdminPermission, type AdminPermission, type Role } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
  permissions?: AdminPermission[];
}

export default function ProtectedRoute({ children, roles, permissions }: ProtectedRouteProps) {
  // 1. Нет валидного токена → на логин
  if (!isTokenValid()) {
    logout();
    return <Navigate to="/login" replace />;
  }

  // 2. Роль не подходит → на «свою» домашнюю страницу
  const role = getRole();
  if (roles && roles.length > 0 && (!role || !roles.includes(role))) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  if (permissions && permissions.length > 0 && !permissions.some(hasAdminPermission)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return <>{children}</>;
}

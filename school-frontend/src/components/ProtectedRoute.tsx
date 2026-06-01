import { Navigate } from 'react-router-dom';
import { getRole, isTokenValid, logout, homePathForRole, type Role } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
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

  return <>{children}</>;
}

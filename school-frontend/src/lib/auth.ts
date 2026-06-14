// Единые помощники авторизации на фронте

export type Role = 'STUDENT' | 'CURATOR' | 'TEACHER' | 'ADMIN' | 'PARENT';
export type AdminPermission =
  | 'MANAGE_COURSES'
  | 'MANAGE_USERS'
  | 'MANAGE_GROUPS'
  | 'MANAGE_DECKS'
  | 'CURATOR_DASHBOARD';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function setAuthTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) localStorage.setItem('token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: Role;
  admin_permissions?: AdminPermission[];
  exp?: number;
}

export function decodeToken(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1]));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  return decodeToken()?.role ?? null;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, AdminPermission[]> = {
  ADMIN: ['MANAGE_COURSES', 'MANAGE_USERS', 'MANAGE_GROUPS', 'MANAGE_DECKS', 'CURATOR_DASHBOARD'],
  TEACHER: ['MANAGE_COURSES', 'MANAGE_DECKS'],
  CURATOR: ['CURATOR_DASHBOARD'],
  STUDENT: [],
  PARENT: [],
};

export function getAdminPermissions(): AdminPermission[] {
  const payload = decodeToken();
  const role = payload?.role;
  const defaults = role ? DEFAULT_ROLE_PERMISSIONS[role] || [] : [];
  return Array.from(new Set([...defaults, ...(payload?.admin_permissions || [])]));
}

export function hasAdminPermission(permission: AdminPermission): boolean {
  return getAdminPermissions().includes(permission);
}

export function isTokenValid(): boolean {
  const payload = decodeToken();
  if (!payload) return false;
  // exp в секундах
  if (payload.exp && payload.exp * 1000 < Date.now()) return false;
  return true;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}

// Куда отправлять пользователя «домой» в зависимости от роли
export function homePathForRole(role: Role | null): string {
  if (role === 'PARENT') return '/parent-dashboard';
  if (role === 'CURATOR' || role === 'TEACHER') return '/curator';
  return '/';
}

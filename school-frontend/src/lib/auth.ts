// Единые помощники авторизации на фронте

export type Role = 'STUDENT' | 'CURATOR' | 'TEACHER' | 'ADMIN' | 'PARENT';
export type AdminPermission =
  | 'MANAGE_COURSES'
  | 'MANAGE_USERS'
  | 'MANAGE_GROUPS'
  | 'MANAGE_DECKS'
  | 'CURATOR_DASHBOARD';

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Safari private mode / Telegram WebView */
  }
}

function safeRemoveItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** JWT использует base64url — Safari строже Chrome, нужна нормализация */
export function decodeJwtPayload<T = JwtPayload>(token: string): T | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return JSON.parse(window.atob(base64)) as T;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return safeGetItem('token');
}

export function getRefreshToken(): string | null {
  return safeGetItem('refresh_token');
}

export function setAuthTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) safeSetItem('token', accessToken);
  if (refreshToken) safeSetItem('refresh_token', refreshToken);
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
  return decodeJwtPayload<JwtPayload>(token);
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
  safeRemoveItem('token');
  safeRemoveItem('refresh_token');
}

// Куда отправлять пользователя «домой» в зависимости от роли
export function homePathForRole(role: Role | null): string {
  if (role === 'PARENT') return '/parent-dashboard';
  if (role === 'CURATOR' || role === 'TEACHER') return '/curator';
  return '/';
}

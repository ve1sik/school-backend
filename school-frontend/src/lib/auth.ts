// Единые помощники авторизации на фронте

export type Role = 'STUDENT' | 'CURATOR' | 'TEACHER' | 'ADMIN' | 'PARENT';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: Role;
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

export function isTokenValid(): boolean {
  const payload = decodeToken();
  if (!payload) return false;
  // exp в секундах
  if (payload.exp && payload.exp * 1000 < Date.now()) return false;
  return true;
}

export function logout() {
  localStorage.removeItem('token');
}

// Куда отправлять пользователя «домой» в зависимости от роли
export function homePathForRole(role: Role | null): string {
  if (role === 'PARENT') return '/parent-dashboard';
  if (role === 'CURATOR' || role === 'TEACHER') return '/curator';
  return '/';
}

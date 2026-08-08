import axios from 'axios';
import { getRefreshToken, getToken, logout, setAuthTokens } from './auth';
import { isMobileViewport, shouldDeferHeavyLoads } from './defer';

/**
 * API всегда с сервера (prepodmgy.ru).
 * Локальный бэкенд: `VITE_API_URL=http://127.0.0.1:3000 npm run dev`
 */
export const API_URL =
  (import.meta.env.VITE_API_URL as string) || 'https://prepodmgy.ru/api';

/** Origin for uploads/static (no /api suffix). */
export const SITE_ORIGIN = API_URL.replace(/\/api\/?$/, '') || 'https://prepodmgy.ru';

/** Resolve relative upload paths to full URL. */
export function resolveUploadUrl(url: string): string {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) {
    finalUrl = finalUrl.replace('http://', 'https://');
  }
  if (finalUrl.startsWith('http')) return finalUrl;
  const clean = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (clean.startsWith('uploads/')) return `${SITE_ORIGIN}/${clean}`;
  return `${API_URL}/${clean}`;
}

const requestTimeout = typeof window !== 'undefined' && isMobileViewport() ? 35000 : 20000;

// Единый axios-инстанс: сам подставляет токен и обновляет сессию при 401
export const api = axios.create({ baseURL: API_URL, timeout: requestTimeout });

/** Публичные запросы (логин/регистрация) — с таймаутом, без auth interceptor loop */
export const publicApi = axios.create({ baseURL: API_URL, timeout: requestTimeout });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken }, { timeout: 15000 })
      .then((res) => {
        setAuthTokens(res.data.access_token, res.data.refresh_token);
        return res.data.access_token as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config as any;

    // Таймаут или сеть недоступна — не пытаемся рефрешить, просто возвращаем ошибку
    if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error') {
      return Promise.reject(error);
    }

    if (error?.response?.status === 401 && original && !original.__isRetryRequest) {
      original.__isRetryRequest = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      logout();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

// ── Лёгкий кеш GET-запросов: TTL + дедупликация одновременных запросов ──
const cache = new Map<string, { ts: number; data: any }>();
const inflight = new Map<string, Promise<any>>();

export async function cachedGet<T = any>(path: string, ttlMs = 15000): Promise<T> {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.ts < ttlMs) return hit.data as T;

  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;

  const p = api
    .get(path)
    .then((res) => {
      cache.set(path, { ts: Date.now(), data: res.data });
      inflight.delete(path);
      return res.data;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });

  inflight.set(path, p);
  return p as Promise<T>;
}

/**
 * cachedGet с жёстким таймаутом (мс). При превышении бросает ошибку.
 * Используйте .catch(() => fallback) чтобы не зависнуть при недоступном бэкенде.
 */
export async function cachedGetTimeout<T = any>(path: string, ttlMs = 15000, timeoutMs = 18000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timeout: ${path}`)), timeoutMs),
  );
  return Promise.race([cachedGet<T>(path, ttlMs), timeout]);
}

// Сбросить кеш (целиком или по префиксу пути) — вызывать после мутаций
export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) {
    cache.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(pathPrefix)) cache.delete(key);
  }
}

import axios from 'axios';
import { getRefreshToken, getToken, logout, setAuthTokens } from './auth';

export const API_URL = 'https://prepodmgy.ru/api';

// Единый axios-инстанс: сам подставляет токен и обновляет сессию при 401
export const api = axios.create({ baseURL: API_URL });

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
      .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
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

import axios from 'axios';
import { getToken, logout } from './auth';

export const API_URL = 'https://prepodmgy.ru/api';

// Единый axios-инстанс: сам подставляет токен и обрабатывает 401
export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
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

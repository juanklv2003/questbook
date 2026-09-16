import axios from 'axios';
import { getApiBaseUrl } from './apiBase';

export const API_BASE = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/**
 * Si una petición autenticada devuelve 401 (sesión caducada, cookie inválida,
 * JWT_SECRET cambiado, etc.), notificamos al AuthContext para mostrar el login.
 * Las peticiones de /auth/login y /auth/me quedan excluidas:
 * - /auth/login usa 401 para indicar credenciales incorrectas (se maneja en el form).
 * - /auth/me usa 401 de forma pasiva durante el checkAuth inicial.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url === '/auth/me';
    if (status === 401 && !isAuthEndpoint) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

/**
 * Hook reutilizable para llamadas a la API con:
 * - AbortController automático
 * - Estado de loading
 * - Toast de error opcional
 * - Prevención de race conditions
 *
 * @param {object} options
 * @param {boolean} [options.showToast=true] — mostrar toast en error
 * @param {string} [options.errorMessage] — mensaje personalizado de error
 * @returns {{ loading: boolean, error: Error|null, fetcher: Function }}
 */
export function useApi({ showToast = true, errorMessage } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetcher = useCallback(async (url, options = {}) => {
    // Cancelar petición anterior si existe
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    // Agregar token JWT a las peticiones
    const token = sessionStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      // Ignorar aborts intencionales
      if (err.name === 'AbortError') {
        return Promise.reject(err);
      }
      setError(err);
      if (showToast) {
        toast.error(errorMessage || err.message || 'Error de conexión', {
          autoClose: 3500,
          toastId: `api-err-${url}`,
        });
      }
      throw err;
    } finally {
      setLoading(false);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [showToast, errorMessage]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return { loading, error, fetcher, cancel };
}

/**
 * Ejecuta un fetch directo sin hook (para uso fuera de componentes)
 */
export async function apiFetch(url, options = {}) {
  // Agregar token JWT a las peticiones
  const token = sessionStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

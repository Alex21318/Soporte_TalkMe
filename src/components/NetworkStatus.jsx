import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import './NetworkStatus.css';

// ============================================================================
//  NetworkStatus — Sistema global de monitoreo de red
//  - Detecta offline/online del navegador
//  - Intercepta fetch para detectar errores de conexión al backend
//  - Muestra banner cuando se pierde conexión
//  - Suprime errores feos en consola y muestra toasts limpios
// ============================================================================

// Detecta si un error es un abort intencional (cleanup de useEffect)
function esAbortError(err) {
  if (!err) return false;
  return err.name === 'AbortError' || err.name === 'AbortError' ||
    (err.message || '').toLowerCase().includes('abort');
}

// Detecta si una URL apunta a nuestro backend local
function esBackendUrl(url) {
  if (!url) return false;
  const s = String(url);
  return s.includes('/api/') || s.includes('localhost:3001') || s.includes('localhost:5000') || s.startsWith('/');
}

// Mensaje amigable según tipo de error
function mensajeAmigable(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
    return 'Sin conexión con el servidor. Verifica tu red.';
  }
  if (m.includes('timeout') || m.includes('aborted')) {
    return 'La solicitud tardó demasiado. Intenta de nuevo.';
  }
  if (m.includes('json') && m.includes('parse')) {
    return 'El servidor devolvió una respuesta inválida.';
  }
  return 'Error de conexión. Intenta de nuevo.';
}

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  // Refs para lectura sincrónica dentro del interceptor (sin re-registro)
  const serverDownRef = useRef(false);
  const showBannerRef = useRef(false);
  const lastErrorToastRef = useRef(0);
  const serverDebounceRef = useRef(null);

  const setServerDown = (val) => { serverDownRef.current = val; };
  const setShowBannerSafe = (val) => { showBannerRef.current = val; setShowBanner(val); };

  useEffect(() => {
    // ── Listeners nativos del navegador ──
    const handleOnline = () => {
      setOnline(true);
      toast.success('Conexión a internet restaurada', { autoClose: 2500 });
    };
    const handleOffline = () => {
      setOnline(false);
      toast.error('Sin conexión a internet', { autoClose: false, toastId: 'offline' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ── Interceptar fetch para errores de red al backend ──
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      const esBackend = esBackendUrl(url);
      try {
        const res = await originalFetch.apply(this, args);
        // Si fue al backend y respondió OK, marcar server up
        if (esBackend && res.ok) {
          if (serverDownRef.current) setServerDown(false);
          if (showBannerRef.current) setShowBannerSafe(false);
          if (serverDebounceRef.current) {
            clearTimeout(serverDebounceRef.current);
            serverDebounceRef.current = null;
          }
        }
        return res;
      } catch (err) {
        // Ignorar aborts intencionales (cleanup de useEffect al cambiar de página)
        if (esAbortError(err)) {
          throw err;
        }
        if (esBackend) {
          // Suprimir spam de toasts: máximo uno cada 4s
          const now = Date.now();
          if (now - lastErrorToastRef.current > 4000) {
            lastErrorToastRef.current = now;
            toast.error(mensajeAmigable(err), {
              autoClose: 3500,
              toastId: 'net-error',
            });
          }
          setServerDown(true);
          if (serverDebounceRef.current) clearTimeout(serverDebounceRef.current);
          serverDebounceRef.current = setTimeout(() => {
            setShowBannerSafe(true);
          }, 800);
        }
        // Relanzar para que el caller siga manejando como siempre
        throw err;
      }
    };

    // ── Capturar errores globales no manejados (Promise rejections) ──
    const handleUnhandled = (e) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (msg.toLowerCase().includes('failed to fetch')) {
        e.preventDefault(); // no mostrar el error feo en consola
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandled);
      window.fetch = originalFetch;
      if (serverDebounceRef.current) clearTimeout(serverDebounceRef.current);
    };
  }, []);

  // Banner persistente cuando hay problemas de red
  const mostrarBanner = !online || showBanner;
  const mensaje = !online ? 'Sin conexión a internet' : 'Sin conexión con el servidor';
  const detalle = !online
    ? 'Verifica tu red. Los cambios pueden no guardarse hasta que se restablezca la conexión.'
    : 'No se puede comunicar con el servidor. Reintentando automáticamente...';

  if (!mostrarBanner) return null;

  return (
    <div className="tm-net-banner" role="alert">
      <div className="tm-net-banner-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <div className="tm-net-banner-text">
        <strong>{mensaje}</strong>
        <span>{detalle}</span>
      </div>
    </div>
  );
}

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchWithAuth } from './utils/fetchWithAuth';
import Sidebar from './components/Sidebar';
import NetworkStatus from './components/NetworkStatus';
import Login from './pages/Login/Login';
import InitAdmin from './pages/Login/InitAdmin';
import Usuarios from './pages/Usuarios/Usuarios';
import Skills from './pages/Skills/Skills';
import Reportes from './pages/Reportes/Reportes2';
import Cierres from './pages/Cierres/Cierres';
import Creaciones from './pages/Creaciones/Creaciones';
import DiagramasBD from './pages/DiagramasBD/DiagramasBD';
import Configuraciones from './pages/Configuraciones/Configuraciones';
import { API_URLS } from './config/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [needsInit, setNeedsInit] = useState(null); // null = checking, true = needs init, false = has users

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      setIsAuthenticated(false);
      checkNeedsInit();
      return;
    }

    try {
      const response = await fetchWithAuth(API_URLS.verify(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_info');
        setIsAuthenticated(false);
        checkNeedsInit();
      }
    } catch (err) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_info');
      setIsAuthenticated(false);
      checkNeedsInit();
    }
  };

  const checkNeedsInit = async () => {
    try {
      const response = await fetch(API_URLS.checkInit());
      const data = await response.json();
      setNeedsInit(data.needsInit);
    } catch (err) {
      // Si hay error, asumimos que necesita init
      setNeedsInit(true);
    }
  };

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_info');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Mostrar pantalla de carga mientras verifica
  if (needsInit === null) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <p>Verificando sistema...</p>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de inicialización si no hay usuarios
  if (needsInit) {
    return (
      <Router>
        <InitAdmin onAdminCreated={() => {
          setNeedsInit(false);
        }} />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="colored"
          pauseOnFocusLoss={false}
          newestOnTop
          closeOnClick
        />
      </Router>
    );
  }

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return (
      <Router>
        <Login key="login" onLoginSuccess={handleLoginSuccess} />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="colored"
          pauseOnFocusLoss={false}
          newestOnTop
          closeOnClick
        />
      </Router>
    );
  }

  // Mostrar aplicación principal si está autenticado
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Usuarios />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/horarios" element={<Skills />} />
            <Route path="/skills" element={<Navigate to="/horarios" replace />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/cierres" element={<Cierres />} />
            <Route path="/creaciones" element={<Creaciones />} />
            <Route path="/diagramas-bd" element={<DiagramasBD />} />
            <Route path="/auditoria" element={<Navigate to="/cierres" replace />} />
            <Route path="/configuraciones" element={<Configuraciones />} />
          </Routes>
        </main>
      </div>
      {/* Banner global de estado de red */}
      <NetworkStatus />
      {/* ToastContainer global — único para toda la app, evita problemas de containing block */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        pauseOnFocusLoss={false}
        newestOnTop
        closeOnClick
      />
    </Router>
  );
}

export default App;
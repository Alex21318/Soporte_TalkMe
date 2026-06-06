import React from 'react';

/**
 * Modal de confirmación reutilizable con diseño moderno
 *
 * @param {boolean} show — controla visibilidad
 * @param {string} title — título del modal
 * @param {React.ReactNode} children — contenido/mensaje
 * @param {string} confirmText — texto del botón confirmar (default: "Confirmar")
 * @param {string} cancelText — texto del botón cancelar (default: "Cancelar")
 * @param {string} confirmVariant — 'danger' | 'primary' (default: 'danger')
 * @param {() => void} onConfirm — callback al confirmar
 * @param {() => void} onCancel — callback al cancelar/cerrar
 */
export default function ConfirmModal({
  show,
  title = 'Confirmar acción',
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  const isDanger = confirmVariant === 'danger';
  const confirmBg = isDanger ? 'var(--tm-danger-600)' : 'var(--tm-primary-600)';
  const confirmHover = isDanger ? 'var(--tm-danger-700)' : 'var(--tm-primary-700)';
  const confirmShadow = isDanger ? 'rgba(220, 38, 38, 0.3)' : 'rgba(var(--tm-primary-rgb-600), 0.3)';

  return (
    <div 
      className="tm-modal-overlay" 
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'tm-fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="tm-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'tm-slideUp 0.3s ease-out',
          border: '1px solid var(--tm-border-weak)'
        }}
      >
        {/* Header con icono */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: isDanger ? 'var(--tm-danger-100)' : 'var(--tm-primary-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isDanger ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tm-danger-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tm-primary-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '700',
            color: 'var(--tm-text)',
            letterSpacing: '-0.025em'
          }}>
            {title}
          </h3>
        </div>

        {/* Body */}
        <div style={{
          color: 'var(--tm-text-soft)',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          {children}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--tm-text-soft)',
              backgroundColor: 'var(--tm-bg-alt)',
              border: '1px solid var(--tm-border)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--tm-bg-alt)'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: confirmBg,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: `0 4px 12px ${confirmShadow}`
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = confirmHover}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = confirmBg}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tm-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tm-slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

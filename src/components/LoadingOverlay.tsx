import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(5px)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Premium Spinner */}
      <div className="spinner-container" style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px' }}>
        <svg viewBox="0 0 50 50" style={{ width: '100%', height: '100%', animation: 'rotate 2s linear infinite' }}>
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#000000"
            strokeWidth="4"
            strokeDasharray="80"
            strokeDashoffset="60"
          />
        </svg>
      </div>

      {/* Status Text */}
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '20px',
        fontWeight: 600,
        color: '#111827',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        Processing
      </h3>
      
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: 500
      }}>
        {message}
      </p>

      <style>{`
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;

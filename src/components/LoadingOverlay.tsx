import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
  progress?: { current: number; total: number };
  orderName?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message, progress, orderName }) => {
  if (!isVisible) return null;

  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Black Header Strip */}
      {orderName && (
        <div style={{
          width: '100%',
          backgroundColor: '#1f1f1f',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <span style={{
            color: '#fff',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            letterSpacing: '0.02em'
          }}>
            {orderName}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Title */}
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '32px',
          fontWeight: 400,
          color: '#9ca3af',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Processing
        </h2>
        
        {/* Subtitle */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          color: '#9ca3af',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          {message}
        </p>

        {/* Spinner Box */}
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '16px',
          border: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          backgroundColor: '#fff'
        }}>
          <svg viewBox="0 0 50 50" style={{ width: '48px', height: '48px', animation: 'rotate 1.5s linear infinite' }}>
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
              stroke="#9ca3af"
              strokeWidth="4"
              strokeDasharray="80"
              strokeDashoffset="60"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Progress Bar */}
        {progress && progress.total > 0 && (
          <>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: '#374151',
                borderRadius: '3px',
                transition: 'width 0.3s ease-out'
              }} />
            </div>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              {progress.current} of {progress.total}
            </p>
          </>
        )}
      </div>

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

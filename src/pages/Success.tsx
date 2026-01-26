import { useNavigate } from "react-router-dom";

export default function Success() {
  const navigate = useNavigate();

  const handleScanNext = () => {
    // Clear enrollment data
    localStorage.removeItem("currentOrderId");
    localStorage.removeItem("nfcUid");
    localStorage.removeItem("nfcToken");
    localStorage.removeItem("gps");
    localStorage.removeItem("proofId");
    
    // Navigate back to order selection
    navigate("/order/select");
  };

  return (
    <div className="success-page">
      {/* Step Indicator */}
      <div className="step-indicator">
        <div 
          className="step completed" 
          onClick={() => navigate("/scan")}
          style={{ cursor: 'pointer' }}
        >
          <div className="step-number"></div>
          <div className="step-label">Scan</div>
        </div>
        <div 
          className="step completed" 
          onClick={() => navigate("/photos")}
          style={{ cursor: 'pointer' }}
        >
          <div className="step-number"></div>
          <div className="step-label">Photos</div>
        </div>
        <div 
          className="step completed" 
          onClick={() => navigate("/write")}
          style={{ cursor: 'pointer' }}
        >
          <div className="step-number"></div>
          <div className="step-label">Write</div>
        </div>
        <div className="step active">
          <div className="step-number">4</div>
          <div className="step-label">Done</div>
        </div>
      </div>

      {/* Content */}
      <div className="success-content" style={{ marginTop: '8px', justifyContent: 'flex-start' }}>
        {/* Checkmark Icon */}
        <div className="success-icon">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <h1 className="success-title">Enroll Complete</h1>
        <p className="success-subtitle">Sticker and 1 photo saved</p>
      </div>

      {/* Action Button */}
      <button onClick={handleScanNext} className="btn-scan-next">
        Scan Next Package
      </button>
    </div>
  );
}

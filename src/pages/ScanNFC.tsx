import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Add type definition for iOS Bridge
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        nfcBridge?: {
          postMessage: (message: string) => void;
        };
        nfcWriteBridge?: {
          postMessage: (message: string) => void;
        };
      };
    };
    handleIOSScan?: (nfcUid: string) => void;
    handleIOSWriteResult?: (success: boolean, error?: string) => void;
  }
}

export default function ScanNFC() {
  const [status, setStatus] = useState("Waiting for NFC sticker...");
  const [scanSuccess, setScanSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);  // For success blink animation
  const navigate = useNavigate();
  const abortController = new AbortController();

  useEffect(() => {
    // Get Order ID/Name from localStorage
    const savedOrderName = localStorage.getItem("currentOrderName") || localStorage.getItem("currentOrderId") || "ORD-UNKNOWN";
    setOrderId(savedOrderName);

    // ✅ Clear previous scan data when landing on Scan page
    // This ensures every visit is a "fresh" scan
    localStorage.removeItem("nfcUid");
    localStorage.removeItem("gps");
  }, []);

  // Check if running in iOS Wrapper
  const isIOSWrapper = typeof window !== 'undefined' && 
                       window.webkit?.messageHandlers?.nfcBridge !== undefined;

  useEffect(() => {
    // Register global callback for iOS
    if (isIOSWrapper) {
      window.handleIOSScan = (nfcUid: string) => {
        handleTagRead(nfcUid);
      };
    }
    
    return () => {
      // Cleanup
      if (window.handleIOSScan) {
        delete window.handleIOSScan;
      }
    };
  }, [isIOSWrapper]);

  // ✅ AUTO-START SCANNING
  useEffect(() => {
    if (!scanSuccess && !isScanning && !autoStarted) {
      setAutoStarted(true);
      
      // Small delay to ensure DOM is ready and smooth UX
      setTimeout(() => {
        startScan();
      }, 300);
    }
  }, [scanSuccess, isScanning, autoStarted]);

  const startScan = async () => {
    setIsScanning(true);
    
    // 1. iOS Native Bridge Path
    if (isIOSWrapper) {
      setStatus("Waiting for NFC sticker...");
      try {
        window.webkit?.messageHandlers?.nfcBridge?.postMessage("startScan");
      } catch (err) {
        console.error("Failed to call iOS bridge", err);
        setStatus("Error calling iOS bridge");
        setIsScanning(false);
      }
      return;
    }

    // 2. Android Web NFC Path
    if (!("NDEFReader" in window)) {
      alert("NFC not supported on this device/browser");
      setIsScanning(false);
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal: abortController.signal });
      setStatus("Waiting for NFC sticker...");

      ndef.onreading = (event: any) => {
        const serialNumber = event.serialNumber;
        // Stop scanning immediately
        abortController.abort();
        handleTagRead(serialNumber);
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Ignore abort errors (intentional stop)
        return;
      }
      console.error("Error starting NFC scan", error);
      setStatus("Error: " + error);
      setIsScanning(false);
    }
  };

  const handleTagRead = (nfcUid: string) => {
    setStatus("Sticker detected!");
    setIsScanning(false);
    localStorage.setItem("nfcUid", nfcUid);
    
    // Start fast blink animation (3 times)
    setIsBlinking(true);
    
    // After 3 blinks (~600ms), show checkmark
    setTimeout(() => {
      setIsBlinking(false);
      setScanSuccess(true);
    }, 600);
    
    // Get GPS immediately
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          localStorage.setItem("gps", JSON.stringify(gps));
        },
        (error) => {
          console.error("GPS Error", error);
        }
      );
    }

    // Navigate after blink + checkmark animation (600ms blink + 500ms checkmark = 1100ms total)
    setTimeout(() => {
      navigate("/photos");
    }, 1100);
  };

  const handleCancel = () => {
    navigate("/order/select");
  };

  return (
    <div className="scan-page">
      {/* Black Header Strip */}
      <div className="header-strip">
        <span className="header-order-id">{orderId}</span>
      </div>

      {/* Cancel Button */}
      <button className="cancel-btn" onClick={handleCancel}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Cancel
      </button>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className="step active">
          <span className="step-number">1</span>
          <span className="step-label">Scan</span>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="step pending">
          <span className="step-number">2</span>
          <span className="step-label">Photos</span>
       </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="step pending">
          <span className="step-number">3</span>
          <span className="step-label">Write</span>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="step pending">
          <span className="step-number">4</span>
          <span className="step-label">Done</span>
        </div>
      </div>

      {/* Content - Moved directly under step indicator */}
      <div className="scan-content" style={{ marginTop: '8px' }}>
        <h1 className="scan-title">Scan Sticker</h1>
        <p className="scan-subtitle">{status}</p>

        {/* Icon Container - Grey border initially, black on success */}
        <div style={{
          width: '120px',
          height: '120px',
          margin: '32px auto 16px auto',
          borderRadius: '16px',
          border: scanSuccess ? '2px solid #000000' : '2px solid #d1d5db',
          backgroundColor: scanSuccess ? '#f0fdf4' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}>
          {scanSuccess ? (
            /* Checkmark Icon */
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#000000" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ animation: 'scaleIn 0.3s ease-out' }}
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            /* Wifi Icon - Pulses during scanning, blinks fast on success */
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ 
                color: '#9ca3af',
                transform: 'rotate(45deg)',
                animation: isBlinking 
                  ? 'fastBlink 0.2s 3' 
                  : isScanning 
                    ? 'pulseColor 1.5s ease-in-out infinite' 
                    : 'none'
              }}
            >
              <path d="M12 20h.01"></path>
              <path d="M2 8.82a15 15 0 0 1 20 0"></path>
              <path d="M5 12.859a10 10 0 0 1 14 0"></path>
              <path d="M8.5 16.429a5 5 0 0 1 7 0"></path>
            </svg>
          )}
        </div>

        {/* Permanent text below icon - always visible */}
        <p style={{ 
          fontSize: '14px', 
          color: '#6b7280', 
          textAlign: 'center', 
          fontWeight: 500,
          marginTop: '0',
          marginBottom: '16px'
        }}>
          Hold sticker near device
        </p>
      </div>

      {/* No more manual Start Scan button - scanning is automatic */}

      {/* Animation Keyframes */}
      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        /* Pulse animation: grey to black and back */
        @keyframes pulseColor {
          0%, 100% {
            color: #9ca3af;  /* Grey */
          }
          50% {
            color: #000000;  /* Black */
          }
        }
        
        /* Fast blink animation: 3 times in 0.6s */
        @keyframes fastBlink {
          0%, 100% {
            color: #9ca3af;  /* Grey */
          }
          50% {
            color: #000000;  /* Black */
          }
        }
      `}</style>
    </div>
  );
}

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
  const [status, setStatus] = useState("Ready to scan");
  const [scanSuccess, setScanSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const navigate = useNavigate();
  const abortController = new AbortController();

  useEffect(() => {
    // Get Order ID/Name from localStorage
    const savedOrderName = localStorage.getItem("currentOrderName") || localStorage.getItem("currentOrderId") || "ORD-UNKNOWN";
    setOrderId(savedOrderName);
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

  const startScan = async () => {
    // 1. iOS Native Bridge Path
    if (isIOSWrapper) {
      setStatus("Scanning (iOS)...");
      try {
        window.webkit?.messageHandlers?.nfcBridge?.postMessage("startScan");
      } catch (err) {
        console.error("Failed to call iOS bridge", err);
        setStatus("Error calling iOS bridge");
      }
      return;
    }

    // 2. Android Web NFC Path
    if (!("NDEFReader" in window)) {
      alert("NFC not supported on this device/browser");
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal: abortController.signal });
      setStatus("Scanning...");

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
    }
  };

  const handleTagRead = (nfcUid: string) => {
    setStatus("Sticker detected.");
    localStorage.setItem("nfcUid", nfcUid);
    setScanSuccess(true);
    
    // Get GPS immediately but don't navigate
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
  };

  const handleContinue = () => {
    navigate("/photos");
  };

  const handleCancel = () => {
    navigate("/order/select");
  };

  return (
    <div className="scan-page">
      {/* Cancel Button */}
      <button className="cancel-btn" onClick={handleCancel}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Cancel
      </button>

      {/* Order Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#9ca3af' }}>Order</span>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#000000', marginLeft: '12px', letterSpacing: '0.05em' }}>{orderId}</span>
      </div>

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

      {/* Content */}
      <div className="scan-content">
        <h1 className="scan-title">Scan Sticker</h1>
        <p className="scan-subtitle">{status}</p>

        <div className={`nfc-icon-container ${scanSuccess ? "success" : ""}`}>
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ color: "#9ca3af", transform: "rotate(45deg)" }}
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
          </svg>
        </div>

        {!scanSuccess && (
          <p className="scan-processing">{status === "Scanning..." ? "Processing..." : ""}</p>
        )}
      </div>

      {/* Action Button */}
      {!scanSuccess ? (
        <button onClick={startScan} className="btn-scan">
          Start Scan
        </button>
      ) : (
        <div className="scan-success-container">
          <div className="success-message">
            ✓ Sticker detected
          </div>
          <button onClick={handleContinue} className="btn-continue">
            Continue to Photos
          </button>
        </div>
      )}
    </div>
  );
}

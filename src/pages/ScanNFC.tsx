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
      };
    };
    handleIOSScan?: (nfcUid: string) => void;
  }
}

export default function ScanNFC() {
  const [status, setStatus] = useState("Ready to scan");
  const navigate = useNavigate();
  const abortController = new AbortController();

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

  const [scanSuccess, setScanSuccess] = useState(false);

  const handleTagRead = (nfcUid: string) => {
    setStatus(`Tag detected: ${nfcUid}`);
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
    navigate("/confirm");
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">Tap NFC Tag</h1>
        <p className="header-subtitle">Hold device near the tag</p>
      </div>
      
      <div className="text-center mb-4">
        <div className="status" style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: 'var(--primary-color)',
          padding: '20px',
          background: '#f0f9ff',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {status}
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isIOSWrapper 
            ? "Tap 'Start Scan' and hold iPhone near the tag." 
            : "Hold the product's NFC tag near the back of the device."}
        </p>
      </div>

      {!scanSuccess ? (
        <button onClick={startScan} className="btn btn-primary">
          Start Scan
        </button>
      ) : (
        <div className="animate-fade-in">
          <div style={{ 
            padding: '12px', 
            background: '#d1fae5', 
            borderRadius: '6px',
            textAlign: 'center',
            color: '#065f46',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            ✅ Tag Scanned Successfully!
          </div>
          <button onClick={handleContinue} className="btn btn-primary" style={{ width: '100%' }}>
            Continue to Photos →
          </button>
        </div>
      )}
    </div>
  );
}

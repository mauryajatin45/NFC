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

export default function WriteNFC() {
  const [status, setStatus] = useState("Ready to write");
  const [writeSuccess, setWriteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const navigate = useNavigate();

  const nfcToken = localStorage.getItem("nfcToken");
  const orderId = localStorage.getItem("currentOrderId");

  // Check if running in iOS Wrapper
  const isIOSWrapper = typeof window !== 'undefined' && 
                       window.webkit?.messageHandlers?.nfcWriteBridge !== undefined;

  // Generate the URL to write
  const urlToWrite = nfcToken ? `http://in.ink/t/${nfcToken}` : "";

  useEffect(() => {
    // Redirect if no token available
    if (!nfcToken) {
      alert("Error: No NFC token found. Please complete enrollment first.");
      navigate("/home");
      return;
    }

    // Register global callback for iOS write result
    if (isIOSWrapper) {
      window.handleIOSWriteResult = (success: boolean, errorMsg?: string) => {
        setIsWriting(false);
        if (success) {
          setWriteSuccess(true);
          setStatus("✅ Tag written successfully!");
          setError(null);
        } else {
          setError(errorMsg || "Write failed");
          setStatus("❌ Write failed");
        }
      };
    }
    
    return () => {
      // Cleanup
      if (window.handleIOSWriteResult) {
        delete window.handleIOSWriteResult;
      }
    };
  }, [nfcToken, navigate, isIOSWrapper]);

  const startWrite = async () => {
    if (!urlToWrite) {
      alert("Error: No URL to write");
      return;
    }

    setIsWriting(true);
    setError(null);
    setStatus("Preparing to write...");

    // 1. iOS Native Bridge Path
    if (isIOSWrapper) {
      setStatus("Hold iPhone near tag to write...");
      try {
        // Send URL to native iOS code
        window.webkit?.messageHandlers?.nfcWriteBridge?.postMessage(urlToWrite);
      } catch (err) {
        console.error("Failed to call iOS write bridge", err);
        setError("Error calling iOS bridge");
        setStatus("❌ Error");
        setIsWriting(false);
      }
      return;
    }

    // 2. Android Web NFC Path
    if (!("NDEFReader" in window)) {
      setError("NFC writing not supported on this device/browser");
      setStatus("❌ Not supported");
      setIsWriting(false);
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      setStatus("Hold device near tag to write...");

      // Write the URL to the tag
      await ndef.write({
        records: [
          {
            recordType: "url",
            data: urlToWrite
          }
        ]
      });

      // Success!
      setWriteSuccess(true);
      setStatus("✅ Tag written successfully!");
      setError(null);
      setIsWriting(false);

    } catch (error: any) {
      console.error("Error writing NFC tag:", error);
      
      let errorMessage = "Write failed";
      if (error.name === 'AbortError') {
        errorMessage = "Write cancelled";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Permission denied";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "NFC not supported";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Tag not writable";
      } else {
        errorMessage = error.message || "Unknown error";
      }
      
      setError(errorMessage);
      setStatus(`❌ ${errorMessage}`);
      setIsWriting(false);
    }
  };

  const handleContinue = () => {
    // Clear all enrollment data
    localStorage.removeItem("currentOrderId");
    localStorage.removeItem("nfcUid");
    localStorage.removeItem("nfcToken");
    localStorage.removeItem("gps");
    
    navigate("/home");
  };

  const handleSkip = () => {
    if (window.confirm("Skip writing to tag? You can write it manually later.")) {
      handleContinue();
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">Write NFC Tag</h1>
        <p className="header-subtitle">Write enrollment data to the tag</p>
      </div>

      {/* Order Details */}
      <div style={{
        background: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Order:</strong>
          <span style={{ float: 'right', color: 'var(--text-secondary)' }}>{orderId}</span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Token:</strong>
          <span style={{ 
            float: 'right', 
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {nfcToken}
          </span>
        </div>
      </div>

      {/* URL to Write */}
      <div style={{
        background: '#f0f9ff',
        padding: '16px',
        borderRadius: '8px',
        border: '2px solid #0ea5e9',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: '600', color: '#0369a1' }}>
          📝 URL to Write:
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          wordBreak: 'break-all',
          color: '#0c4a6e',
          background: 'white',
          padding: '12px',
          borderRadius: '6px'
        }}>
          {urlToWrite}
        </div>
      </div>

      {/* Status Display */}
      <div className="text-center mb-4">
        <div className="status" style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: writeSuccess ? '#065f46' : error ? '#991b1b' : 'var(--primary-color)',
          padding: '20px',
          background: writeSuccess ? '#d1fae5' : error ? '#fee2e2' : '#f0f9ff',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {status}
        </div>
        
        {!writeSuccess && !error && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {isIOSWrapper 
              ? "Tap 'Start Write' and hold iPhone near the tag." 
              : "Hold the NFC tag near the back of your device."}
          </p>
        )}

        {error && !writeSuccess && (
          <p style={{ color: '#991b1b', fontSize: '14px', marginTop: '8px' }}>
            {error}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {!writeSuccess ? (
        <div>
          <button 
            onClick={startWrite} 
            disabled={isWriting}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '10px' }}
          >
            {isWriting ? "Writing..." : "✍️ Start Write"}
          </button>
          
          {error && (
            <button 
              onClick={startWrite} 
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '10px' }}
            >
              🔄 Retry Write
            </button>
          )}
          
          <button 
            onClick={handleSkip} 
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            Skip (Manual Write Later)
          </button>
        </div>
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
            ✅ NFC Tag Written Successfully!
          </div>
          <button 
            onClick={handleContinue} 
            className="btn btn-primary" 
            style={{ width: '100%' }}
          >
            Complete & Return Home →
          </button>
        </div>
      )}

      {/* Help Text */}
      <div style={{ 
        marginTop: '20px', 
        padding: '12px', 
        background: '#fef3c7', 
        borderRadius: '6px',
        fontSize: '13px'
      }}>
        <strong>💡 Tips:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Hold the tag steady until write completes</li>
          <li>If write fails, try cleaning the tag surface</li>
          <li>The tag must be NFC writable (not read-only)</li>
          <li>You can skip this step and write manually later if needed</li>
        </ul>
      </div>
    </div>
  );
}

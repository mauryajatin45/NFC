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
  const proofId = localStorage.getItem("proofId");

  // Check if running in iOS Wrapper
  const isIOSWrapper = typeof window !== 'undefined' && 
                       window.webkit?.messageHandlers?.nfcWriteBridge !== undefined;

  // Generate the URL to write
  const urlToWrite = nfcToken ? `http://in.ink/t/${nfcToken}` : "";
  const tagUrl = orderId ? `verify.app/ord-${orderId}` : "";

  useEffect(() => {
    // Redirect if no token available
    if (!nfcToken) {
      alert("Error: No NFC token found. Please complete enrollment first.");
      navigate("/order/select");
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
    setStatus("Writing...");

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
    navigate("/success");
  };

  const handleSkip = () => {
    if (window.confirm("Skip writing to tag? You can write it manually later.")) {
      navigate("/success");
    }
  };

  return (
    <div className="write-page">
      {/* Step Indicator */}
      <div className="step-indicator">
        <div className="step completed">
          <div className="step-number">✓</div>
          <div className="step-label">Scan</div>
        </div>
        <div className="step completed">
          <div className="step-number">✓</div>
          <div className="step-label">Photos</div>
        </div>
        <div className="step active">
          <div className="step-number">3</div>
          <div className="step-label">Write</div>
        </div>
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-label">Done</div>
        </div>
      </div>

      {/* Content */}
      <div className="write-content">
        <h1 className="write-title">Write to Sticker</h1>
        <p className="write-subtitle">{status}</p>

        {/* NFC Icon */}
        <div className={`nfc-icon-container ${isWriting ? "writing" : ""} ${writeSuccess ? "success" : ""}`}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7v10c0 5.5 3.8 10 10 10s10-4.5 10-10V7L12 2z" />
            <path d="M9 9h6M9 12h6M9 15h6" />
          </svg>
        </div>

        {isWriting && (
          <p className="write-processing">Writing...</p>
        )}

        {/* Technical Details */}
        <div className="write-details">
          <div className="detail-row">
            <span className="detail-label">proof_id:</span>
            <span className="detail-value">{proofId ? proofId.substring(0, 20) + "..." : "PRF-" + orderId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">photos:</span>
            <span className="detail-value">1</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">tag_url:</span>
            <span className="detail-value">{tagUrl}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="write-actions">
        {!writeSuccess ? (
          <>
            <button 
              onClick={startWrite} 
              disabled={isWriting}
              className="btn-write"
            >
              {isWriting ? "Writing..." : "Start Write"}
            </button>
            
            {error && (
              <button 
                onClick={startWrite} 
                className="btn-retry"
              >
                🔄 Retry Write
              </button>
            )}
            
            <button 
              onClick={handleSkip} 
              className="btn-skip"
            >
              Skip (Manual Write Later)
            </button>
          </>
        ) : (
          <button 
            onClick={handleContinue} 
            className="btn-complete"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

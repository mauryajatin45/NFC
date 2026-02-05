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
  const [status, setStatus] = useState("Tap sticker to save photos to tag");
  const [writeSuccess, setWriteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false); // For success blink animation
  const navigate = useNavigate();

  const nfcToken = localStorage.getItem("nfcToken");
  const orderId = localStorage.getItem("currentOrderId");
  const orderName = localStorage.getItem("currentOrderName") || orderId || "ORD-UNKNOWN";

  // Check if running in iOS Wrapper
  const isIOSWrapper = typeof window !== 'undefined' && 
                       window.webkit?.messageHandlers?.nfcWriteBridge !== undefined;

  // Generate the URL to write
  const urlToWrite = nfcToken ? `https://in.ink/${nfcToken}` : "";

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
        if (success) {
          handleWriteSuccess();
        } else {
          setIsWriting(false);
          setError(errorMsg || "Write failed");
          setStatus("Write failed. Try again.");
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

  // ✅ AUTO-START WRITING
  useEffect(() => {
    if (!writeSuccess && !isWriting && !autoStarted && urlToWrite) {
      setAutoStarted(true);
      
      // Small delay to ensure DOM is ready and smooth UX
      setTimeout(() => {
        startWrite();
      }, 500);
    }
  }, [writeSuccess, isWriting, autoStarted, urlToWrite]);

  const handleWriteSuccess = () => {
    setStatus("Sticker saved!");
    setError(null);
    setIsWriting(false);
    
    // Start fast blink animation (3 times) like Scan page
    setIsBlinking(true);

    // After 3 blinks (~600ms), show checkmark
    setTimeout(() => {
      setIsBlinking(false);
      setWriteSuccess(true);
      
      // Auto-navigate to success page after animation
      setTimeout(() => {
        navigate("/success");
      }, 1500);
    }, 600);
  };

  const startWrite = async () => {
    if (!urlToWrite) {
      alert("Error: No URL to write");
      return;
    }

    setIsWriting(true);
    setError(null);
    setStatus("Hold sticker near device...");

    // 1. iOS Native Bridge Path
    if (isIOSWrapper) {
      try {
        window.webkit?.messageHandlers?.nfcWriteBridge?.postMessage(urlToWrite);
      } catch (err) {
        console.error("Failed to call iOS write bridge", err);
        setError("Error calling iOS bridge");
        setStatus("Tap sticker to save photos to tag");
        setIsWriting(false);
      }
      return;
    }

    // 2. Android Web NFC Path
    if (!("NDEFReader" in window)) {
      setError("NFC writing not supported on this device/browser");
      setStatus("Tap sticker to save photos to tag");
      setIsWriting(false);
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();

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
      handleWriteSuccess();

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
      setStatus("Tap sticker to save photos to tag");
      setIsWriting(false);
    }
  };

  const handleCancel = () => {
    navigate("/photos");
  };

  return (
    <div className="write-page">
      {/* Black Header Strip */}
      <div className="header-strip">
        <span className="header-order-id">{orderName}</span>
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
        <div 
          className="step completed" 
          onClick={() => navigate("/scan")}
          style={{ cursor: 'pointer' }}
        >
          <div className="step-number"></div>
          <div className="step-label">Scan</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div 
          className="step completed" 
          onClick={() => navigate("/photos")}
          style={{ cursor: 'pointer' }}
        >
          <div className="step-number"></div>
          <div className="step-label">Photos</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="step active">
          <div className="step-number">3</div>
          <div className="step-label">Write</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-label">Done</div>
        </div>
      </div>

      {/* Content */}
      <div className="write-content" style={{ marginTop: '8px', justifyContent: 'flex-start' }}>
        <h1 className="write-title">Write to Sticker</h1>
        <p className="write-subtitle">{status}</p>

        {/* Icon Container - Wifi or Checkmark */}
        <div style={{
          width: '120px',
          height: '120px',
          margin: '32px auto',
          borderRadius: '16px',
          border: writeSuccess ? '2px solid #000' : '2px solid #000', // Black border on success
          backgroundColor: writeSuccess ? '#f0fdf4' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}>
          {writeSuccess ? (
            /* Checkmark Icon - Black Tick */
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
            /* Wifi Icon - Same as Scan page */
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
                  : isWriting 
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

        {!writeSuccess && !isWriting && (
          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
            Hold sticker near device
          </p>
        )}

        {isWriting && (
          <p style={{ fontSize: '12px', color: '#000', textAlign: 'center' }}>
            Writing...
          </p>
        )}

        {writeSuccess && (
          <p style={{ fontSize: '12px', color: '#22c55e', textAlign: 'center', fontWeight: 500 }}>
            Redirecting...
          </p>
        )}

        {error && (
          <p style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', marginTop: '8px' }}>
            {error}
          </p>
        )}
      </div>

      {/* Action Button */}
      {!writeSuccess && (
        <div className="write-actions">
          {/* Start Write button removed or disabled when auto-start logic works, 
              but kepy as fallback if needed or if user cancels then wants to retry?
              Actually Scan page removed it. 
              Let's keep it but it should change to "Writing..." if writing. 
          */}
          <button 
            onClick={startWrite} 
            disabled={isWriting}
            className="btn-write"
            style={{ display: isWriting ? 'none' : 'block' }} // Hide manual button during write
          >
            {isWriting ? "Writing..." : "Start Write"}
          </button>
          
          {error && (
            <button 
              onClick={startWrite} 
              className="btn-skip"
              style={{ marginTop: '8px' }}
            >
              🔄 Try Again
            </button>
          )}
        </div>
      )}

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

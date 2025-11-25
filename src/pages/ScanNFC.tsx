import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ScanNFC() {
  const [status, setStatus] = useState("Ready to scan");
  const navigate = useNavigate();

  const startScan = async () => {
    if (!("NDEFReader" in window)) {
      alert("NFC not supported on this device/browser");
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setStatus("Scanning...");

      ndef.onreading = (event: any) => {
        const serialNumber = event.serialNumber;
        handleTagRead(serialNumber);
      };
    } catch (error) {
      console.error("Error starting NFC scan", error);
      setStatus("Error: " + error);
    }
  };

  const handleTagRead = (nfcUid: string) => {
    setStatus(`Tag detected: ${nfcUid}`);
    localStorage.setItem("nfcUid", nfcUid);
    
    // Get GPS
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          localStorage.setItem("gps", JSON.stringify(gps));
          navigate("/confirm");
        },
        (error) => {
          console.error("GPS Error", error);
          alert("Could not get GPS location. Proceeding anyway.");
          navigate("/confirm");
        }
      );
    } else {
      navigate("/confirm");
    }
  };

  // FOR TESTING - Skip NFC scan
  const handleSkipForTesting = () => {
    const fakeUid = "TEST-" + Math.random().toString(36).substr(2, 9);
    handleTagRead(fakeUid);
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
          Hold the product's NFC tag near the back of the device.
        </p>
      </div>

      <button onClick={startScan} className="btn btn-primary">
        Start Scan
      </button>
      
      {/* Testing button - remove in production */}
      <button 
        onClick={handleSkipForTesting} 
        className="btn btn-secondary"
        style={{ marginTop: '10px', background: '#ffc107', color: '#000' }}
      >
        🧪 Skip NFC (Testing Only)
      </button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Confirm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoHashes, setPhotoHashes] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  const orderId = localStorage.getItem("currentOrderId");
  const nfcUid = localStorage.getItem("nfcUid");
  const gps = JSON.parse(localStorage.getItem("gps") || "{}");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopifyapp.terzettoo.com";

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    console.log(msg);
  };

  const testConnectivity = async () => {
    addLog(`Testing connectivity to: ${API_BASE}`);
    try {
      addLog("Sending OPTIONS request...");
      const res = await fetch(`${API_BASE}/api/photos/upload`, { method: "OPTIONS" });
      addLog(`Response status: ${res.status}`);
      addLog(`Response ok: ${res.ok}`);
      if (res.ok) alert("✅ Server is reachable!");
      else alert(`⚠️ Server reachable but returned ${res.status}`);
    } catch (e: any) {
      addLog(`❌ Connection failed: ${e.name}: ${e.message}`);
      alert(`❌ Connection failed: ${e.message}`);
    }
  };

  useEffect(() => {
    testConnectivity();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(f => {
      addLog(`Selected: ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
    });

    if (photos.length + files.length > 4) {
      alert("Maximum 4 photos allowed");
      return;
    }

    // Preview photos
    const newPhotos = [...photos, ...files].slice(0, 4);
    setPhotos(newPhotos);

    // Create previews
    newPhotos.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => {
          const updated = [...prev];
          updated[index] = reader.result as string;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadPhotos = async () => {
    if (photos.length !== 4) {
      alert("Please select exactly 4 photos");
      return;
    }

    setUploadingPhotos(true);
    addLog("Starting upload sequence...");
    const urls: string[] = [];
    const hashes: string[] = [];

    try {
      addLog(`API_BASE: ${API_BASE}`);
      
      // Upload each photo sequentially
      for (let i = 0; i < photos.length; i++) {
        addLog(`Uploading photo ${i + 1}/4...`);
        
        const formData = new FormData();
        formData.append("photo", photos[i]);
        formData.append("orderId", orderId || "");
        formData.append("photoIndex", i.toString());

        const uploadUrl = `${API_BASE}/api/photos/upload`;
        addLog(`POST to: ${uploadUrl}`);

        let response;
        try {
          response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });
        } catch (err: any) {
          addLog(`⚠️ Attempt 1 failed: ${err.message}`);
          addLog("Retrying in 1s...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });
        }

        addLog(`Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          addLog(`Server error body: ${errorText.substring(0, 100)}`);
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        addLog(`Upload success: ${result.success}`);
        
        if (!result.success) {
          throw new Error(result.error || "Upload failed");
        }

        urls.push(result.photoUrl);
        hashes.push(result.photoHash);
      }

      setPhotoUrls(urls);
      setPhotoHashes(hashes);
      addLog("✅ All photos uploaded!");
      alert("✅ All photos uploaded successfully!");

    } catch (error: any) {
      addLog(`❌ ERROR: ${error.name}: ${error.message}`);
      console.error("Upload error:", error);
      
      const errorDetails = `
        Error: ${error.name}
        Message: ${error.message}
        Stack: ${error.stack ? error.stack.substring(0, 100) : 'N/A'}
      `;
      
      alert(`❌ Photo upload failed:\n${errorDetails}`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmit = async () => {
    if (photoUrls.length !== 4 || photoHashes.length !== 4) {
      alert("Please upload 4 photos first");
      return;
    }

    setLoading(true);
    addLog("Submitting enrollment...");
    try {
      // Generate NFC token
      const nfcToken = "token_" + Math.random().toString(36).substr(2, 9);
      
      const payload = {
        order_id: orderId,
        nfc_uid: nfcUid,
        nfc_token: nfcToken,
        photo_urls: photoUrls,
        photo_hashes: photoHashes,
        shipping_address_gps: gps,
      };

      addLog(`POST to /api/enroll`);
      const response = await fetch(`${API_BASE}/api/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      addLog(`Enroll status: ${response.status}`);
      const result = await response.json();
      
      if (result.success) {
        addLog(`✅ Success! Proof: ${result.proof_id}`);
        alert(`✅ Enrollment successful! Proof ID: ${result.proof_id}`);
        
        // Clear localStorage
        localStorage.removeItem("currentOrderId");
        localStorage.removeItem("nfcUid");
        localStorage.removeItem("gps");
        
        navigate("/home");
      } else {
        addLog(`❌ Failed: ${result.error}`);
        alert("❌ Error: " + result.error);
      }
    } catch (error: any) {
      addLog(`❌ Submit Error: ${error.message}`);
      console.error(error);
      alert("❌ Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">Package Enrollment</h1>
        <p className="header-subtitle">Upload photos and confirm details</p>
      </div>

      {/* Order Details */}
      <div className="details" style={{
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
          <strong style={{ color: 'var(--text-primary)' }}>NFC UID:</strong> 
          <span style={{ float: 'right', color: 'var(--text-secondary)' }}>{nfcUid}</span>
        </div>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Location:</strong> 
          <span style={{ float: 'right', color: 'var(--text-secondary)' }}>
            {gps.lat?.toFixed(4)}, {gps.lng?.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Debug Tools */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testConnectivity}
          className="btn"
          style={{ 
            width: '100%', 
            background: '#4b5563', 
            color: 'white',
            fontSize: '14px',
            padding: '8px'
          }}
        >
          📡 Test Server Connectivity
        </button>
      </div>

      {/* Photo Upload Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
          📸 Upload 4 Photos {photos.length > 0 && `(${photos.length}/4)`}
        </h3>
        
        {/* Photo Previews */}
        {photoPreviews.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px',
            marginBottom: '12px'
          }}>
            {photoPreviews.map((preview, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img 
                  src={preview} 
                  alt={`Photo ${index + 1}`} 
                  style={{ 
                    width: '100%', 
                    height: '120px', 
                    objectFit: 'cover', 
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)'
                  }} 
                />
                <button
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '25px',
                    height: '25px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {photos.length < 4 && (
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              id="photo-input"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <label htmlFor="photo-input">
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById('photo-input')?.click()}
                type="button"
                style={{ width: '100%' }}
              >
                📷 Take/Select Photos ({photos.length}/4)
              </button>
            </label>
          </div>
        )}

        {/* Upload to Server Button */}
        {photos.length === 4 && photoUrls.length === 0 && (
          <button
            onClick={handleUploadPhotos}
            disabled={uploadingPhotos}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {uploadingPhotos ? "Uploading..." : "☁️ Upload Photos to Server"}
          </button>
        )}

        {/* Success indicator */}
        {photoUrls.length === 4 && (
          <div style={{ 
            padding: '12px', 
            background: '#d1fae5', 
            borderRadius: '6px',
            textAlign: 'center',
            color: '#065f46',
            fontWeight: '600'
          }}>
            ✅ All photos uploaded successfully!
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="form-group mt-4">
        <button 
          onClick={handleSubmit} 
          disabled={loading || photoUrls.length !== 4} 
          className="btn btn-primary"
          style={{ 
            width: '100%',
            opacity: photoUrls.length !== 4 ? 0.5 : 1
          }}
        >
          {loading ? "Enrolling..." : "✅ Complete Enrollment"}
        </button>
        <button 
          onClick={() => navigate("/scan")} 
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '10px' }}
        >
          ← Back to Scan
        </button>
      </div>

      {/* Debug Console */}
      <div style={{
        marginTop: '30px',
        background: '#1e1e1e',
        color: '#00ff00',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '10px',
        fontFamily: 'monospace',
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #333'
      }}>
        <div style={{ borderBottom: '1px solid #333', marginBottom: '5px', paddingBottom: '5px', fontWeight: 'bold' }}>
          🖥️ Debug Console
        </div>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>Logs will appear here...</div>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>
    </div>
  );
}

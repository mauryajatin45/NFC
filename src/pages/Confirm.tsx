import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Confirm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoHashes, setPhotoHashes] = useState<string[]>([]);
  
  const orderId = localStorage.getItem("currentOrderId");
  const nfcUid = localStorage.getItem("nfcUid");
  const gps = JSON.parse(localStorage.getItem("gps") || "{}");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopifyapp.terzettoo.com";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
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
    const urls: string[] = [];
    const hashes: string[] = [];

    try {
      // Upload each photo sequentially
      for (let i = 0; i < photos.length; i++) {
        const formData = new FormData();
        formData.append("photo", photos[i]);
        formData.append("orderId", orderId || "");
        formData.append("photoIndex", i.toString());

        const response = await fetch(`${API_BASE}/api/photos/upload`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || "Upload failed");
        }

        urls.push(result.photoUrl);
        hashes.push(result.photoHash);
      }

      setPhotoUrls(urls);
      setPhotoHashes(hashes);
      alert("✅ All photos uploaded successfully!");

    } catch (error: any) {
      console.error(error);
      alert("❌ Photo upload failed: " + error.message);
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

      const response = await fetch(`${API_BASE}/api/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Enrollment successful! Proof ID: ${result.proof_id}`);
        
        // Clear localStorage
        localStorage.removeItem("currentOrderId");
        localStorage.removeItem("nfcUid");
        localStorage.removeItem("gps");
        
        navigate("/home");
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error) {
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
    </div>
  );
}

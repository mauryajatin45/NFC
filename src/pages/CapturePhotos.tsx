import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

export default function CapturePhotos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  // photoUrls and photoHashes will be tracked locally during the unified process
  
  const orderId = localStorage.getItem("currentOrderId");
  const orderName = localStorage.getItem("currentOrderName") || orderId || "ORD-UNKNOWN";
  const nfcUid = localStorage.getItem("nfcUid");
  const gps = JSON.parse(localStorage.getItem("gps") || "{}");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopify-app-250065525755.us-central1.run.app";

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error("Compression failed"));
              }
            },
            "image/jpeg",
            0.7
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (photos.length + files.length > 4) {
      alert("Maximum 4 photos allowed");
      return;
    }

    try {
      const compressedFiles = await Promise.all(
        files.map(async (f) => {
          return await compressImage(f);
        })
      );

      // Preview photos
      const newPhotos = [...photos, ...compressedFiles].slice(0, 4);
      setPhotos(newPhotos);

      // Create previews
      compressedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
      // Clear the input value so the same file can be selected again if needed
      event.target.value = "";
    } catch (error) {
      console.error("Compression error:", error);
      alert("Failed to process images. Please try again.");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    if (photos.length === 0) {
      alert("Please select at least 1 photo");
      return;
    }

    setLoading(true);
    setLoadingMessage("Converting images...");

    try {
      // 1. Upload Photos
      const uploadedUrls: string[] = [];
      const uploadedHashes: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        setLoadingMessage(`Uploading photo ${i + 1} of ${photos.length}...`);
        
        const formData = new FormData();
        formData.append("photo", photos[i]);
        formData.append("orderId", orderId || "");
        formData.append("photoIndex", i.toString());

        const uploadUrl = `${API_BASE}/api/photos/upload`;

        let response;
        try {
          response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });
        } catch (err) {
          console.warn(`Upload attempt 1 failed for photo ${i}, retrying...`, err);
          await new Promise(resolve => setTimeout(resolve, 1000));
          response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });
        }

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Upload failed");
        }

        uploadedUrls.push(result.photoUrl);
        uploadedHashes.push(result.photoHash);
      }

      // 2. Submit Enrollment
      setLoadingMessage("Finalizing enrollment...");
      
      const payload = {
        order_id: orderId,
        serial_number: nfcUid,
        photo_urls: uploadedUrls,
        photo_hashes: uploadedHashes,
        shipping_address_gps: gps,
      };

      const enrollResponse = await fetch(`${API_BASE}/api/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const enrollResult = await enrollResponse.json();

      if (enrollResult.success) {
        setLoadingMessage("Success!");
        
        if (enrollResult.token) {
          localStorage.setItem("nfcToken", enrollResult.token);
        }
        if (enrollResult.proof_id) {
          localStorage.setItem("proofId", enrollResult.proof_id);
        }

        // Short delay to show success message
        setTimeout(() => {
          navigate("/write");
        }, 1000);
      } else {
        throw new Error(enrollResult.error);
      }

    } catch (error: any) {
      console.error("Process error:", error);
      alert(`❌ Error: ${error.message || "Operation failed"}`);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/scan");
  };

  return (
    <div className="photos-page">
      <LoadingOverlay isVisible={loading} message={loadingMessage} />
      
      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        id="photo-input"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

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
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#000000', marginLeft: '12px', letterSpacing: '0.05em' }}>{orderName}</span>
      </div>

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
        <div className="step active">
          <div className="step-number">{photos.length > 0 ? photos.length : '2'}</div>
          <div className="step-label">{photos.length > 0 ? `${photos.length}/4` : 'Photos'}</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="step">
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
      <div className="photos-content" style={{ marginTop: '8px', justifyContent: 'flex-start' }}>
        <h1 className="photos-title">Capture Photos</h1>
        <p className="photos-subtitle">Tap button to start continuous capture.</p>
        <p className="photos-info" style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>1-4 recommended • Camera stays open until done</p>

        {/* Photo Grid - 4 columns in one row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px', 
          maxWidth: '280px', 
          margin: '24px auto'
        }}>
          {[1, 2, 3, 4].map((slot) => {
            const hasPhoto = photoPreviews[slot - 1];
            return (
              <div key={slot} style={{
                aspectRatio: '1',
                borderRadius: '16px',
                border: hasPhoto ? '2px solid #000' : '2px dashed #d1d5db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#fff',
                minHeight: '70px'
              }}>
                {hasPhoto ? (
                  <>
                    <img src={photoPreviews[slot - 1]} alt={`Photo ${slot}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => removePhoto(slot - 1)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >×</button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <span style={{ display: 'block', fontSize: '10px', color: '#9ca3af', marginTop: '2px', fontWeight: 500 }}>{slot}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic Buttons - Change based on photo count */}
        {photos.length === 0 ? (
          /* Initial State: Single Take Photo Button */
          <button
            className="btn-take-photos"
            onClick={() => document.getElementById('photo-input')?.click()}
            style={{ 
              marginTop: '16px', 
              marginBottom: '16px',
              padding: '12px 24px',
              fontSize: '14px',
              width: 'auto',
              minWidth: '290px',
              alignSelf: 'center'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Take Photos
          </button>
        ) : (
          /* Has Photos: Continue + Take More Buttons */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '300px', margin: '16px auto' }}>
            {/* Primary: Continue */}
            <button
              onClick={handleContinue}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Continue with {photos.length}
            </button>

            {/* Secondary: Take More (only if < 4) */}
            {photos.length < 4 && (
              <button
                onClick={() => document.getElementById('photo-input')?.click()}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: 'white',
                  color: '#111827',
                  border: '1px solid #111827',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                + Take More
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Placeholder to maintain spacing if needed */}
      <div className="photos-actions"></div>
    </div>
  );
}

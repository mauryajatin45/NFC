import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

export default function CapturePhotos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  
  const orderId = localStorage.getItem("currentOrderId");
  const orderName = localStorage.getItem("currentOrderName") || orderId || "ORD-00847";
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

      const newPhotos = [...photos, ...compressedFiles].slice(0, 4);
      setPhotos(newPhotos);

      compressedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
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

  const handleContinueToWrite = async () => {
    if (photos.length === 0) {
      alert("Please select at least 1 photo");
      return;
    }

    setLoading(true);
    setLoadingProgress({ current: 0, total: photos.length });
    setLoadingMessage("Uploading photo 1 of " + photos.length + "...");

    try {
      const uploadedUrls: string[] = [];
      const uploadedHashes: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        setLoadingProgress({ current: i + 1, total: photos.length });
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

  const triggerFileInput = () => {
    document.getElementById('photo-input')?.click();
  };

  return (
    <div className="photos-page">
      <LoadingOverlay 
        isVisible={loading} 
        message={loadingMessage} 
        progress={loadingProgress}
        orderName={orderName}
      />
      
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
        <div className="step active">
          <div className="step-number">2</div>
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
        <p className="photos-subtitle">
          {photos.length > 0 ? `${photos.length}/4 captured` : 'Tap button to take a photo.'}
        </p>

        {/* Photo Grid - 2x2 */}
        <div className="photo-grid-2x2">
          {[0, 1, 2, 3].map((index) => {
            const hasPhoto = photoPreviews[index];
            const isNextEmpty = !hasPhoto && index === photos.length;
            
            return (
              <div 
                key={index} 
                className={`photo-box ${hasPhoto ? 'filled' : ''} ${isNextEmpty ? 'next-empty' : ''}`}
                onClick={triggerFileInput}
              >
                {hasPhoto ? (
                  <>
                    <img src={photoPreviews[index]} alt={`Photo ${index + 1}`} className="photo-preview-img" />
                    <div className="photo-checkmark">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <button 
                      className="photo-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    >×</button>
                  </>
                ) : (
                  isNextEmpty && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Helper Text */}
        <p className="photo-helper-text">
          {photos.length > 0 ? 'Tap to add or replace' : 'Tap box to add photo'}
        </p>

        {/* Continue to Write Button */}
        {photos.length > 0 && (
          <button className="btn-continue-write" onClick={handleContinueToWrite}>
            Continue to Write
          </button>
        )}
      </div>
    </div>
  );
}

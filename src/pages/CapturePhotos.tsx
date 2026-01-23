import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CapturePhotos() {
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
    } catch (error) {
      console.error("Compression error:", error);
      alert("Failed to process images. Please try again.");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadPhotos = async () => {
    if (photos.length === 0) {
      alert("Please select at least 1 photo");
      return;
    }
    if (photos.length > 4) {
      alert("Maximum 4 photos allowed");
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

        const uploadUrl = `${API_BASE}/api/photos/upload`;

        let response;
        try {
          response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });
        } catch (err) {
          console.warn("First upload attempt failed, retrying...", err);
          // Wait 1 second and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

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
    if (photoUrls.length === 0 || photoHashes.length === 0) {
      alert("Please upload at least 1 photo first");
      return;
    }

    setLoading(true);
    try {
      // Server will convert serial number to UID and Token (deterministic)
      const payload = {
        order_id: orderId,
        serial_number: nfcUid,  // This is the NFC serial number from scan
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
        // Store token for NFC writing step
        if (result.token) {
          localStorage.setItem("nfcToken", result.token);
        }
        if (result.proof_id) {
          localStorage.setItem("proofId", result.proof_id);
        }

        // Navigate to NFC write screen (don't clear localStorage yet)
        navigate("/write");
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error: any) {
      console.error(error);
      alert("❌ Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/scan");
  };

  return (
    <div className="photos-page">
      {/* Cancel Button */}
      <button className="cancel-btn" onClick={handleCancel}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Cancel
      </button>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className="step completed">
          <div className="step-number">✓</div>
          <div className="step-label">Scan</div>
        </div>
        <div className="step active">
          <div className="step-number">2</div>
          <div className="step-label">Photos</div>
        </div>
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-label">Write</div>
        </div>
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-label">Done</div>
        </div>
      </div>

      {/* Content */}
      <div className="photos-content">
        <h1 className="photos-title">Capture Photos</h1>
        <p className="photos-subtitle">Tap button to start continuous capture.</p>
        <p className="photos-info">1-4 recommended • Camera stays open until done</p>

        {/* Photo Grid */}
        <div className="photo-grid">
          {[1, 2, 3, 4].map((slot) => {
            const hasPhoto = photoPreviews[slot - 1];
            return (
              <div key={slot} className="photo-slot">
                {hasPhoto ? (
                  <>
                    <img src={photoPreviews[slot - 1]} alt={`Photo ${slot}`} className="photo-preview" />
                    <button className="photo-remove" onClick={() => removePhoto(slot - 1)}>×</button>
                  </>
                ) : (
                  <div className="photo-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="photo-slot-number">{slot}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upload Button */}
        {photos.length > 0 && photoUrls.length === 0 && (
          <button onClick={handleUploadPhotos} disabled={uploadingPhotos} className="btn-upload">
            {uploadingPhotos ? "Uploading..." : "☁️ Upload Photos"}
          </button>
        )}

        {/* Success indicator */}
        {photoUrls.length > 0 && photoUrls.length === photos.length && (
          <div className="upload-success">
            ✅ All photos uploaded successfully!
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="photos-actions">
        {photos.length < 4 && (
          <>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              id="photo-input"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              className="btn-take-photos"
              onClick={() => document.getElementById('photo-input')?.click()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photos
            </button>
          </>
        )}
        
        {photoUrls.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-continue-enrollment"
          >
            {loading ? "Processing..." : "Continue to Write"}
          </button>
        )}
      </div>
    </div>
  );
}

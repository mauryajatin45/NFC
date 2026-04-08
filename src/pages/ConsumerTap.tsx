import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyTag } from "../services/api";

export default function ConsumerTap() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeMedia, setActiveMedia] = useState<any>(null);

  // Default bumper if merchant didn't upload any media
  const defaultMediaUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";

  useEffect(() => {
    async function loadVerification() {
      console.log(`[ConsumerTap] Initializing verification for Tag ID: ${id}`);
      if (!id) {
         console.warn(`[ConsumerTap] No Tag ID present in URL!`);
         setErrorMsg("Invalid Tag ID");
         setLoading(false);
         return;
      }
      const { data, error } = await verifyTag(id);
      console.log(`[ConsumerTap] verifyTag response:`, { data, error });

      if (error) {
         console.error(`[ConsumerTap] Verification failed:`, error.message);
         setErrorMsg(error.message);
      } else if (data) {
         console.log(`[ConsumerTap] Verification successful! Data payload:`, data);
         
         // 1. Try to find the PRIMARY merchant media (the first one in the list based on their settings)
         if (data.merchant_media && data.merchant_media.length > 0) {
             console.log(`[ConsumerTap] Found ${data.merchant_media.length} merchant branding items. Setting primary...`);
             const primary = data.merchant_media[0];
             setActiveMedia(primary);
         } 
         // 2. Fallback to warehouse proof video if branding missing but warehouse captured a video 
         else if (data.photo_urls && data.photo_urls.length > 0) {
             // Assume first photo URL might be a video or image. We derive type by extension if not explicitly set.
             const firstProof = data.photo_urls[0];
             const isVideo = firstProof.match(/\.(mp4|webm|ogg)$/i);
             setActiveMedia({ url: firstProof, type: isVideo ? "video" : "image" });
         } 
         // 3. Absolute default bumper
         else {
             console.log(`[ConsumerTap] No valid media found. Falling back to default INK bumper.`);
             setActiveMedia({ url: defaultMediaUrl, type: "video" });
         }
      }
      setLoading(false);
    }
    loadVerification();
  }, [id]);

  const handleViewRecord = () => {
    if (id) {
      navigate(`/record/${id}`);
    }
  };

  const currentMedia = activeMedia || { url: defaultMediaUrl, type: "video" };
  const isVideo = currentMedia.type === "video" || currentMedia.url.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">

      {/* Loading Animation Layer */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center bg-black transition-opacity duration-1000",
          loading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <span className="font-logo text-4xl font-semibold tracking-tight text-white mb-8 animate-pulse">ink.</span>
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        <p className="mt-4 text-white/50 text-sm font-medium tracking-wide">VERIFYING AUTHENTICITY...</p>
      </div>

      {/* Error Layer */}
      {errorMsg && !loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black p-6 text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">Verification Failed</h2>
            <p className="text-white/70 mb-6">{errorMsg}</p>
        </div>
      )}

      {/* Media Layer (Crossfades in after loading) */}
      {!errorMsg && (
      <div
        className={cn(
          "absolute inset-0 z-0 flex flex-col items-center justify-center bg-black transition-opacity duration-1000",
          !loading ? "opacity-100" : "opacity-0"
        )}
      >
        {isVideo ? (
           <video
             key={currentMedia.url}
             src={currentMedia.url}
             className="w-full h-full object-cover opacity-80"
             autoPlay
             loop
             muted
             playsInline
             onError={() => {
                 console.error("[ConsumerTap] Primary media failed to load. Falling back...");
                 setActiveMedia({ url: defaultMediaUrl, type: "video" });
             }}
           />
        ) : (
           <img 
             key={currentMedia.url}
             src={currentMedia.url}
             className="w-full h-full object-cover opacity-80"
             alt="Merchant Brand"
             onError={() => {
                 console.error("[ConsumerTap] Primary media failed to load. Falling back...");
                 setActiveMedia({ url: defaultMediaUrl, type: "video" });
             }}
           />
        )}

        {/* Overlay UI */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white shadow-black drop-shadow-md">Authentic Product</h1>
              <p className="text-white/80 text-sm">Verified directly from source.</p>
            </div>
          </div>

          {/* ← onClick added here */}
          <button
            onClick={handleViewRecord}
            className="w-full py-4 mt-2 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 active:scale-[0.98] transition-all"
          >
            View Complete Delivery Record
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

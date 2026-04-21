import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { verifyTag } from "../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const BUMPER_MIN_MS = 1500; // Minimum bumper display time (prevents flicker on fast connections)
const DEFAULT_BUMPER_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";

// ─── Bumper Component ──────────────────────────────────────────────────────────
// The ink. branded loading animation that plays INSTANTLY on tag tap, zero network delay.
function InkBumper({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-700",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* ink. Logo */}
      <span
        className="font-logo text-5xl font-semibold tracking-tight text-white mb-10"
        style={{ fontFamily: "serif", letterSpacing: "-0.05em" }}
      >
        ink.
      </span>

      {/* Animated Ring */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div
          className="absolute inset-0 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin"
          style={{ animationDuration: "900ms" }}
        />
        <div
          className="absolute inset-2 rounded-full border border-t-white/40 border-r-transparent border-b-transparent border-l-transparent animate-spin"
          style={{ animationDuration: "1400ms", animationDirection: "reverse" }}
        />
      </div>

      <p className="mt-8 text-white/40 text-xs font-medium tracking-[0.2em] uppercase">
        Verifying Authenticity
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsumerTap() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── State ──
  const [showBumper, setShowBumper] = useState(true);      // Controls bumper visibility
  const [showMedia, setShowMedia] = useState(false);        // Controls merchant media visibility
  const [merchantMedia, setMerchantMedia] = useState<any>(null); // Merchant video/image from API
  const [errorMsg, setErrorMsg] = useState("");


  // ── Refs ──
  const bumperStartTime = useRef(Date.now());               // When the bumper started
  const apiDone = useRef(false);                            // Has the API responded?
  const minTimeDone = useRef(false);                        // Has 1.5s passed?

  // ── Crossfade Logic ──
  // Both conditions must be true before we fade out the bumper
  const tryTransition = () => {
    if (apiDone.current && minTimeDone.current && !errorMsg) {
      setShowBumper(false);
      // Small delay so the bumper fade-out starts before media fades in
      setTimeout(() => setShowMedia(true), 300);
    }
  };

  useEffect(() => {
    if (!id) {
      setErrorMsg("Invalid Tag ID");
      setShowBumper(false);
      return;
    }

    // ── Timer: 1.5s minimum bumper floor ──
    const elapsed = Date.now() - bumperStartTime.current;
    const remaining = Math.max(0, BUMPER_MIN_MS - elapsed);
    const minTimer = setTimeout(() => {
      minTimeDone.current = true;
      tryTransition();
    }, remaining);

    // ── API: Fire /verify in parallel ──
    let gps = { lat: 0, lng: 0 };

    const runVerification = async () => {
      // Try GPS (non-blocking, short timeout)
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 0,
            enableHighAccuracy: true,
          })
        );
        gps.lat = pos.coords.latitude;
        gps.lng = pos.coords.longitude;
      } catch {
        // GPS denied or timed out — continue without it
      }

      const { data, error } = await verifyTag(id, gps.lat, gps.lng);

      if (error) {
        setErrorMsg(error.message || "Verification failed");
        setShowBumper(false);
        return;
      }



      // Determine which media to show
      if (data?.merchant_media && data.merchant_media.length > 0) {
        setMerchantMedia(data.merchant_media[0]);
      } else if (data?.photo_urls && data.photo_urls.length > 0) {
        const firstUrl = data.photo_urls[0];
        const isVid = /\.(mp4|webm|ogg)$/i.test(firstUrl);
        setMerchantMedia({ url: firstUrl, type: isVid ? "video" : "image" });
      } else {
        // No merchant media — use default bumper video as the "end state"
        setMerchantMedia({ url: DEFAULT_BUMPER_URL, type: "video" });
      }

      apiDone.current = true;
      tryTransition();
    };

    runVerification();

    return () => clearTimeout(minTimer);
  }, [id]);

  // ── Render ──
  const media = merchantMedia;
  const isVideo = media?.type === "video" || /\.(mp4|webm|ogg)$/i.test(media?.url || "");

  const handleViewRecord = () => {
    if (id) navigate(`/record/${id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">

      {/* ── Layer 1: Bumper (always on top, fades out) ── */}
      <InkBumper visible={showBumper} />

      {/* ── Layer 2: Error ── */}
      {errorMsg && !showBumper && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Verification Failed</h2>
          <p className="text-white/60 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* ── Layer 3: Merchant media (crossfades in) ── */}
      {!errorMsg && media && (
        <div
          className={cn(
            "absolute inset-0 z-0 transition-opacity duration-700",
            showMedia ? "opacity-100" : "opacity-0"
          )}
        >
          {isVideo ? (
            <video
              key={media.url}
              src={media.url}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              onError={() => setMerchantMedia({ url: DEFAULT_BUMPER_URL, type: "video" })}
            />
          ) : (
            <img
              key={media.url}
              src={media.url}
              className="w-full h-full object-cover"
              alt="Merchant Brand"
              onError={() => setMerchantMedia({ url: DEFAULT_BUMPER_URL, type: "video" })}
            />
          )}

          {/* Gradient overlay + Action UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-8">
            {/* Verified badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Authentic Product</h1>
                <p className="text-white/70 text-sm">Verified directly from source.</p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleViewRecord}
              className="w-full py-4 bg-white text-black font-semibold rounded-full hover:bg-neutral-100 active:scale-[0.98] transition-all text-base"
            >
              View Complete Delivery Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

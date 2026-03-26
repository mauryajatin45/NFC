import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConsumerTap() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  // Hardcoded loading phase duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500); // 2.5 seconds fake load
    return () => clearTimeout(timer);
  }, []);

  // Test URL - A generic uncopyrighted video to simulate Alan's media URL
  const testMediaUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";

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

      {/* Media Layer (Crossfades in) */}
      <div 
        className={cn(
          "absolute inset-0 z-0 flex flex-col items-center justify-center bg-black transition-opacity duration-1000",
          !loading ? "opacity-100" : "opacity-0"
        )}
      >
        <video 
          src={testMediaUrl} 
          className="w-full h-full object-cover opacity-80"
          autoPlay 
          loop 
          muted 
          playsInline
        />
        
        {/* Overlay UI over the video */}
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
          
          <button className="w-full py-4 mt-2 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 active:scale-[0.98] transition-all">
            View Complete Delivery Record
          </button>
        </div>
      </div>
    </div>
  );
}

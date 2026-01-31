import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ProtectedVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  showWatermark?: boolean;
  watermarkText?: string;
}

const ProtectedVideoPlayer = ({
  src,
  poster,
  title,
  className,
  showWatermark = true,
  watermarkText,
}: ProtectedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Get watermark text (user email or custom)
  const displayWatermark = watermarkText || user?.email || "Protected Content";

  // Convert video URL to blob URL (makes direct download harder)
  useEffect(() => {
    const fetchVideoAsBlob = async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (error) {
        // Fallback to original URL if blob conversion fails
        console.warn("Could not create blob URL, using original:", error);
        setBlobUrl(src);
      }
    };

    if (src) {
      fetchVideoAsBlob();
    }

    return () => {
      if (blobUrl && blobUrl !== src) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src]);

  // Disable right-click on video element
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      return false;
    };

    if (video) {
      video.addEventListener("contextmenu", preventDefault);
      // Disable download via video controls (use setAttribute for broader compatibility)
      video.setAttribute("controlsList", "nodownload noplaybackrate");
    }

    if (container) {
      container.addEventListener("contextmenu", preventDefault);
    }

    return () => {
      if (video) {
        video.removeEventListener("contextmenu", preventDefault);
      }
      if (container) {
        container.removeEventListener("contextmenu", preventDefault);
      }
    };
  }, []);

  // Detect and handle visibility change (pause when tab not visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) {
        videoRef.current.pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-black select-none",
        className
      )}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={blobUrl || src}
        poster={poster}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
        style={{ pointerEvents: "auto" }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Watermark Overlay */}
      {showWatermark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Multiple watermarks for coverage */}
          <div className="absolute top-4 left-4 text-white/20 text-sm font-medium select-none">
            {displayWatermark}
          </div>
          <div className="absolute top-4 right-4 text-white/20 text-sm font-medium select-none">
            {displayWatermark}
          </div>
          <div className="absolute bottom-4 left-4 text-white/20 text-sm font-medium select-none">
            {displayWatermark}
          </div>
          <div className="absolute bottom-4 right-4 text-white/20 text-sm font-medium select-none">
            {displayWatermark}
          </div>
          {/* Center watermark (diagonal) */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/10 text-2xl font-bold select-none whitespace-nowrap"
            style={{ transform: "translate(-50%, -50%) rotate(-30deg)" }}
          >
            {displayWatermark}
          </div>
        </div>
      )}

      {/* Invisible overlay to prevent screenshot tools from easily capturing clean video */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          background: "transparent",
          mixBlendMode: "overlay"
        }} 
      />

      {/* Title overlay */}
      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 pointer-events-none">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default ProtectedVideoPlayer;

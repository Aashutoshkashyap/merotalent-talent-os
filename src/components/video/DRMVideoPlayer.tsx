/**
 * DRM Video Player Component
 * 
 * This component is prepared for integration with DRM video services.
 * For true content protection, you'll need to use a third-party DRM service:
 * 
 * Recommended Services for South Asia:
 * 
 * 1. VdoCipher (https://www.vdocipher.com/)
 *    - Hollywood-grade DRM (Widevine + FairPlay)
 *    - Popular in India/Nepal
 *    - Starts at ~$99/month
 *    - Easy integration with React
 * 
 * 2. Brightcove (https://www.brightcove.com/)
 *    - Enterprise-grade solution
 *    - Best for large-scale platforms
 *    - Custom pricing
 * 
 * 3. Mux (https://mux.com/)
 *    - Developer-friendly API
 *    - Pay-as-you-go pricing
 *    - Easy integration
 * 
 * 4. Sproutvideo (https://sproutvideo.com/)
 *    - Affordable option
 *    - Good for startups
 * 
 * Integration Steps:
 * 1. Sign up for a DRM service
 * 2. Upload videos to their platform
 * 3. Get embed codes or API credentials
 * 4. Update this component with their player SDK
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, ExternalLink } from "lucide-react";

interface DRMVideoPlayerProps {
  // VdoCipher specific props
  vdoCipherVideoId?: string;
  vdoCipherOtp?: string;
  vdoCipherPlaybackInfo?: string;
  
  // Generic DRM props
  drmProvider?: "vdocipher" | "brightcove" | "mux" | "custom";
  embedCode?: string;
  fallbackUrl?: string;
  
  // Common props
  title?: string;
  className?: string;
}

const DRMVideoPlayer = ({
  vdoCipherVideoId,
  vdoCipherOtp,
  vdoCipherPlaybackInfo,
  drmProvider = "vdocipher",
  embedCode,
  fallbackUrl,
  title,
  className,
}: DRMVideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if DRM is configured
    const hasVdoCipher = !!(vdoCipherVideoId && vdoCipherOtp && vdoCipherPlaybackInfo);
    const hasEmbed = !!embedCode;
    setIsConfigured(hasVdoCipher || hasEmbed);
  }, [vdoCipherVideoId, vdoCipherOtp, vdoCipherPlaybackInfo, embedCode]);

  // VdoCipher Integration (uncomment when ready)
  /*
  useEffect(() => {
    if (drmProvider === "vdocipher" && vdoCipherVideoId && vdoCipherOtp && vdoCipherPlaybackInfo) {
      // Load VdoCipher player script
      const script = document.createElement("script");
      script.src = "https://player.vdocipher.com/v2/api.js";
      script.async = true;
      script.onload = () => {
        // Initialize player
        if (window.VdoPlayer && containerRef.current) {
          new window.VdoPlayer({
            otp: vdoCipherOtp,
            playbackInfo: vdoCipherPlaybackInfo,
            theme: "9ae8bbe8dd964ddc9bdb932cca1cb59a",
            container: containerRef.current,
          });
        }
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [vdoCipherVideoId, vdoCipherOtp, vdoCipherPlaybackInfo, drmProvider]);
  */

  // If DRM is not configured, show setup instructions
  if (!isConfigured) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">DRM Protection Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For Hollywood-grade video protection with screen recording prevention, 
                integrate with a DRM service.
              </p>
            </div>
            
            <div className="grid gap-3 text-left bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Recommended DRM Services:
              </h4>
              <div className="space-y-2 text-sm">
                <a 
                  href="https://www.vdocipher.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-background transition-colors"
                >
                  <span><strong>VdoCipher</strong> - Best for South Asia (~$99/mo)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a 
                  href="https://mux.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-background transition-colors"
                >
                  <span><strong>Mux</strong> - Developer-friendly (Pay-as-you-go)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a 
                  href="https://www.brightcove.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-background transition-colors"
                >
                  <span><strong>Brightcove</strong> - Enterprise-grade</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {fallbackUrl && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Meanwhile, using basic protection:
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
                    Watch with Basic Protection
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render embed code if provided
  if (embedCode) {
    return (
      <div 
        ref={containerRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: embedCode }}
      />
    );
  }

  // DRM Player container
  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ minHeight: "360px" }}
    >
      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 pointer-events-none z-10">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default DRMVideoPlayer;

// Type declaration for VdoCipher (add to global.d.ts if using)
declare global {
  interface Window {
    VdoPlayer?: new (config: {
      otp: string;
      playbackInfo: string;
      theme?: string;
      container: HTMLElement;
    }) => void;
  }
}

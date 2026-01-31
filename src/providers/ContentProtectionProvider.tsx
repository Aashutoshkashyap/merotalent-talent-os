import { createContext, useContext, ReactNode } from "react";
import { useContentProtection } from "@/hooks/useContentProtection";
import { useToast } from "@/hooks/use-toast";

interface ContentProtectionContextType {
  isProtected: boolean;
}

const ContentProtectionContext = createContext<ContentProtectionContextType>({
  isProtected: false,
});

export const useContentProtectionContext = () => useContext(ContentProtectionContext);

interface ContentProtectionProviderProps {
  children: ReactNode;
  enabled?: boolean;
  showWarnings?: boolean;
}

/**
 * Content Protection Provider
 * 
 * Wrap your protected content (e.g., course pages, video pages) with this provider
 * to enable content protection features.
 * 
 * Features enabled:
 * - Disabled right-click context menu
 * - Blocked DevTools shortcuts (F12, Ctrl+Shift+I, etc.)
 * - Blocked save/print shortcuts (Ctrl+S, Ctrl+P)
 * - DevTools detection (basic)
 * 
 * IMPORTANT LIMITATIONS:
 * - Cannot block OS-level screenshots (PrintScreen, phone screenshots)
 * - Cannot block screen recording software
 * - Cannot block browser extensions
 * - All protections can be bypassed by determined users
 * 
 * For true protection, use DRM services like VdoCipher, Brightcove, or Mux.
 */
export const ContentProtectionProvider = ({
  children,
  enabled = true,
  showWarnings = true,
}: ContentProtectionProviderProps) => {
  const { toast } = useToast();

  const handleViolationAttempt = (type: string) => {
    if (showWarnings) {
      toast({
        variant: "destructive",
        title: "Action Blocked",
        description: "This content is protected. Unauthorized access attempts are logged.",
      });
    }
    
    // Log violation attempt (you could send this to your backend)
    console.warn(`Content protection violation: ${type}`, {
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  };

  useContentProtection({
    disableRightClick: enabled,
    disableDevTools: enabled,
    disableKeyboardShortcuts: enabled,
    disableTextSelection: false, // Keep text selection for accessibility
    onViolationAttempt: handleViolationAttempt,
  });

  return (
    <ContentProtectionContext.Provider value={{ isProtected: enabled }}>
      {children}
    </ContentProtectionContext.Provider>
  );
};

export default ContentProtectionProvider;

import { useEffect, useCallback } from "react";

interface ContentProtectionOptions {
  disableRightClick?: boolean;
  disableDevTools?: boolean;
  disableTextSelection?: boolean;
  disableKeyboardShortcuts?: boolean;
  onViolationAttempt?: (type: string) => void;
}

export const useContentProtection = (options: ContentProtectionOptions = {}) => {
  const {
    disableRightClick = true,
    disableDevTools = true,
    disableTextSelection = false,
    disableKeyboardShortcuts = true,
    onViolationAttempt,
  } = options;

  const handleViolation = useCallback(
    (type: string) => {
      console.warn(`Content protection: ${type} attempt detected`);
      onViolationAttempt?.(type);
    },
    [onViolationAttempt]
  );

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      if (disableRightClick) {
        e.preventDefault();
        handleViolation("right-click");
        return false;
      }
    };

    // Disable keyboard shortcuts for DevTools and view-source
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!disableKeyboardShortcuts) return;

      const key = e.key.toLowerCase();

      // F12 - DevTools
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("F12");
        return false;
      }

      // Ctrl+Shift+I - DevTools
      if (e.ctrlKey && e.shiftKey && key === "i") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Ctrl+Shift+I");
        return false;
      }

      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && key === "j") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Ctrl+Shift+J");
        return false;
      }

      // Ctrl+Shift+C - Element picker
      if (e.ctrlKey && e.shiftKey && key === "c") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Ctrl+Shift+C");
        return false;
      }

      // Ctrl+U - View source
      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Ctrl+U");
        return false;
      }

      // Ctrl+S - Save page
      if (e.ctrlKey && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Ctrl+S");
        return false;
      }

      // Ctrl+P - Print (can be used to save as PDF)
      if (e.ctrlKey && key === "p") {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Ctrl+P");
        return false;
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true);

    // Disable text selection if requested
    if (disableTextSelection) {
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (disableTextSelection) {
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
      }
    };
  }, [
    disableRightClick,
    disableDevTools,
    disableTextSelection,
    disableKeyboardShortcuts,
    handleViolation,
  ]);
};

export default useContentProtection;

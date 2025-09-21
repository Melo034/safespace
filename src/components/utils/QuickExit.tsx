import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

/**
 * Site-wide Quick Exit button for sensitive views.
 * Renders a small fixed button that replaces the current page with a neutral site.
 */
export default function QuickExit() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const isSensitive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    // Treat these routes as sensitive by default
    return (
      p.startsWith("/stories") ||
      p.startsWith("/support") ||
      p.startsWith("/report")
    );
  }, [location.pathname]);

  useEffect(() => {
    setVisible(isSensitive);
  }, [isSensitive]);

  if (!visible) return null;

  const handleQuickExit = () => {
    try {
      // Replace history so back button doesn't return
      window.location.replace("https://www.google.com");
    } catch {
      window.location.href = "https://www.google.com";
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-3 right-3 z-[60] print:hidden"
    >
      <Button
        size="sm"
        variant="destructive"
        onClick={handleQuickExit}
        aria-label="Quick Exit"
      >
        <XCircle className="h-4 w-4 mr-1" /> Quick Exit
      </Button>
    </div>
  );
}


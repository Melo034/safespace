import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, LifeBuoy } from "lucide-react";

export default function StickyGetHelpBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-background/90 backdrop-blur border-t p-3 sm:hidden">
      <div className="mx-auto max-w-md grid grid-cols-2 gap-2">
        <Button asChild>
          <Link to="/report" className="inline-flex items-center justify-center"><FileText className="h-4 w-4 mr-2"/>Report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/support" className="inline-flex items-center justify-center"><LifeBuoy className="h-4 w-4 mr-2"/>Support</Link>
        </Button>
      </div>
    </div>
  );
}


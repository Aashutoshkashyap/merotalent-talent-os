import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { OperationsPage } from "./OperationsUI";

const AdminLMS = () => {
  return (
    <OperationsPage>
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0073e6]">
          <ExternalLink className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-950 font-display">Partner Course Platform</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Course content delivery and management has moved directly to the dedicated learning portal at <strong className="text-slate-800">learn.merotalent.com</strong>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="rounded-xl bg-[#0073e6] px-6 text-white hover:bg-[#0062c4]">
            <a href="https://learn.merotalent.com" target="_blank" rel="noopener noreferrer">
              Open Learning Platform <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl">
            <Link to="/admin">Back to Overview</Link>
          </Button>
        </div>
      </div>
    </OperationsPage>
  );
};

export default AdminLMS;

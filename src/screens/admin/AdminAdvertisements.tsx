import { OperationsPage } from "./OperationsUI";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Rocket, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminAdvertisements() {
  return (
    <OperationsPage>
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-3xl mx-auto space-y-6">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center shadow-lg border border-amber-200 animate-bounce">
          <Megaphone className="w-10 h-10 text-amber-600" />
        </div>

        <div className="space-y-3">
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-xs px-3.5 py-1">
            <Rocket className="w-3.5 h-3.5 mr-1.5 inline" />
            Module Marked Coming Soon
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Ad Campaign & Sponsor Banners Manager
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto font-medium">
            The automated self-serve advertisement network, sponsor bidding portal, and homepage hero banner rotator is scheduled for release in Q3 2026.
          </p>
        </div>

        <Card className="w-full border-slate-200/80 shadow-md rounded-3xl p-6 bg-white text-left space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Planned Ad Manager Features:
          </h3>
          <ul className="grid sm:grid-cols-2 gap-3 text-xs text-slate-700 font-semibold">
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Homepage hero & sidebar banner slots</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Real-time impression & click analytics</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Self-serve partner campaign submission</span>
            </li>
            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Automated expiry & schedule toggles</span>
            </li>
          </ul>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" asChild className="rounded-xl font-bold text-xs">
            <Link to="/admin">Return to Admin Overview</Link>
          </Button>
          <Button asChild className="bg-[#071a3d] hover:bg-[#05132d] text-white rounded-xl font-bold text-xs">
            <Link to="/admin/featured">
              Manage Featured Items
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </OperationsPage>
  );
}

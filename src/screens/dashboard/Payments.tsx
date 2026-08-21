import { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Zap,
  ArrowRight,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServicePackage {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const PACKAGES: ServicePackage[] = [
  {
    id: "mentor-pass",
    name: "1-on-1 Mentorship Pass",
    price: "NRs. 1,499",
    period: "Per Month",
    description: "Unlimited monthly 1-on-1 30-minute booking sessions with top industry mentors.",
    features: ["3 Direct Mentor Calls / Mo", "1-on-1 Resume Review", "Priority Chat Access"],
    popular: true,
  },
  {
    id: "job-fasttrack",
    name: "Premium Job Fast-Track",
    price: "NRs. 999",
    period: "3 Months",
    description: "Get highlighted application badges and direct recruiter inbox delivery.",
    features: ["Featured Applicant Badge", "Direct HR WhatsApp Line", "Exclusive Job Alerts"],
  },
  {
    id: "hackathon-pro",
    name: "Hackathon & Event Pass",
    price: "NRs. 499",
    period: "Single Event",
    description: "VIP access pass to national hackathons, workshops, and skill contests.",
    features: ["VIP Hackathon Entry", "Workshop Certificate", "Mentorship Speed-Dating"],
  },
];

interface UserSubscription {
  id: string;
  packageId: string;
  name: string;
  status: "active" | "expired";
  expiresAt: string;
  price: string;
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofImage, setProofImage] = useState("");
  const [proofPdf, setProofPdf] = useState("");

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([
    {
      id: "sub-101",
      packageId: "mentor-pass",
      name: "1-on-1 Mentorship Pass",
      status: "expired",
      expiresAt: "2026-07-15",
      price: "NRs. 1,499",
    },
  ]);

  const handleOpenPay = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setIsPayModalOpen(true);
  };

  const handleRenewSubscription = (sub: UserSubscription) => {
    setIsProcessing(true);
    setTimeout(() => {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                status: "active",
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
              }
            : s
        )
      );
      setIsProcessing(false);
      toast({
        title: "Subscription Renewed!",
        description: `Your ${sub.name} subscription has been extended for another month.`,
      });
    }, 1000);
  };

  const handleConfirmPayment = () => {
    if (!selectedPackage) return;
    setIsProcessing(true);
    setTimeout(() => {
      const existing = subscriptions.find((s) => s.packageId === selectedPackage.id);
      if (existing) {
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  status: "active",
                  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
                }
              : s
          )
        );
      } else {
        setSubscriptions((prev) => [
          ...prev,
          {
            id: `sub-${Date.now()}`,
            packageId: selectedPackage.id,
            name: selectedPackage.name,
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            price: selectedPackage.price,
          },
        ]);
      }
      setIsProcessing(false);
      setIsPayModalOpen(false);
      toast({
        title: "Payment Confirmed!",
        description: `Your subscription to ${selectedPackage.name} is now active.`,
      });
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0073e6] uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            Billing & Subscriptions
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments & Service Plans</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            Manage your service subscriptions, renew expired plans, and track billing history.
          </p>
        </div>
      </div>

      {/* Active / Expired Subscriptions Banner */}
      {subscriptions.length > 0 && (
        <Card className="border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  Your Active & Past Subscriptions
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Renew past subscriptions directly without creating duplicate account sessions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                      sub.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {sub.status === "active" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{sub.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      {sub.status === "active"
                        ? `Active until ${sub.expiresAt}`
                        : `Expired on ${sub.expiresAt} · Repay to continue`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-900">{sub.price}</span>
                  {sub.status === "expired" ? (
                    <Button
                      onClick={() => handleRenewSubscription(sub)}
                      disabled={isProcessing}
                      className="bg-[#0073e6] hover:bg-[#0062c4] text-white text-xs font-extrabold rounded-xl px-4 py-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Renew Subscription
                    </Button>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border-none px-3 py-1">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Available Service Packages</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${
                pkg.popular ? "border-[#0073e6] ring-2 ring-[#0073e6]/20 shadow-md" : "border-slate-200/80 shadow-2xs"
              }`}
            >
              <CardHeader className="p-6 pb-2">
                {pkg.popular && (
                  <Badge className="w-fit bg-[#0073e6] text-white text-[10px] font-extrabold uppercase mb-2">
                    Most Popular
                  </Badge>
                )}
                <CardTitle className="text-xl font-black text-slate-900">{pkg.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-black text-slate-900">{pkg.price}</span>
                  <span className="text-xs font-bold text-slate-400">/ {pkg.period}</span>
                </div>
                <CardDescription className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                  {pkg.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-2 space-y-4">
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {pkg.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleOpenPay(pkg)}
                  className="w-full bg-[#071a3d] hover:bg-[#05132d] text-white text-xs font-extrabold rounded-xl py-2.5"
                >
                  Select & Subscribe
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pay Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Subscribe to {selectedPackage?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-semibold">
              Total Amount: <span className="font-bold text-slate-900">{selectedPackage?.price}</span> ({selectedPackage?.period})
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 font-medium">
              <p className="font-bold text-slate-900">Supported Direct Payment Options:</p>
              <p className="text-slate-600">
                eSewa (9801000000) / Khalti / Fonepay QR / ConnectIPS Bank Transfer.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Payment Screenshot / Image URL *</label>
              <input
                type="text"
                placeholder="Paste eSewa/Khalti screenshot image URL or Supabase storage link..."
                value={proofImage}
                onChange={(e) => setProofImage(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-slate-200 px-3 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Transaction Voucher PDF / Reference Code</label>
              <input
                type="text"
                placeholder="e.g. TXN-99882211 or PDF URL..."
                value={proofPdf}
                onChange={(e) => setProofPdf(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-slate-200 px-3 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)} className="text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="bg-[#0073e6] hover:bg-[#0062c4] text-white text-xs font-extrabold rounded-xl px-6"
            >
              {isProcessing ? "Submitting..." : "Submit Payment & Proof"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

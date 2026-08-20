import React from "react";
import { Clock, ShieldAlert, LogOut, Mail, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export default function PendingApproval() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Account Under Review
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pending Superadmin Approval
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
            Welcome, <span className="text-slate-800 font-bold">{profile?.full_name || profile?.email}</span>! Your request for workspace access is being reviewed by MeroTalent Superadmin.
          </p>
        </div>

        <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Verification Status:</span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-normal pl-6">
            Organizational & mentor accounts require manual verification to ensure platform quality and security. You will receive access once approved.
          </p>
        </div>

        <div className="w-full space-y-3 pt-2">
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0073e6]" />
              support@merotalent.com
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#0073e6]" />
              +977-9801010802
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link
              to="/"
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all text-center"
            >
              Back to Home
            </Link>
            <button
              onClick={signOut}
              className="flex-1 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

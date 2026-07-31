"use client";

import React, { useState } from "react";
import SidebarNav from "@/components/landing/SidebarNav";
import HeaderNav from "@/components/landing/HeaderNav";
import Footer from "@/components/landing/Footer";

interface PublicPageLayoutProps {
  children: React.ReactNode;
  activeNavId?: string;
}

/**
 * Shared layout for all public-facing pages. 
 * Includes the SidebarNav (collapsed/expandable on hover), HeaderNav, and Footer.
 */
export default function PublicPageLayout({ children, activeNavId = "home" }: PublicPageLayoutProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex overflow-x-hidden">
      {/* Sidebar */}
      <SidebarNav
        activeRole="talent"
        activeNavId={activeNavId}
        onHoverChange={setIsSidebarExpanded}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: isSidebarExpanded ? "292px" : "72px" }}
      >
        <HeaderNav />

        <main className="flex-1 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}

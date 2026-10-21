"use client";

import React, { useState } from "react";
import SidebarNav from "@/components/landing/SidebarNav";
import HeaderNav from "@/components/landing/HeaderNav";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";

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
    <div className="flex min-h-screen overflow-x-clip bg-white font-sans text-slate-900">
      {/* The role rail is a desktop navigation aid. On phones it used to consume
          72px of the viewport, which left the public pages unnecessarily narrow. */}
      <div className="hidden lg:block">
        <SidebarNav
          activeRole="talent"
          activeNavId={activeNavId}
          onHoverChange={setIsSidebarExpanded}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out lg:ml-[72px]",
          isSidebarExpanded && "lg:ml-[292px]",
        )}
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

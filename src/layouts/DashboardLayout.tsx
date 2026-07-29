import { useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f1dfd0] text-[#19172b]"
      style={
        {
          "--background": "28 100% 98%",
          "--foreground": "244 30% 13%",
          "--card": "0 0% 100%",
          "--card-foreground": "244 30% 13%",
          "--muted": "26 55% 96%",
          "--muted-foreground": "244 10% 44%",
          "--border": "27 34% 89%",
          "--input": "27 34% 89%",
          "--primary": "20 90% 40%",
          "--secondary": "160 52% 64%",
          "--accent": "160 52% 64%",
        } as CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-28 top-28 h-72 w-72 rounded-full border border-white/80" />
        <div className="absolute -right-24 top-1/3 h-56 w-56 rounded-full border border-white/75" />
        <div className="absolute left-1/4 top-0 h-px w-[46rem] -rotate-12 bg-white/80" />
        <div className="absolute bottom-16 right-1/4 h-px w-[34rem] rotate-12 bg-white/80" />
        <span className="absolute left-[7%] top-[18%] h-2.5 w-2.5 rounded-full bg-[#68c9ad]" />
        <span className="absolute bottom-[8%] right-[7%] h-3 w-3 rounded-full bg-[#c2410c]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1720px] gap-3 p-0 md:gap-4 md:p-4 lg:gap-5 lg:p-6">
        <div className="hidden md:block">
          <DashboardSidebar compact />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[292px] border-none bg-transparent p-3 shadow-none"
          >
            <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fffaf6] shadow-[0_28px_80px_rgba(69,42,20,0.12)] md:rounded-[32px] md:border md:border-white/90">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto px-4 pb-8 pt-2 sm:px-5 md:px-6 md:pb-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1440px]">
              <Outlet />
            </div>
          </main>
        </section>
      </div>
    </div>
  );
};

export default DashboardLayout;

import { useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen w-full overflow-hidden bg-white text-[#19172b]"
      style={
        {
          "--background": "0 0% 100%",
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
      <div className="flex min-h-screen w-full">
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

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto px-4 pb-8 pt-2 sm:px-5 md:px-6 md:pb-6 lg:px-8">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </section>
      </div>
    </div>
  );
};

export default DashboardLayout;

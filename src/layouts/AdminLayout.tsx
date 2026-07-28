import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#d9d9ec] p-0 lg:p-5 xl:p-7">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-70" viewBox="0 0 1600 1000" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-80 310C210 125 385 450 665 215C930 -8 1160 260 1700 65" stroke="white" strokeWidth="2" />
        <path d="M420 1080C580 790 820 1010 980 760C1110 555 1390 785 1690 565" stroke="white" strokeWidth="2" />
        <circle cx="78" cy="185" r="7" stroke="#6c63ed" />
        <circle cx="1490" cy="810" r="7" fill="#6c63ed" />
        <circle cx="1375" cy="78" r="4" fill="#64c9aa" />
      </svg>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] overflow-hidden bg-[#f8f8fc] shadow-[0_30px_90px_rgba(42,39,90,0.18)] lg:min-h-[calc(100vh-2.5rem)] lg:rounded-[30px] lg:border lg:border-white/80 xl:min-h-[calc(100vh-3.5rem)]">
        <div className="hidden shrink-0 border-r border-[#ecebf3] lg:block">
          <AdminSidebar compact />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[272px] border-0 p-0">
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

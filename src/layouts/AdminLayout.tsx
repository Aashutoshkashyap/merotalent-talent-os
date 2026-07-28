import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#e9e9f6] p-0 lg:p-4 xl:p-5">
      <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-hidden bg-[#f8f8fc] shadow-[0_30px_80px_rgba(42,39,90,0.14)] lg:min-h-[calc(100vh-2rem)] lg:rounded-[28px] lg:border lg:border-white/70 xl:min-h-[calc(100vh-2.5rem)]">
        <div className="hidden shrink-0 border-r border-[#ecebf3] lg:block">
          <AdminSidebar />
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

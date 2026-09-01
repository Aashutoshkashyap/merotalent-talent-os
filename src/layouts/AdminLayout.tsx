import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const scrollWorkspaceToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [reduceMotion]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollWorkspaceToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search, scrollWorkspaceToTop]);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-white">
      <div className="min-h-[100dvh] w-full bg-white">
        <div className="fixed inset-y-0 left-0 z-40 hidden w-[84px] border-r border-[#173769] bg-[#071a3d] lg:block xl:hidden">
          <AdminSidebar
            compact
            motionScope="desktop-compact"
            onNavigate={scrollWorkspaceToTop}
          />
        </div>

        <div className="fixed inset-y-0 left-0 z-40 hidden w-[288px] border-r border-[#173769] bg-[#071a3d] xl:block">
          <AdminSidebar
            motionScope="desktop-expanded"
            onNavigate={scrollWorkspaceToTop}
          />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[288px] border-0 bg-[#071a3d] p-0 text-white [&>button]:right-3 [&>button]:top-4 [&>button]:grid [&>button]:h-10 [&>button]:w-10 [&>button]:place-items-center [&>button]:rounded-xl [&>button]:text-[#bfdbfe] [&>button]:ring-offset-[#071a3d] [&>button:hover]:bg-white/10 [&>button:hover]:text-white"
          >
            <AdminSidebar
              motionScope="mobile"
              onNavigate={() => {
                setSidebarOpen(false);
                scrollWorkspaceToTop();
              }}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-h-[100dvh] min-w-0 flex-col lg:pl-[84px] xl:pl-[288px]">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
          <main
            className="min-w-0 flex-1 scroll-smooth overflow-x-hidden p-4 sm:p-6 lg:p-7"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${location.pathname}${location.search}`}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
                }
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

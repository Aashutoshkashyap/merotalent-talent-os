import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const scrollWorkspaceToTop = useCallback(() => {
    mainRef.current?.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [reduceMotion]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollWorkspaceToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search, scrollWorkspaceToTop]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-white">
      <div className="h-full w-full overflow-hidden bg-white">
        <div className="fixed inset-y-0 left-0 z-40 hidden w-[84px] border-r border-[#eee7e1] bg-white lg:block">
          <AdminSidebar compact onNavigate={scrollWorkspaceToTop} />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[272px] border-0 p-0">
            <AdminSidebar
              onNavigate={() => {
                setSidebarOpen(false);
                scrollWorkspaceToTop();
              }}
            />
          </SheetContent>
        </Sheet>

        <div className="flex h-full min-w-0 flex-col lg:pl-[84px]">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
          <main
            ref={mainRef}
            className="min-h-0 flex-1 scroll-smooth overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-7"
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

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();

  const scrollMainToTop = useCallback(() => {
    mainScrollRef.current?.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  }, [shouldReduceMotion]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollMainToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, scrollMainToTop]);

  const handleSidebarNavigate = () => {
    scrollMainToTop();
    setSidebarOpen(false);
  };

  return (
    <div
      className="h-[100dvh] min-h-0 w-full overflow-hidden bg-white text-[#19172b]"
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
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="hidden h-[100dvh] w-[84px] shrink-0 md:block xl:hidden">
          <DashboardSidebar
            compact
            fixed
            motionScope="desktop-compact"
            onNavigate={handleSidebarNavigate}
          />
        </div>

        <div className="hidden h-[100dvh] w-[288px] shrink-0 xl:block">
          <DashboardSidebar
            fixed
            motionScope="desktop-expanded"
            onNavigate={handleSidebarNavigate}
          />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[288px] border-0 bg-[#071a3d] p-0 text-white [&>button]:right-3 [&>button]:top-4 [&>button]:grid [&>button]:h-10 [&>button]:w-10 [&>button]:place-items-center [&>button]:rounded-xl [&>button]:text-[#bfdbfe] [&>button]:ring-offset-[#071a3d] [&>button:hover]:bg-white/10 [&>button:hover]:text-white"
          >
            <DashboardSidebar
              motionScope="mobile"
              onNavigate={handleSidebarNavigate}
            />
          </SheetContent>
        </Sheet>

        <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
          <main
            ref={mainScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-4 pb-8 pt-2 sm:px-5 md:px-6 md:pb-6 lg:px-8"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="w-full"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -14 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </section>
      </div>
    </div>
  );
};

export default DashboardLayout;

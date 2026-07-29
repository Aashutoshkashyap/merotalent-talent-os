import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import DiscoveryHub from "@/components/landing/DiscoveryHub";
import RolePathways from "@/components/landing/RolePathways";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <DiscoveryHub />
        <RolePathways />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

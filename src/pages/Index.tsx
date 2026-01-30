import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import UserRoles from "@/components/landing/UserRoles";
import HowItWorks from "@/components/landing/HowItWorks";
import CompetitionPreview from "@/components/landing/CompetitionPreview";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <UserRoles />
        <HowItWorks />
        <CompetitionPreview />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

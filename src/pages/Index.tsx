import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import UserRoles from "@/components/landing/UserRoles";
import HowItWorks from "@/components/landing/HowItWorks";
import CompetitionPreview from "@/components/landing/CompetitionPreview";
import CourseCatalogue from "@/components/landing/CourseCatalogue";
import ContactForm from "@/components/landing/ContactForm";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import ChatBot from "@/components/chatbot/ChatBot";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CourseCatalogue />
        <UserRoles />
        <HowItWorks />
        <CompetitionPreview />
        <ContactForm />
        <CTA />
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;

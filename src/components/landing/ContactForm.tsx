"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const isNeonStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isNeonStaging) {
        const response = await fetch("/api/v1/neon-staging/contact-queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error("The inquiry could not be saved. Please try again.");
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.from("contact_queries").insert({
          ...formData,
          status: "pending",
        });
        if (error) throw error;
      }

      toast({
        title: "Message Sent!",
        description: `Thank you ${formData.name}, your inquiry has been received. Our team will contact you shortly.`,
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: error?.message || "Failed to submit query. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-6 sm:px-10 max-w-7xl mx-auto w-full font-sans bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Direct Info */}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-extrabold text-[#0073e6] uppercase tracking-widest">
              CONNECT WITH US
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">
              Connect with Our Help Desk & Support
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed mt-2 pr-6">
              Contact us to solve queries regarding courses, academic events, mentorship packages, or college partnerships. Share your requirements and our support team will get back to you within 24 hours.
            </p>
          </div>

          {/* Info Blocks (Location, Phone, Email) matching Pooja Medical style */}
          <div className="flex flex-col gap-4 max-w-md">
            {/* Block 1: Location */}
            <div className="flex items-center gap-5 p-5 rounded-3xl border border-slate-100 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-red-600">Our Location</span>
                <span className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                  Pulchowk, Lalitpur, Nepal
                </span>
              </div>
            </div>

            {/* Block 2: Phone */}
            <div className="flex items-center gap-5 p-5 rounded-3xl border border-slate-100 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-red-600">Phone Number</span>
                <span className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                  01-5551234, +977 9801234567
                </span>
              </div>
            </div>

            {/* Block 3: Email */}
            <div className="flex items-center gap-5 p-5 rounded-3xl border border-slate-100 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-red-600">Email Address</span>
                <span className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                  hello@merotalent.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Send Us A Message Card */}
        <div className="bg-gradient-to-br from-slate-50/50 to-rose-50/20 border border-slate-200/60 rounded-[32px] p-8 sm:p-10 shadow-lg flex flex-col gap-6">
          <div className="text-center">
            <h3 className="text-2xl font-black text-red-600">Send us a message</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-2 leading-relaxed">
              Fill out the form below and we will get back to you within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Row 1: Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4.5 py-3 text-xs sm:text-sm bg-white border border-slate-200 focus:border-red-500 rounded-xl outline-none transition-all focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4.5 py-3 text-xs sm:text-sm bg-white border border-slate-200 focus:border-red-500 rounded-xl outline-none transition-all focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="What's this about?"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4.5 py-3 text-xs sm:text-sm bg-white border border-slate-200 focus:border-red-500 rounded-xl outline-none transition-all focus:ring-4 focus:ring-red-100"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Your Message <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Type your message here..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4.5 py-3 text-xs sm:text-sm bg-white border border-slate-200 focus:border-red-500 rounded-xl outline-none transition-all focus:ring-4 focus:ring-red-100 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-center mt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-102 active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

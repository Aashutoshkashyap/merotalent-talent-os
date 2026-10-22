"use client";

import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Phone, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

import { useSiteCMS } from "@/hooks/useSiteCMS";
import { safeExternalUrl } from "@/lib/institutes/public-institutes";
import { MEROTALENT_BRAND as brand } from "@/lib/brand";

export default function Footer() {
  const { settings } = useSiteCMS();
  const email = settings.contact_email || settings.support_email;
  const phone = settings.contact_phone || settings.support_phone;
  const socialLinks = [
    { label: "Facebook", url: settings.facebook_url, Icon: Facebook },
    { label: "X / Twitter", url: settings.twitter_url, Icon: Twitter },
    { label: "LinkedIn", url: settings.linkedin_url, Icon: Linkedin },
    { label: "Instagram", url: settings.instagram_url, Icon: Instagram },
  ].map((item) => ({ ...item, href: safeExternalUrl(item.url) })).filter((item) => item.href);

  return (
    <footer className="w-full bg-white border-t border-slate-200/80 py-5 px-6 sm:px-10 lg:px-16 font-sans">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 pb-5 border-b border-slate-200/80">
          {/* Column 1: Brand Logo, Description & Social Icons */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src={settings.logo_url || brand.logo}
                alt={settings.site_title || brand.name}
                className="h-9 w-auto object-contain rounded-lg"
              />
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {settings.site_title ? settings.site_title.split(" - ")[0] : (
                  <>Mero<span className="text-[#071a3d]">Talent</span></>
                )}
              </span>
            </Link>

            <p className="text-sm text-slate-600 font-medium leading-relaxed pr-2">
              {settings.meta_description || "Nepal's premier talent ecosystem. Connecting students, graduates, and partners with top tech & engineering employers."}
            </p>

            {/* Social Icons Row */}
            {socialLinks.length > 0 && <div className="flex items-center gap-3 pt-2">
              {socialLinks.map(({ label, href, Icon }) => <a key={label} href={href!} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-9 h-9 rounded-full text-slate-700 hover:text-[#0073e6] hover:bg-blue-50 flex items-center justify-center transition-all border border-slate-200/80 shadow-2xs"><Icon className="w-4 h-4" /></a>)}
            </div>}
          </div>

          {/* Column 2: Contact Us */}
          <div className="flex flex-col gap-4">
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
              Contact Us
            </h4>
            <ul className="flex flex-col gap-4">
              {settings.contact_address && <li className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <MapPin className="w-5 h-5 text-[#0073e6] flex-shrink-0 mt-0.5" />
                <span>{settings.contact_address}</span>
              </li>}
              {email && <li className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Mail className="w-5 h-5 text-[#071a3d] flex-shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-[#071a3d] transition-colors">
                  {email}
                </a>
              </li>}
              {phone && <li className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Phone className="w-5 h-5 text-[#071a3d] flex-shrink-0" />
                <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hover:text-[#071a3d] transition-colors">
                  {phone}
                </a>
              </li>}
              {!email && !phone && !settings.contact_address && <li className="text-sm text-slate-600">Contact details will appear when configured by MeroTalent.</li>}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/terms" className="hover:text-[#0073e6] transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-[#0073e6] transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

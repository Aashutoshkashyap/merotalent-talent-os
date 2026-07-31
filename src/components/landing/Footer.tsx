"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, MapPin, Mail, Phone, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200/80 pt-12 pb-8 px-6 sm:px-10 lg:px-16 font-sans">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col justify-between min-h-[420px]">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14 pb-12 border-b border-slate-200/80">
          {/* Column 1: Brand Logo, Description & Social Icons */}
          <div className="flex flex-col gap-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0073e6] text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                Mero<span className="text-[#0073e6]">Talent</span>
              </span>
            </Link>

            <p className="text-sm text-slate-600 font-medium leading-relaxed pr-2">
              Nepal&apos;s premier engineering talent ecosystem. Connecting IOE, KU, PoU, and Pokhara University graduates with top tech & engineering employers.
            </p>

            {/* Social Icons Row */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full text-slate-700 hover:text-[#0073e6] hover:bg-blue-50 flex items-center justify-center transition-all border border-slate-200/80 shadow-2xs"
                title="Facebook"
              >
                <Facebook className="w-4 h-4 fill-slate-700 hover:fill-[#0073e6]" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full text-slate-700 hover:text-[#0073e6] hover:bg-blue-50 flex items-center justify-center transition-all border border-slate-200/80 shadow-2xs"
                title="Twitter"
              >
                <Twitter className="w-4 h-4 fill-slate-700 hover:fill-[#0073e6]" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full text-slate-700 hover:text-[#0073e6] hover:bg-blue-50 flex items-center justify-center transition-all border border-slate-200/80 shadow-2xs"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4 fill-slate-700 hover:fill-[#0073e6]" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full text-slate-700 hover:text-[#0073e6] hover:bg-blue-50 flex items-center justify-center transition-all border border-slate-200/80 shadow-2xs"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
              Quick Links
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  About MeroTalent
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Engineering Courses
                </Link>
              </li>
              <li>
                <Link to="/competitions" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  IOE & KU Hackathons
                </Link>
              </li>
              <li>
                <Link to="/mentorship" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Engineering Mentorship
                </Link>
              </li>
              <li>
                <Link to="/institutes" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Partner Colleges
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Nepal Tech Jobs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Our Services */}
          <div className="flex flex-col gap-4">
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
              Our Services
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/jobs" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Engineering Sourcing
                </Link>
              </li>
              <li>
                <Link to="/competitions" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Hackathon Hosting
                </Link>
              </li>
              <li>
                <Link to="/competitions" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  AI Skill Assessment
                </Link>
              </li>
              <li>
                <Link to="/mentorship" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Technical Mentorship
                </Link>
              </li>
              <li>
                <Link to="/institutes" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Campus Recruitment
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-sm font-semibold text-slate-600 hover:text-[#0073e6] transition-colors">
                  Code Evaluation
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div className="flex flex-col gap-4">
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
              Contact Us
            </h4>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <MapPin className="w-5 h-5 text-[#0073e6] flex-shrink-0 mt-0.5" />
                <span>123 Technology Park, Pulchowk, Lalitpur, Nepal</span>
              </li>
              <li className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Mail className="w-5 h-5 text-[#0073e6] flex-shrink-0" />
                <a href="mailto:hello@merotalent.com" className="hover:text-[#0073e6] transition-colors">
                  hello@merotalent.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Phone className="w-5 h-5 text-[#0073e6] flex-shrink-0" />
                <a href="tel:+97715551234" className="hover:text-[#0073e6] transition-colors">
                  +977 (1) 555-1234
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <p>© 2026 MeroTalent. All rights reserved. Made with care in Nepal.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/terms" className="hover:text-[#0073e6] transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-[#0073e6] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#0073e6] transition-colors">
              Cookie Policy
            </Link>
            <Link to="/sitemap" className="hover:text-[#0073e6] transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

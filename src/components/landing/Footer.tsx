import { Link } from "react-router-dom";
import { ArrowUpRight, Linkedin, Mail, Sparkles } from "lucide-react";

const columns = [
  {
    title: "Discover",
    links: [
      ["Jobs", "/jobs"],
      ["Competitions", "/competitions"],
      ["Courses", "/courses"],
      ["Mentorship", "/mentorship"],
    ],
  },
  {
    title: "Organizations",
    links: [
      ["Companies", "/signup?role=company"],
      ["Institutions", "/institutes"],
      ["Mentors", "/signup?role=mentor"],
      ["Admin", "/admin"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Join free", "/signup"],
      ["Log in", "/login"],
      ["Talent workspace", "/dashboard"],
      ["Help & contact", "mailto:hello@merotalent.com"],
    ],
  },
];

const Footer = () => (
  <footer className="bg-[#f4dfd4] px-3 pb-5 pt-6 sm:px-5 lg:px-8">
    <div className="mx-auto max-w-[1420px] rounded-[26px] border border-white/80 bg-[#fffdfb] px-5 py-10 shadow-[0_22px_55px_rgba(99,55,29,0.08)] sm:rounded-[32px] sm:px-7 lg:px-9">
      <div className="grid gap-10 lg:grid-cols-[1.35fr_2fr]">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#c2410c] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-xl font-bold text-[#1b1932]">
              Mero<span className="text-[#c2410c]">talent</span>
            </span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-[#777389]">
            A performance-first talent ecosystem built in Nepal for people ready to prove, grow and connect.
          </p>
          <div className="mt-5 flex gap-2">
            <a href="mailto:hello@merotalent.com" aria-label="Email Merotalent" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#c2410c] shadow-sm transition hover:-translate-y-0.5">
              <Mail className="h-4 w-4" />
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="Merotalent on LinkedIn" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#c2410c] shadow-sm transition hover:-translate-y-0.5">
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-bold text-[#2c2941]">{column.title}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("mailto:") ? (
                      <a href={href} className="text-xs text-[#777389] transition hover:text-[#c2410c]">{label}</a>
                    ) : (
                      <Link to={href} className="text-xs text-[#777389] transition hover:text-[#c2410c]">{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 border-t border-[#eee6e1] pt-6 text-[11px] text-[#999096] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Merotalent. Made with care in Nepal.</p>
        <div className="flex flex-wrap gap-5">
          <Link to="/privacy" className="hover:text-[#c2410c]">Privacy</Link>
          <Link to="/terms" className="hover:text-[#c2410c]">Terms</Link>
          <a href="mailto:hello@merotalent.com" className="flex items-center gap-1 hover:text-[#c2410c]">
            Contact <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

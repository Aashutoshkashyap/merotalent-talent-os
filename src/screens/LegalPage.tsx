import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ScrollText, ShieldCheck, Sparkles } from "lucide-react";

interface LegalPageProps {
  type: "privacy" | "terms";
}

const legalContent = {
  privacy: {
    title: "Privacy policy",
    intro:
      "This policy explains the information Merotalent uses to provide accounts, opportunity discovery, learning, mentorship and hiring workflows.",
    sections: [
      ["Information you provide", "Account details, profile information, skills, applications, learning activity and messages you choose to share."],
      ["How information is used", "To operate the platform, personalize discovery, protect accounts, improve services and communicate relevant updates."],
      ["Sharing and control", "Information is shared only with the organizations or people involved in actions you choose, or when required to keep the platform safe and lawful."],
      ["Your choices", "You may update profile data from your workspace and request account or data assistance through hello@merotalent.com."],
    ],
  },
  terms: {
    title: "Terms of use",
    intro:
      "These terms describe the shared expectations for using Merotalent as talent, mentor, company, institution or administrator.",
    sections: [
      ["Use the platform responsibly", "Provide accurate information, respect other members and do not misuse competitions, hiring, learning or messaging tools."],
      ["Your content", "You keep ownership of content you submit and allow Merotalent to display it as needed to provide the services you select."],
      ["Opportunities and decisions", "Organizations are responsible for their listings and decisions. Merotalent supports discovery but does not guarantee selection or outcomes."],
      ["Account protection", "Keep account credentials secure and contact hello@merotalent.com if you believe an account or listing is being misused."],
    ],
  },
};

const LegalPage = ({ type }: LegalPageProps) => {
  const content = legalContent[type];

  return (
    <main className="workspace-canvas grid min-h-screen place-items-center p-0 text-[#1b1932] sm:p-5 lg:p-8">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-70" viewBox="0 0 1500 900" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-100 300C190 120 410 430 690 190C930 -20 1190 260 1580 75" stroke="white" strokeWidth="2" />
        <circle cx="110" cy="720" r="7" fill="#66c7a8" />
        <circle cx="1370" cy="130" r="7" stroke="#c2410c" />
      </svg>

      <div className="workspace-shell z-10 grid w-full max-w-[1100px] lg:min-h-[700px] lg:grid-cols-[0.32fr_0.68fr]">
        <aside className="relative overflow-hidden bg-primary p-6 text-white sm:p-8 lg:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[36px] border-white/10" />
          <Link to="/" className="relative flex w-fit items-center gap-2.5 font-display text-lg font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            Merotalent
          </Link>

          <div className="relative mt-10 hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/60">Clear by design</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight">Trust belongs in the product.</h2>
            <p className="mt-3 text-xs leading-5 text-white/65">
              The essentials, written in plain language and kept in one calm workspace.
            </p>
          </div>

          <nav className="relative mt-7 grid grid-cols-2 gap-2 lg:mt-12 lg:grid-cols-1">
            <Link
              to="/privacy"
              className={`flex items-center gap-3 rounded-[15px] p-3 text-xs font-bold transition-colors ${
                type === "privacy" ? "bg-white text-[#17162e]" : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              <ShieldCheck className={`h-4 w-4 ${type === "privacy" ? "text-primary" : ""}`} />
              Privacy
            </Link>
            <Link
              to="/terms"
              className={`flex items-center gap-3 rounded-[15px] p-3 text-xs font-bold transition-colors ${
                type === "terms" ? "bg-white text-[#17162e]" : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              <ScrollText className={`h-4 w-4 ${type === "terms" ? "text-primary" : ""}`} />
              Terms
            </Link>
          </nav>

          <a href="mailto:hello@merotalent.com" className="relative mt-5 flex items-center gap-2 text-[10px] font-semibold text-white/70 lg:absolute lg:bottom-10 lg:left-10">
            <Mail className="h-3.5 w-3.5" /> hello@merotalent.com
          </a>
        </aside>

        <article className="bg-white p-6 sm:p-10 lg:p-12">
          <div className="flex items-center justify-between gap-4">
            <div className="workspace-kicker">
              <span className="workspace-dot" />
              Merotalent legal
            </div>
            <Link to="/" className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Back home
            </Link>
          </div>

          <h1 className="workspace-heading mt-5 text-4xl sm:text-5xl">{content.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#777389]">{content.intro}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {content.sections.map(([title, body], index) => (
              <section key={title} className="rounded-[20px] border border-[#eee7e1] bg-[#fbf9f7] p-5">
                <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#fff1e8] text-[10px] font-bold text-primary">
                  0{index + 1}
                </span>
                <h2 className="mt-5 font-display text-base font-bold">{title}</h2>
                <p className="mt-2 text-xs leading-6 text-[#777389]">{body}</p>
              </section>
            ))}
          </div>
          <p className="mt-8 border-t border-[#ecebf2] pt-5 text-[10px] text-[#9996a7]">
            Last updated: 29 July 2026. Questions:{" "}
            <a className="font-semibold text-[#c2410c]" href="mailto:hello@merotalent.com">hello@merotalent.com</a>
          </p>
        </article>
      </div>
    </main>
  );
};

export default LegalPage;

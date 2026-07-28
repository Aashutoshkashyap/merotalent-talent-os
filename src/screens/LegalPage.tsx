import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

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
    <main className="min-h-screen bg-[#f8f8fc] px-4 py-10 text-[#1b1932] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#625ce7] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            Merotalent
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-[#625ce7]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back home
          </Link>
        </div>

        <article className="mt-10 rounded-[26px] border border-[#e9e8f0] bg-white p-6 shadow-[0_20px_60px_rgba(52,48,96,0.08)] sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#625ce7]">Merotalent legal</p>
          <h1 className="mt-3 font-display text-4xl font-bold">{content.title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#777389]">{content.intro}</p>
          <div className="mt-8 space-y-7">
            {content.sections.map(([title, body]) => (
              <section key={title}>
                <h2 className="font-display text-lg font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-[#777389]">{body}</p>
              </section>
            ))}
          </div>
          <p className="mt-9 border-t border-[#ecebf2] pt-5 text-xs text-[#9996a7]">
            Last updated: 29 July 2026. Questions:{" "}
            <a className="font-semibold text-[#625ce7]" href="mailto:hello@merotalent.com">hello@merotalent.com</a>
          </p>
        </article>
      </div>
    </main>
  );
};

export default LegalPage;

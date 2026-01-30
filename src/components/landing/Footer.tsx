import { Sparkles, Facebook, Twitter, Linkedin, Instagram, Youtube, Mail, MapPin, Phone } from "lucide-react";

const footerLinks = {
  platform: {
    title: "Platform",
    links: [
      { name: "Competitions", href: "#" },
      { name: "Mentorship", href: "#" },
      { name: "Learning", href: "#" },
      { name: "Jobs", href: "#" },
      { name: "Rankings", href: "#" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Press", href: "#" },
      { name: "Contact", href: "#" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { name: "Help Center", href: "#" },
      { name: "Guidelines", href: "#" },
      { name: "API Docs", href: "#" },
      { name: "Community", href: "#" },
      { name: "Events", href: "#" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
      { name: "Security", href: "#" },
    ],
  },
};

const socialLinks = [
  { icon: Facebook, href: "#", name: "Facebook" },
  { icon: Twitter, href: "#", name: "Twitter" },
  { icon: Linkedin, href: "#", name: "LinkedIn" },
  { icon: Instagram, href: "#", name: "Instagram" },
  { icon: Youtube, href: "#", name: "YouTube" },
];

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">
                <span className="text-primary-foreground">Mero</span>
                <span className="text-secondary">talent</span>
              </span>
            </a>
            <p className="text-background/70 mb-6 max-w-sm">
              South Asia's premier talent ecosystem connecting students, institutions, companies, and mentors.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-sm text-background/70">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4" />
                <span>Kathmandu, Nepal</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4" />
                <span>hello@merotalent.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4" />
                <span>+977 1 4XXXXXX</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-bold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-background/70 hover:text-background transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/60">
            © {new Date().getFullYear()} Merotalent. All rights reserved.
          </p>
          <p className="text-sm text-background/60">
            Made with ❤️ in Nepal
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

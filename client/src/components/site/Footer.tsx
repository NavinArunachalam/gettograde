import { Link } from "@tanstack/react-router";
import { Stethoscope, Instagram, Linkedin, Youtube, Mail, MapPin, Phone } from "lucide-react";
import { useOrganizationDetails } from "@/lib/organization";

export function Footer() {
  const organization = useOrganizationDetails();
  const addressLines = organization.address.split(/\r?\n|,\s*/).filter(Boolean);

  return (
    <footer className="mt-24 bg-plum-dark text-cream/85 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-50 pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-lime/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1400px] px-5 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="relative block h-10 w-10 overflow-hidden rounded-xl">
                <img src={organization.logo} alt={organization.name} className="h-full w-full object-cover" />
              </span>
              <span className="font-display text-lg font-bold text-cream">
                {organization.name}
              </span>
            </Link>
            <p className="mt-5 text-sm leading-relaxed max-w-xs">
              {organization.about}
            </p>
            <div className="mt-6 flex gap-2">
              {[Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-10 w-10 place-items-center rounded-full bg-cream/10 hover:bg-lime hover:text-plum-dark transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FCol title="Courses" links={[
            ["Oracle Cloud (OCI)", "/courses"],
            ["SAP (S/4HANA)", "/courses"],
            ["AWS Cloud", "/courses"],
            ["Microsoft Azure", "/courses"],
            ["Digital Marketing", "/courses"],
          ]} />
          <FCol title="Academy" links={[
            ["About", "/about"],
            ["Faculty", "/faculty"],
            ["Placements", "/placements"],
            ["Blog", "/blog"],
            ["Contact", "/contact"],
          ]} />

          <div className="lg:col-span-3">
            <h4 className="font-display font-semibold text-cream text-sm uppercase tracking-widest">
              Reach Us
            </h4>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex gap-3"><MapPin className="h-4 w-4 mt-0.5 text-lime shrink-0" /><span>{addressLines.map((line, index) => <span key={`${line}-${index}`}>{line}{index < addressLines.length - 1 && <br />}</span>)}</span></li>
              <li className="flex gap-3"><Phone className="h-4 w-4 mt-0.5 text-lime shrink-0" /><span>{organization.phone}</span></li>
              <li className="flex gap-3"><Mail className="h-4 w-4 mt-0.5 text-lime shrink-0" /><span><a href={`mailto:${organization.email}`}>{organization.email}</a></span></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-cream/15 pt-6 text-xs text-cream/60">
          <p>© {new Date().getFullYear()} Beyond20. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="lg:col-span-2">
      <h4 className="font-display font-semibold text-cream text-sm uppercase tracking-widest">
        {title}
      </h4>
      <ul className="mt-5 space-y-2.5 text-sm">
        {links.map(([l, to]) => (
          <li key={l}>
            <Link to={to} className="hover:text-lime transition-colors">{l}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

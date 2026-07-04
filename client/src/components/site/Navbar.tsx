import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Stethoscope } from "lucide-react";
import { useOrganizationDetails } from "@/lib/organization";

const NAV = [
  { label: "Courses", to: "/courses" },
  { label: "About", to: "/about" },
  { label: "Faculty", to: "/faculty" },
  { label: "Placements", to: "/placements" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const organization = useOrganizationDetails();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 ${
        open ? "bg-cream" : "bg-cream/65 backdrop-blur-md"
      } border-b border-border shadow-sm`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-plum-dark text-lime transition-transform ">
            <img src='../../logo.jpeg' className="h-full w-full" />
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight text-plum-dark">
            {organization.name}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-plum-dark bg-secondary" }}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-plum-dark hover:bg-secondary transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-foreground/80 hover:text-plum-dark"
          >
            Login
          </Link>
          <Link
            to="/enroll"
            className="group inline-flex items-center gap-2 rounded-full bg-plum-dark px-5 py-2.5 text-sm font-semibold text-cream hover:bg-plum transition-colors"
          >
            Enrollment
            <span className="grid h-5 w-5 place-items-center rounded-full bg-lime text-plum-dark text-[10px] font-bold group-hover:rotate-45 transition-transform">
              →
            </span>
          </Link>
        </div>

        <button
          aria-label="menu"
          onClick={() => setOpen(true)}
          className="lg:hidden grid h-10 w-10 place-items-center rounded-full  text-plum-dark"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-plum-dark/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-cream p-6 flex flex-col">
            <div className="flex justify-between items-center">
              <span className="font-display font-bold text-plum-dark">
                Menu
              </span>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-semibold text-plum-dark hover:bg-secondary"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-plum-dark/20 px-5 py-3 text-center text-sm font-semibold text-plum-dark"
              >
                Login
              </Link>
              <Link
                to="/enroll"
                onClick={() => setOpen(false)}
                className="rounded-full bg-plum-dark px-5 py-3 text-center text-sm font-semibold text-cream"
              >
                Enrollment
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

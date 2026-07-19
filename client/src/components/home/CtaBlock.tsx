import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function CtaBlock() {
  return (
    <section className="py-10 lg:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[40px] bg-plum-dark text-cream p-10 lg:p-20">
          <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-lime/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-plum/40 blur-3xl" />

          <div className="relative max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-lime">— Next Cohort Open</div>
            <h2 className="mt-4 font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Your dream IT career is<br />
              <span className="bg-lime text-plum-dark px-3 rounded-lg">just weeks away.</span>
            </h2>
            <p className="mt-6 text-lg text-cream/75 max-w-lg">
              Limited seats per cohort. Talk to our expert counsellors and start your learning journey today.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/courses" className="group inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 text-sm font-bold text-plum-dark hover:bg-cream transition">
                Reserve My Seat
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-7 py-4 text-sm font-bold text-cream hover:bg-cream/10 transition">
                Talk to a Counsellor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

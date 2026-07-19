import { ClipboardCheck, GraduationCap, ScrollText, Award, Briefcase } from "lucide-react";

const steps = [
  { icon: ClipboardCheck, title: "Enroll", desc: "Choose your course and start your learning journey." },
  { icon: GraduationCap,  title: "Learn",  desc: "Attend live classes led by 15+ years experienced trainers." },
  { icon: ScrollText,     title: "Build Projects",   desc: "Gain hands-on experience through live labs and project portfolios." },
  { icon: Award,          title: "Prepare", desc: "Refine resumes, pass mock interviews, and get certified." },
  { icon: Briefcase,      title: "Get Placed", desc: "Secure a career at top MNCs like Infosys, Wipro, and others.", highlight: true },
];

export function LearningPath() {
  return (
    <section className="py-10 lg:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— 07 / Journey</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">
            Your Road to <span className="text-plum">Career Growth</span> & <span className="bg-lime px-2 rounded">Placement Success.</span>
          </h2>
        </div>

        <div className="mt-16 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-px border-t-2 border-dashed border-plum/30" />

          <div className="grid lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                <div className={`relative grid h-24 w-24 place-items-center rounded-3xl ${s.highlight ? "bg-lime text-plum-dark" : "bg-card border border-border text-plum-dark"}`}>
                  <s.icon className="h-9 w-9" />
                  <span className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-plum-dark text-lime font-mono text-xs font-bold">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-plum-dark">{s.title}</h3>
                <p className="mt-2 max-w-[180px] text-sm text-foreground/65 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

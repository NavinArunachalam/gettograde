import { Users, BookOpen, TrendingUp, Code, UserCheck, Briefcase } from "lucide-react";

const items = [
  { icon: Users, title: "15+ Years Experienced Trainers", desc: "Every trainer at Beyond20 has spent over a decade and a half working in the industry before stepping into the classroom. You learn from professionals." },
  { icon: BookOpen, title: "Full-Fledged Curriculum", desc: "Our Oracle Cloud, SAP, AWS and Azure programs are designed end-to-end, from fundamentals to advanced architecture, so you never need fragmented learning." },
  { icon: TrendingUp, title: "Proven Placement Track Record", desc: "Our alumni are currently working at Infosys, Wipro, and other leading MNCs, reflecting the high standard of our training and mentorship." },
  { icon: Code, title: "Hands-On, Project-Based Learning", desc: "Every module includes live demonstrations, hands-on labs, and real-time project work, so you graduate with a solid portfolio." },
  { icon: UserCheck, title: "Small Batches, Personal Attention", desc: "We keep batch sizes manageable so every learner gets direct access to the trainer and personal feedback throughout their learning path." },
  { icon: Briefcase, title: "Dedicated Placement Support", desc: "From resume building and LinkedIn optimization to mock interviews and direct referrals, our placement cell works with you until you get hired." },
];

export function WhyUs() {
  return (
    <section className="py-10 lg:py-16 bg-secondary/40">
      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— 02 / Why Beyond20</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">
            Built for the realities<br />of modern tech careers.
          </h2>
        </div>

        <div className="mt-14 grid gap-px bg-border rounded-3xl overflow-hidden lg:grid-cols-3 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.title} className="group bg-card p-8 hover:bg-plum-dark transition-colors duration-300">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary group-hover:bg-lime transition-colors">
                <it.icon className="h-5 w-5 text-plum-dark" />
              </div>
              <h3 className="mt-6 font-display text-lg font-semibold text-plum-dark group-hover:text-cream transition-colors">
                {it.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65 group-hover:text-cream/75 transition-colors">
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

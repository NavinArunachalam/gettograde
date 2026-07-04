import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "../components/site/Layout";
import { Target, Eye, Heart, Award, Users, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  const [aboutDetail, setAboutDetail] = useState({
    mission: "",
    vision: "",
    values: ""
  });
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    const loadAbout = async () => {
      try {
        const res = await api.get("/public/about");
        if (res.success) {
          if (res.about) {
            setAboutDetail({
              mission: res.about.mission || "",
              vision: res.about.vision || "",
              values: res.about.values || ""
            });
          }
          if (res.milestones) {
            setMilestones(res.milestones);
          }
        }
      } catch (err) {
        console.error("Error fetching about page content:", err);
      }
    };
    loadAbout();
  }, []);

  const valuesData = [
    { icon: Target, t: "Mission", d: aboutDetail.mission },
    { icon: Eye, t: "Vision", d: aboutDetail.vision },
    { icon: Heart, t: "Values", d: aboutDetail.values },
  ];
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
        <div className="absolute -z-10 top-0 right-0 h-[500px] w-[500px] rounded-full bg-lime/25 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— About Axon</div>
          <h1 className="mt-3 max-w-4xl font-display text-4xl lg:text-7xl font-bold text-plum-dark tracking-[-0.03em] leading-[1.02]">
            Built by clinicians,<br />
            <span className="text-plum">for the next generation</span> of clinicians.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/70 leading-relaxed">
            Axon MedAcademy was started in 2018 by a small group of doctors, senior nurses, and hospital
            administrators who saw a single truth — India needs more well-trained paramedical
            professionals, and the path to becoming one should be rigorous, transparent, and humane.
          </p>
        </div>
      </section>

      {/* Stat row */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { v: "8 yrs", l: "Operating" },
            { v: "5,200+", l: "Alumni placed" },
            { v: "215", l: "Hospital partners" },
            { v: "98%", l: "Student satisfaction" },
          ].map(s => (
            <div key={s.l}>
              <div className="font-display text-3xl lg:text-5xl font-bold text-plum-dark">{s.v}</div>
              <div className="mt-2 text-sm text-foreground/60">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission Vision Values */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {valuesData.map((v, i) => (
              <div key={v.t} className={`rounded-3xl p-8 ${i === 1 ? "bg-plum-dark text-cream" : "bg-card border border-border"}`}>
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${i === 1 ? "bg-lime text-plum-dark" : "bg-secondary text-plum-dark"}`}>
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className={`mt-6 font-display text-2xl font-bold ${i === 1 ? "text-cream" : "text-plum-dark"}`}>{v.t}</h3>
                <p className={`mt-3 leading-relaxed ${i === 1 ? "text-cream/80" : "text-foreground/70"}`}>{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 lg:py-28 bg-secondary/40">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Our Story</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">From a single classroom to a national academy.</h2>

          <div className="mt-14 relative">
            <div className="absolute left-[27px] top-2 bottom-2 w-px bg-plum/30" />
            {milestones.map((m) => (
              <div key={m._id || m.year} className="relative flex gap-6 pb-10 last:pb-0">
                <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-plum-dark text-lime font-mono text-xs font-bold">
                  {m.year}
                </div>
                <div className="pt-3">
                  <h3 className="font-display text-lg font-semibold text-plum-dark">{m.t || m.title}</h3>
                  <p className="mt-1 text-sm text-foreground/70">{m.d || m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditations */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 text-center">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Trust</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">Recognized & accredited.</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {["ISO 9001:2015", "NSDC Aligned", "Skill India", "AICTE Approved"].map((a) => (
              <div key={a} className="rounded-2xl border border-border bg-card p-8">
                <Award className="h-8 w-8 mx-auto text-plum" />
                <div className="mt-4 font-display font-semibold text-plum-dark">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

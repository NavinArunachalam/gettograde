import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "../components/site/Layout";
import { Building2, TrendingUp, MapPin, Star, Quote } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/placements")({ component: Placements });

function Placements() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);

  useEffect(() => {
    const loadPlacements = async () => {
      try {
        const res = await api.get("/public/placements");
        if (res.success) {
          if (res.partners) {
            setHospitals(res.partners);
          }
          if (res.stories) {
            setStories(res.stories);
          }
        }
      } catch (err) {
        console.error("Error loading placements:", err);
      }
    };
    loadPlacements();
  }, []);
  return (
    <PublicLayout>
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute -z-10 top-0 right-0 h-[500px] w-[500px] rounded-full bg-lime/25 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Placements</div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl lg:text-7xl font-bold text-plum-dark tracking-[-0.03em] leading-[1.02]">
            Where our graduates<br />are <span className="bg-lime px-3 rounded">working today.</span>
          </h1>
        </div>
      </section>

      <section className="bg-plum-dark text-cream py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { v: "95%",   l: "Placement rate" },
            { v: "₹3.8L", l: "Avg starting salary" },
            { v: "215+",  l: "Partner hospitals" },
            { v: "28",    l: "States covered" },
          ].map(s => (
            <div key={s.l}>
              <div className="font-display text-4xl lg:text-5xl font-bold text-lime">{s.v}</div>
              <div className="mt-2 text-sm text-cream/70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Recruiters</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">Hospitals that hire from us.</h2>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {hospitals.map(h => {
              const name = typeof h === 'string' ? h : h.name;
              return (
                <div key={name} className="rounded-2xl border border-border bg-card p-6 text-center hover:border-plum-dark/30 transition">
                  <Building2 className="h-7 w-7 mx-auto text-plum" />
                  <div className="mt-3 font-display text-sm font-semibold text-plum-dark">{name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Stories</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">Recently placed.</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map(s => (
              <div key={s._id || s.name} className="rounded-3xl bg-card border border-border p-6 hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-plum-dark text-lime font-display font-bold">
                    {s.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-plum-dark">{s.name}</div>
                    <div className="text-xs text-foreground/60">{s.role}</div>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-secondary p-4">
                  <div className="text-xs text-foreground/60 inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> Placed at</div>
                  <div className="font-display font-semibold text-plum-dark mt-1">{s.hospital}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-foreground/60"><MapPin className="h-3.5 w-3.5" /> {s.city}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-plum-dark"><TrendingUp className="h-3.5 w-3.5 text-plum" /> {s.salary}/yr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

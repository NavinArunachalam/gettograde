import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "../components/site/Layout";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Star, GraduationCap, Award } from "lucide-react";

export const Route = createFileRoute("/faculty")({ component: FacultyPage });

function FacultyPage() {
  const [faculty, setFaculty] = useState<any[]>([]);

  useEffect(() => {
    api.get("/public/faculty")
      .then((res) => {
        if (res.success) {
          const list = res.facultyList || [];
          const seen = new Set<string>();
          const unique = list.filter((f: any) => {
            const key = f.name?.trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setFaculty(unique);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
        <div className="absolute -z-10 top-0 right-0 h-[500px] w-[500px] rounded-full bg-lime/25 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Faculty</div>
          <h1 className="mt-3 max-w-4xl font-display text-4xl lg:text-7xl font-bold text-plum-dark tracking-[-0.03em] leading-[1.02]">
            Learn from the <span className="text-plum">best</span> in the industry.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/70 leading-relaxed">
            Our faculty includes experienced doctors, senior nurses, and hospital administrators
            who bring real-world expertise to every lesson.
          </p>
        </div>
      </section>

      {/* Faculty Grid */}
      <section className="py-20 lg:py-28 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {faculty.length === 0 ? (
            <div className="text-center py-20 text-foreground/60">Loading faculty...</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {faculty.map((f: any) => (
                <div
                  key={f._id || f.name}
                  className="rounded-3xl bg-card border border-border p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow"
                >
                  {/* Avatar */}
                  <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-plum to-plum-dark flex items-center justify-center font-display font-bold text-2xl text-lime shrink-0">
                    {f.image ? (
                      <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                    ) : (
                      f.initials || f.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Name & Role */}
                  <h3 className="mt-4 font-display font-bold text-plum-dark text-lg">{f.name}</h3>
                  <p className="text-sm text-foreground/60">{f.role}</p>

                  {/* Specialty */}
                  {f.specialty && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-foreground/70 bg-secondary rounded-full px-3 py-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {f.specialty}
                    </div>
                  )}

                  {/* Years & Rating */}
                  <div className="mt-4 w-full flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-1 text-xs text-foreground/60">
                      <Award className="h-3.5 w-3.5" />
                      {f.years || 0}+ yrs
                    </div>
                    {f.rating && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-plum-dark">
                        <Star className="h-3.5 w-3.5 fill-lime text-lime" />
                        {f.rating}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
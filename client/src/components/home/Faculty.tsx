import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { api, getAssetUrl } from "@/lib/api";

export function Faculty() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const res = await api.get("/public/faculty");
        if (res.success) {
          const tints = ["from-plum to-plum-dark", "from-plum-dark to-plum"];
          const listWithTints = (res.facultyList || []).map((f: any, i: number) => ({
            ...f,
            tint: tints[i % tints.length]
          }));
          setFaculty(listWithTints);
        }
      } catch (err) {
        console.error("Failed to load faculty:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaculty();
  }, []);

  const visible = faculty.length > 0
    ? faculty.slice(idx, idx + 4).concat(faculty.slice(0, Math.max(0, idx + 4 - faculty.length)))
    : [];

  return (
    <section className="py-10 lg:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div className="max-w-xl">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— 04 / Faculty</div>
            <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">
              Taught by clinicians,<br/>not just instructors.
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => faculty.length > 0 && setIdx((i) => (i - 1 + faculty.length) % faculty.length)} className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-plum-dark hover:text-cream hover:border-plum-dark transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => faculty.length > 0 && setIdx((i) => (i + 1) % faculty.length)} className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-plum-dark hover:text-cream hover:border-plum-dark transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-foreground/50">Loading faculty...</div>
        ) : faculty.length === 0 ? (
          <div className="text-center py-12 text-foreground/50">No faculty members found.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((f, i) => (
              <div key={`${f._id || f.id}-${i}`} className="group rounded-3xl border border-border bg-card p-6 hover:-translate-y-1 hover:border-plum-dark/30 transition-all">
                <div className={`relative h-44 rounded-2xl bg-gradient-to-br ${f.tint || "from-plum to-plum-dark"} overflow-hidden grid place-items-center`}>
                  <div className="absolute inset-0 bg-noise opacity-30" />
                  {f.image ? (
                    <img src={getAssetUrl(f.image)} alt={f.name} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="relative font-display text-5xl font-bold text-cream/90">{f.initials || f.name.charAt(0)}</span>
                  )}
                  <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-1 text-[11px] font-bold text-plum-dark z-10">
                    <Star className="h-3 w-3 fill-lime text-lime" /> {f.rating}
                  </div>
                </div>
                <h3 className="mt-5 font-display font-semibold text-plum-dark">{f.name}</h3>
                <div className="mt-1 text-xs text-foreground/60">{f.role}</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-plum-dark">{f.specialty}</span>
                  <span className="text-xs text-foreground/60">{f.years}y</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

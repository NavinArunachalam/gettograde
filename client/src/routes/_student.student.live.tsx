import { createFileRoute, Link } from "@tanstack/react-router";
import { Video, Users, Clock, Calendar, Bell, Loader2 } from "lucide-react";
import { Card } from "@/components/portal/PortalShell";
import { getMyClassrooms } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_student/student/live")({
  component: LiveClasses,
});

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: "scheduled" | "live" | "ended";
  roomId: string;
  attendees: unknown[];
  classroomName: string;
}

function LiveClasses() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  async function fetchMeetings() {
    try {
      // ✅ getMyClassrooms() already normalizes meetings from the backend
      const classrooms = await getMyClassrooms();

      const all: Meeting[] = classrooms.flatMap((c: any) =>
        (c.meetings || []).map((m: any) => ({
          ...m,
          classroomName: c.name,
        }))
      );

      all.sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );

      setMeetings(all);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMeetings();
    // Poll every 30s to catch scheduled → live transitions
    const interval = setInterval(fetchMeetings, 30_000);
    return () => clearInterval(interval);
  }, []);

  const liveNow = meetings.filter((m) => m.status === "live");
  const upcoming = meetings.filter((m) => m.status === "scheduled");
  // Find the most recent live class based on scheduledAt (latest time)
  const latestLive = liveNow.length ? liveNow.reduce((prev, cur) =>
    new Date(cur.scheduledAt) > new Date(prev.scheduledAt) ? cur : prev
  ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading your classes…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-plum-dark">Live Classes</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time sessions with faculty and peers</p>
      </div>

      {/* Live now */}
      {latestLive && (
        <div className="mb-4 p-4 bg-gradient-to-r from-plum-dark to-plum text-cream rounded-xl flex flex-col items-start">
          <h2 className="font-display text-xl">Latest Live Class</h2>
          <p className="mt-1">{latestLive.title} – {latestLive.classroomName}</p>
          <Link
            to="/live/$roomId"
            params={{ roomId: latestLive.roomId }}
            className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-4 py-2 font-bold mt-2"
          >
            Join latest
          </Link>
        </div>
      )}
      {liveNow.length > 0 ? (
        <div className="space-y-3">
          {liveNow.map((m) => (
            <div key={m.id} className="rounded-3xl bg-gradient-to-br from-plum-dark to-plum text-cream p-6 lg:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid opacity-15" />
              <div className="relative flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 bg-lime text-plum-dark text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-plum-dark animate-pulse" />
                    Live now
                  </span>
                  <h2 className="mt-3 font-display text-2xl lg:text-3xl font-bold">{m.title}</h2>
                  <p className="mt-2 text-cream/75 text-sm">
                    {m.classroomName} · Started{" "}
                    {new Date(m.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-cream/70">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{m.attendees.length} attending</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{m.duration} min</span>
                  </div>
                </div>
                {/* ✅ roomId comes from normalized meeting data */}
                <Link
                  to="/live/$roomId"
                  params={{ roomId: m.roomId }}
                  className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-6 py-3 font-bold shrink-0 hover:bg-lime/90 transition-colors"
                >
                  <Video className="h-4 w-4" /> Join class
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-plum-dark/20 p-8 text-center">
          <Video className="h-8 w-8 text-plum-dark/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No live classes right now</p>
        </div>
      )}

      {/* Upcoming */}
      <Card>
        <h3 className="font-display font-bold text-plum-dark text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Upcoming Classes
        </h3>
        <div className="mt-4 space-y-3">
          {upcoming.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-xl border border-border p-3.5">
              <div className="w-36 shrink-0">
                <div className="text-xs font-mono text-plum">
                  {new Date(m.scheduledAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(m.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-plum-dark truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{m.classroomName}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.duration} min</span>
                </div>
              </div>
                <Link
                  to="/live/$roomId"
                  params={{ roomId: m.roomId }}
                  className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-4 py-2 font-bold shrink-0 hover:bg-lime/90 transition-colors"
                >
                  Join class
                </Link>
              <button
                onClick={() => setReminded(prev => new Set(prev).add(m.id))}
                className={`text-xs font-semibold border rounded-full px-4 py-1.5 flex items-center gap-1.5 transition-colors shrink-0 ${reminded.has(m.id)
                    ? "bg-plum-dark text-cream border-plum-dark"
                    : "border-plum-dark/20 text-plum-dark hover:bg-plum-dark hover:text-cream"
                  }`}
              >
                <Bell className="h-3 w-3" />
                {reminded.has(m.id) ? "Reminded" : "Remind me"}
              </button>
            </div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">No upcoming classes scheduled.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
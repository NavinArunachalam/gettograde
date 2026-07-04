import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, PlayCircle, Clock, ClipboardList, Video } from "lucide-react";
import { Card } from "@/components/portal/PortalShell";
import { useClassroomStore } from "@/lib/classroomStore";

export const Route = createFileRoute("/_student/student/my-courses/")({
  component: MyCourses,
});

function MyCourses() {
  const { classrooms, courses, currentUser } = useClassroomStore();
  const studentId = currentUser?.id || "";

  const enrolledClassrooms = classrooms.filter(c =>
    c.students.some(s => s.id === studentId && s.status === "active")
  );

  const myCourses = enrolledClassrooms.map(cls => {
    const me = cls.students.find(s => s.id === studentId)!;
    const course = courses.find(c => c.title === cls.program);
    const publishedRecs = cls.recordings.filter(r => r.isPublished);
    const watchedRecs = publishedRecs.filter(r => r.viewStats.some(v => v.studentId === studentId && v.watchedPercent > 0));
    const totalWatchedSec = publishedRecs.reduce((s, r) => {
      const vs = r.viewStats.find(v => v.studentId === studentId);
      return s + (vs ? (vs.watchedPercent / 100) * r.duration : 0);
    }, 0);
    const upcomingLive = cls.meetings.filter(m => m.status === "scheduled" || m.status === "live").length;
    const totalQuizzes = cls.quizzes.filter(q => q.status === "published").length;
    const completedQuizzes = cls.quizzes.filter(q =>
      q.status === "published" && q.attempts.some(a => a.studentId === studentId && a.status === "submitted")
    ).length;
    return { cls, me, course, publishedRecs, watchedRecs, totalWatchedSec, upcomingLive, totalQuizzes, completedQuizzes };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-plum-dark flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-plum" /> My Courses
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {myCourses.length} course{myCourses.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      {myCourses.length === 0 ? (
        <Card className="text-center py-16">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">You haven&apos;t been enrolled in any courses yet.</p>
          <p className="text-slate-400 text-xs mt-1">Contact your admin to get started.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {myCourses.map(({ cls, me, course, publishedRecs, watchedRecs, totalWatchedSec, upcomingLive, totalQuizzes, completedQuizzes }) => (
            <Card key={cls.id} className="overflow-hidden p-0">
              {/* Course header */}
              <div className="h-2 bg-gradient-to-r from-plum to-plum-dark" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-xl font-bold text-plum-dark">{cls.name}</h2>
                      <span className="bg-plum-dark/10 text-plum-dark text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded">{cls.status}</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">{cls.program}</p>
                    {course?.description && <p className="text-slate-400 text-xs mt-1.5 max-w-xl">{course.description}</p>}
                  </div>
                  <Link to="/student/classroom/$id" params={{ id: cls.id }}
                    className="inline-flex items-center gap-2 rounded-full bg-plum-dark text-cream px-5 py-2.5 text-sm font-bold hover:bg-plum transition-colors shrink-0">
                    Continue Learning <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Progress */}
                <div className="mt-5 p-4 rounded-2xl bg-plum-dark/5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-plum-dark">Overall Progress</span>
                    <span className="font-mono text-plum-dark font-bold">{me.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-plum rounded-full transition-all" style={{ width: `${me.progress}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                    <span>Attendance: <strong className="text-plum-dark">{me.attendance}%</strong></span>
                    <span>Quiz Avg: <strong className="text-plum-dark">{me.quizAvg}%</strong></span>
                    <span>Enrollment: <strong className="text-plum-dark">{me.enrollmentId}</strong></span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: Video, label: "Videos", val: `${watchedRecs.length}/${publishedRecs.length}`, sub: "watched" },
                    { icon: Clock, label: "Hours", val: `${Math.round(totalWatchedSec / 3600)}h`, sub: "watched" },
                    { icon: PlayCircle, label: "Live", val: upcomingLive, sub: "upcoming" },
                    { icon: ClipboardList, label: "Quizzes", val: `${completedQuizzes}/${totalQuizzes}`, sub: "done" },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                      <s.icon className="h-4 w-4 text-plum mx-auto mb-1" />
                      <div className="font-display font-bold text-plum-dark">{s.val}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</div>
                      <div className="text-[9px] text-slate-400">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Recordings */}
                {publishedRecs.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold text-plum-dark mb-3">Course Recordings</h4>
                    <div className="space-y-2">
                      {publishedRecs.slice(0, 3).map(r => {
                        const vs = r.viewStats.find(v => v.studentId === studentId);
                        const pct = vs?.watchedPercent || 0;
                        return (
                          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-plum/20 transition-colors">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-plum-dark/10 text-plum shrink-0">
                              <PlayCircle className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-plum-dark truncate">{r.title}</div>
                              <div className="text-xs text-slate-400">{Math.floor(r.duration / 60)}m · {r.chapters.length} chapters</div>
                              <div className="mt-1 h-1 w-full rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full bg-plum rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="text-xs font-mono text-plum-dark shrink-0">{pct}%</span>
                          </div>
                        );
                      })}
                      {publishedRecs.length > 3 && (
                        <Link to="/student/classroom/$id" params={{ id: cls.id }}
                          className="text-xs font-semibold text-plum flex items-center gap-1 hover:text-plum-dark">
                          View all {publishedRecs.length} recordings <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Course fee info */}
                {course && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-plum-dark">{course.category}</span> · Code: <span className="font-mono">{cls.code}</span>
                    </div>
                    <div className="text-xs font-semibold text-plum-dark">₹{course.price.toLocaleString("en-IN")}</div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Megaphone, Video, BookOpen, ClipboardList,
  Play, Check, X, Clock, Calendar, ChevronRight,
  Trophy, Radio, Lock, ShieldAlert, Download
} from "lucide-react";
import {
  LuArrowLeft, LuMegaphone, LuVideo, LuBookOpen, LuClipboardList,
  LuPlus, LuX, LuTrash2, LuPlay, LuEye, LuEyeOff, LuCheck, LuSend,
  LuCalendar, LuClock, LuRadio, LuUpload, LuUsers, LuCircleDot, LuDownload, LuCopy
} from "react-icons/lu";
import { useVideoProtection } from "@/lib/video-protection";
import {
  useClassroomStore,
  classroomActions,
  formatDuration,
  isClassroomStale,
  markClassroomFresh,
  type Quiz,
  type Question,
} from "@/lib/classroomStore";
import {
  getClassroomById,
  getQuizAttemptResult,
  getRecordingStreamUrl,
  saveQuizAnswer,
  startQuizAttempt,
  submitQuizAttempt,
  trackRecordingProgress,
} from "@/lib/api";

export const Route = createFileRoute("/_student/student/classroom/$id")({
  component: StudentClassroomDetail,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "announcements", label: "Announcements", icon: LuMegaphone },
  { key: "live", label: "Live Classes", icon: LuVideo },
  { key: "recordings", label: "Recordings", icon: LuCircleDot },
  { key: "tests", label: "Tests", icon: LuClipboardList },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// ─── Announcements Tab ────────────────────────────────────────────────────────

function AnnouncementsTab({ classroomId }: { classroomId: string }) {
  const { classrooms } = useClassroomStore();
  const cls = classrooms.find((c) => c.id === classroomId)!;

  return (
    <div className="space-y-3">
      {cls.announcements.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <Megaphone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No announcements yet. Check back later.</p>
        </div>
      )}
      {cls.announcements.map((ann) => (
        <div key={ann.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plum-dark text-cream font-bold text-xs">
              {ann.author.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-plum-dark text-sm font-semibold">{ann.author}</span>
                <span className="text-slate-400 text-xs">{timeAgo(ann.createdAt)}</span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{ann.content}</p>
              {ann.attachments && ann.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {ann.attachments.map((at: any, i: number) => {
                    return (
                      <a
                        key={i}
                        href={at.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-plum-dark transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 text-plum-dark" />
                        {"Attachment"}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Live Classes Tab ─────────────────────────────────────────────────────────

function LiveClassesTab({ classroomId }: { classroomId: string }) {
  const { classrooms } = useClassroomStore();
  const cls = classrooms.find((c) => c.id === classroomId)!;
  const upcoming = cls.meetings
    .filter((m) => m.status === "scheduled" || m.status === "live")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const past = cls.meetings
    .filter((m) => m.status === "ended")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="space-y-5">
      {cls.meetings.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <Video className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No live classes scheduled yet.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-3">Upcoming & Live</h3>
          <div className="space-y-3">
            {upcoming.map((m) => (
              <div key={m.id} className={`rounded-2xl border p-5 ${m.status === "live" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-plum-dark">{m.title}</span>
                      {m.status === "live" && (
                        <span className="bg-red-100 text-red-600 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded flex items-center gap-1">
                          <Radio className="h-2.5 w-2.5 animate-pulse" /> LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{m.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(m.scheduledAt)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration} min</span>
                    </div>
                  </div>
                  {m.status === "live" ? (
                    <a
                      href={`/live/${m.roomId}`}
                      className="rounded-full bg-red-500 text-white px-5 py-2.5 text-sm font-bold flex items-center gap-2 shrink-0"
                    >
                      <Radio className="h-4 w-4" /> Join Now
                    </a>
                  ) : (
                    <a
                      href={`/live/${m.roomId}`}
                      className="rounded-full bg-plum-dark text-cream px-5 py-2.5 text-sm font-bold flex items-center gap-2 shrink-0 hover:bg-plum transition-colors"
                    >
                      Join Class
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-3">Past Sessions</h3>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 text-left">
                  <th className="p-4">Class</th><th>Date</th><th>Duration</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-semibold text-plum-dark">{m.title}</td>
                    <td className="text-slate-500 text-xs">{fmtDate(m.scheduledAt)}</td>
                    <td className="text-slate-500 text-xs font-mono">{m.duration}m</td>
                    <td><span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded">Done</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recordings Tab ───────────────────────────────────────────────────────────

function SecurePlayer({
  classroomId,
  recording,
  onClose,
}: {
  classroomId: string;
  recording: {
    id: string;
    title: string;
    duration: number;
    chapters: { id: string; title: string; startTimeSec: number }[];
    storageProvider?: string;
    cloudflareUrl?: string;
    viewStats?: { studentId: string; studentName: string; watchedPercent: number; totalWatchedSec?: number; lastPosition: number }[];
  };
  onClose: () => void;
}) {
  const { currentUser, accessToken } = useClassroomStore();
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingWatchedRef = useRef(0);
  const totalWatchedRef = useRef(0);
  const lastVideoTimeRef = useRef(0);
  const lastSentAtRef = useRef(0);

  const { isLocked, lockReason, resetLock } = useVideoProtection(true);

  const streamUrl = recording.storageProvider === 'cloudflare'
    ? `${getRecordingStreamUrl(recording.id)}${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`
    : recording.cloudflareUrl;

  useEffect(() => {
    totalWatchedRef.current = recording.viewStats?.find((v) => v.studentId === currentUser?.id)?.totalWatchedSec || 0;
  }, [currentUser?.id, recording.id]);

  const sendProgress = useCallback(async (force = false) => {
    const video = videoRef.current;
    if (!video || !currentUser?.id) return;

    const watchedSec = Math.floor(pendingWatchedRef.current);
    const currentPosition = Math.floor(video.currentTime || 0);
    const completed = recording.duration > 0 && currentPosition >= recording.duration * 0.9;
    const now = Date.now();

    if (!force && (watchedSec < 10 || now - lastSentAtRef.current < 10_000)) return;
    if (watchedSec <= 0 && !completed) return;

    pendingWatchedRef.current = 0;
    lastSentAtRef.current = now;

    try {
      await trackRecordingProgress(recording.id, {
        position: currentPosition,
        watchedSec,
        completed,
      });
      totalWatchedRef.current += watchedSec;
      const watchedPercent = recording.duration > 0
        ? Math.min(100, Math.round((totalWatchedRef.current / recording.duration) * 100))
        : 0;
      classroomActions.updateViewStat(classroomId, recording.id, currentUser.id, currentUser.name, watchedPercent, currentPosition);
    } catch {
      pendingWatchedRef.current += watchedSec;
    }
  }, [classroomId, currentUser?.id, currentUser?.name, recording.duration, recording.id, recording.viewStats]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime || 0;
      const delta = currentTime - lastVideoTimeRef.current;
      if (!video.paused && delta > 0 && delta <= 5) {
        pendingWatchedRef.current += delta;
      }
      lastVideoTimeRef.current = currentTime;
      setPosition(Math.floor(currentTime));
    };
    const handleLoadedMetadata = () => {
      const savedPosition = recording.viewStats?.find((v) => v.studentId === currentUser?.id)?.lastPosition || 0;
      if (savedPosition > 0 && savedPosition < video.duration - 5) {
        video.currentTime = savedPosition;
        lastVideoTimeRef.current = savedPosition;
        setPosition(Math.floor(savedPosition));
      }
    };
    const handlePlay = () => {
      lastVideoTimeRef.current = video.currentTime || 0;
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      void sendProgress(true);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      void sendProgress(true);
    };
    const handleBeforeUnload = () => {
      void sendProgress(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    window.addEventListener('beforeunload', handleBeforeUnload);
    const interval = window.setInterval(() => void sendProgress(), 15_000);

    return () => {
      window.clearInterval(interval);
      void sendProgress(true);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id, recording.id, recording.viewStats, sendProgress]);

  // Pause video if locked
  useEffect(() => {
    if (isLocked && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isLocked]);

  const pct = recording.duration > 0 ? (position / recording.duration) * 100 : 0;
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col no-select select-none" onContextMenu={(e) => e.preventDefault()}>
      <style>{`
        @media print {
          body, html, #root, .fixed, video {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
        .no-select {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
      `}</style>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/80">
        <span className="text-white font-semibold text-sm truncate">{recording.title}</span>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex flex-1 relative select-none">
        <div className="flex-1 bg-linear-to-br from-plum-dark/90 to-[#0B0719] flex items-center justify-center relative">

          {streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              crossOrigin="use-credentials"
              className="w-full h-[95vh] object-contain bg-black no-select select-none"
              controls
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              disableRemotePlayback
              // @ts-ignore — non-standard AirPlay attribute for Safari iOS
              x-webkit-airplay="deny"
              poster="/default-video-thumb.jpg"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <>
              {/* Fake video frame */}
              <button onClick={() => {
                if (isLocked) return;
                setIsPlaying((p) => !p);
              }} className="text-white/80 hover:text-white transition-colors">
                {isPlaying ? (
                  <div className="flex gap-2">
                    <div className="w-3 h-10 bg-white rounded-sm" />
                    <div className="w-3 h-10 bg-white rounded-sm" />
                  </div>
                ) : (
                  <Play className="h-16 w-16 fill-current" />
                )}
              </button>
            </>
          )}

          {/* Security Lock overlay */}
          {isLocked && (
            <div className="absolute inset-0 backdrop-blur-xl bg-black/95 flex flex-col items-center justify-center z-30 p-6 transition-all duration-300">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
                <div className="relative rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                  <ShieldAlert className="h-12 w-12 text-red-500 animate-bounce" />
                </div>
              </div>

              <h2 className="text-white font-display text-xl font-bold tracking-wider mb-2 uppercase">
                {lockReason === "shortcut" ? "Security Alert" : "Playback Paused"}
              </h2>

              <p className="text-slate-400 text-sm max-w-sm text-center mb-8 leading-relaxed">
                {lockReason === "shortcut"
                  ? "A screenshot, screen-recording shortcut, or Developer Tools attempt was detected."
                  : "Focus was lost — this may indicate a screen recording tool, notification shade, or app switch."}
              </p>

              <button
                onClick={() => {
                  void sendProgress(true);
                  onClose();
                }}
                className="rounded-full px-8 py-3 text-sm font-bold shadow-lg transition-all duration-200 bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-red-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Recordings
              </button>
            </div>
          )}

        </div>

        {/* Chapters sidebar */}
        {recording.chapters.length > 0 && (
          <div className="w-56 bg-[#111] border-l border-white/10 overflow-y-auto">
            <div className="p-3 border-b border-white/10 text-white/70 text-xs uppercase tracking-widest">Chapters</div>
            {recording.chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setPosition(ch.startTimeSec)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors ${position >= ch.startTimeSec ? "text-white" : "text-white/50"}`}
              >
                <span className="font-mono text-[10px] text-lime shrink-0">{fmt(ch.startTimeSec)}</span>
                <span className="text-xs truncate">{ch.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingsTab({ classroomId }: { classroomId: string }) {
  const { classrooms, currentUser } = useClassroomStore();
  const CURRENT_STUDENT = { id: currentUser?.id || "", name: currentUser?.name || "" };
  const cls = classrooms.find((c) => c.id === classroomId)!;
  const [activeRec, setActiveRec] = useState<string | null>(null);

  const published = cls.recordings.filter((r) => r.isPublished);
  const activeRecording = published.find((r) => r.id === activeRec);

  return (
    <>
      {activeRec && activeRecording && (
        <SecurePlayer classroomId={classroomId} recording={activeRecording} onClose={() => setActiveRec(null)} />
      )}

      <div className="space-y-3">
        {published.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No recordings published yet.</p>
          </div>
        )}
        {published.map((rec) => {
          const myStats = rec.viewStats.find((v) => v.studentId === CURRENT_STUDENT.id);
          return (
            <div key={rec.id} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-plum/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-20 h-14 rounded-xl bg-linear-to-br from-plum/20 to-plum-dark/10 flex items-center justify-center shrink-0">
                  <Play className="h-5 w-5 text-plum" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-plum-dark text-sm mb-0.5">{rec.title}</h4>
                  <p className="text-slate-500 text-xs line-clamp-1">{rec.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="font-mono">{formatDuration(rec.duration)}</span>
                    <span>{rec.chapters.length} chapters</span>
                    {myStats && <span className="text-plum font-medium">{myStats.watchedPercent}% watched</span>}
                  </div>
                  {myStats && (
                    <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden w-48">
                      <div className="h-full bg-plum rounded-full" style={{ width: `${myStats.watchedPercent}%` }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActiveRec(rec.id)}
                  className="rounded-full bg-plum-dark text-cream px-4 py-2 text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-plum transition-colors"
                >
                  <Play className="h-3 w-3" /> {myStats ? "Resume" : "Watch"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Quiz Tab ─────────────────────────────────────────────────────────────────

type QuizPhase = "list" | "intro" | "taking" | "result";

type QuizResultReview = {
  score: { rawMarks: number; totalMarks: number; percentage: number; passed: boolean };
  answers: Array<{
    questionId: string;
    selectedOptions: string[];
    isCorrect: boolean;
    marksAwarded: number;
    questionText: string;
    explanation: string;
    correctOptions: string[];
  }>;
};

function TestsTab({ classroomId }: { classroomId: string }) {
  const { classrooms, currentUser } = useClassroomStore();
  const CURRENT_STUDENT = { id: currentUser?.id || "", name: currentUser?.name || "" };
  const cls = classrooms.find((c) => c.id === classroomId)!;
  const [phase, setPhase] = useState<QuizPhase>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResultReview | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const answersRef = useRef(answers);
  const submitQuizRef = useRef<() => void>(() => {});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitQuiz = useCallback(async () => {
    if (!activeQuiz || !attemptId || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const currentAnswers = answersRef.current;
      await Promise.all(
        examQuestions.map((q) =>
          saveQuizAnswer(activeQuiz.id, {
            attemptId,
            questionId: q.id,
            selectedOptions: currentAnswers[q.id] || [],
          }),
        ),
      );
      await submitQuizAttempt(activeQuiz.id, attemptId);
      const review = await getQuizAttemptResult(activeQuiz.id, attemptId);
      setResult(review);
      const refreshed = await getClassroomById(classroomId);
      classroomActions.updateClassroom(classroomId, refreshed);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  }, [activeQuiz, attemptId, classroomId, examQuestions, isSubmitting]);

  useEffect(() => {
    submitQuizRef.current = () => { void submitQuiz(); };
  }, [submitQuiz]);

  // Timer effect
  useEffect(() => {
    if (phase !== "taking" || !activeQuiz?.duration) return;
    setTimeLeft(activeQuiz.duration * 60);
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(t);
          submitQuizRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, activeQuiz]);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setExamQuestions([]);
    setAttemptId(null);
    setAnswers({});
    setResult(null);
    setError("");
    setPhase("intro");
  };

  const beginTaking = async () => {
    if (!activeQuiz || isStarting) return;
    setError("");
    setIsStarting(true);
    try {
      const started = await startQuizAttempt(activeQuiz.id);
      setAttemptId(started.attemptId);
      setExamQuestions(started.questions);
      setAnswers({});
      setPhase("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start quiz");
    } finally {
      setIsStarting(false);
    }
  };

  const selectAnswer = (qId: string, label: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const current = prev[qId] || [];
      if (isMulti) {
        return { ...prev, [qId]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label] };
      }
      return { ...prev, [qId]: [label] };
    });
  };

  const publishedQuizzes = cls.quizzes.filter((q) => q.status === "published");

  // List view
  if (phase === "list") {
    return (
      <div className="space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {publishedQuizzes.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No tests published yet.</p>
          </div>
        )}
        {publishedQuizzes.map((q) => {
          const myAttempts = q.attempts.filter((a) => a.studentId === CURRENT_STUDENT.id && a.status === "submitted");
          const bestAttempt = myAttempts.sort((a, b) => b.score.percentage - a.score.percentage)[0];
          const canAttempt = myAttempts.length < q.maxAttempts;

          return (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <h4 className="font-display font-bold text-plum-dark mb-1">{q.title}</h4>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>{q.questions.length} questions</span>
                    <span>{q.questions.reduce((s, x) => s + x.marks, 0)} marks</span>
                    {q.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.duration} min</span>}
                    <span>Pass: {q.passPercent}%</span>
                    <span>Attempts: {myAttempts.length}/{q.maxAttempts}</span>
                  </div>
                  {bestAttempt && (
                    <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${bestAttempt.score.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {bestAttempt.score.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Best score: {bestAttempt.score.percentage}% — {bestAttempt.score.passed ? "Passed ✓" : "Failed"}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {bestAttempt && (
                    <button
                      onClick={async () => {
                        try {
                          setError("");
                          const review = await getQuizAttemptResult(q.id, bestAttempt.id);
                          setActiveQuiz(q);
                          setResult(review);
                          setPhase("result");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not load quiz review");
                        }
                      }}
                      className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 text-sm font-bold"
                    >
                      Review Answers
                    </button>
                  )}
                  <button
                    onClick={() => startQuiz(q)}
                    disabled={!canAttempt}
                    className={`rounded-full px-2 py-2.5 text-sm font-bold ${canAttempt ? "bg-plum-dark text-cream hover:bg-plum" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                  >
                    {!canAttempt ? "Completed" : myAttempts.length > 0 ? "Retry" : "Start Quiz"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Intro view
  if (phase === "intro" && activeQuiz) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-plum-dark/10 mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-plum-dark" />
          </div>
          <h2 className="font-display text-2xl font-bold text-plum-dark mb-2">{activeQuiz.title}</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">{activeQuiz.instructions}</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { l: "Questions", v: activeQuiz.questions.length },
              { l: "Total Marks", v: activeQuiz.questions.reduce((s, q) => s + q.marks, 0) },
              { l: "Pass Mark", v: `${activeQuiz.passPercent}%` },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-400">{s.l}</div>
                <div className="font-display text-xl font-bold text-plum-dark">{s.v}</div>
              </div>
            ))}
          </div>
          {activeQuiz.duration && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              Time limit: {activeQuiz.duration} minutes. The quiz will auto-submit when time runs out.
            </div>
          )}
          {activeQuiz.negativeMarking && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600">
              ⚠️ Negative marking: −{activeQuiz.negativeMarkValue} marks per wrong answer.
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-4 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setPhase("list")} className="flex-1 rounded-full border border-slate-200 text-slate-600 py-3 text-sm font-semibold">Cancel</button>
            <button onClick={beginTaking} disabled={isStarting} className="flex-1 rounded-full bg-plum-dark text-cream py-3 text-sm font-bold disabled:opacity-50">
              {isStarting ? "Starting…" : "Start Quiz →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Taking quiz view
  if (phase === "taking" && activeQuiz) {
    const answered = Object.keys(answers).length;

    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#F5F3FF] py-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
            <span className="text-plum-dark font-semibold text-sm">{activeQuiz.title}</span>
            <div className="flex items-center gap-4">
              <span className="text-slate-500 text-xs">{answered}/{examQuestions.length} answered</span>
              {timeLeft !== null && (
                <span className={`font-mono text-sm font-bold ${timeLeft < 120 ? "text-red-500" : "text-plum-dark"}`}>
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:{(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Questions */}
        {examQuestions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plum-dark text-cream text-xs font-bold">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-plum-dark font-semibold text-sm">{q.text}</span>
                </div>
                <div className="text-slate-400 text-xs">
                  {q.marks} mark{q.marks !== 1 ? "s" : ""} ·{" "}
                  {q.type === "msq" ? "Select all correct answers" : "Select one answer"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const selected = answers[q.id]?.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    onClick={() => selectAnswer(q.id, opt.label, q.type === "msq")}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border text-left transition-colors ${selected ? "border-plum bg-plum/5" : "border-slate-200 hover:border-plum/30 hover:bg-slate-50"}`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition-colors ${selected ? "bg-plum-dark border-plum-dark text-cream" : "border-slate-300 text-slate-400"}`}>
                      {selected ? <Check className="h-3 w-3" /> : opt.label}
                    </span>
                    <span className="text-sm text-slate-700">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center justify-between">
          <div className="text-slate-500 text-sm">
            {answered < examQuestions.length
              ? `${examQuestions.length - answered} question${examQuestions.length - answered !== 1 ? "s" : ""} unanswered`
              : "All questions answered ✓"}
          </div>
          <button
            onClick={() => void submitQuiz()}
            disabled={isSubmitting}
            className="rounded-full bg-plum-dark text-cream px-8 py-3 text-sm font-bold hover:bg-plum transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Submit Quiz"}
          </button>
        </div>
      </div>
    );
  }

  // Result view
  if (phase === "result" && result && activeQuiz) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className={`grid h-20 w-20 place-items-center rounded-full mx-auto mb-4 ${result.score.passed ? "bg-green-100" : "bg-red-100"}`}>
            {result.score.passed
              ? <Trophy className="h-10 w-10 text-green-600" />
              : <X className="h-10 w-10 text-red-500" />}
          </div>
          <h2 className="font-display text-3xl font-bold text-plum-dark mb-1">{result.score.percentage}%</h2>
          <p className={`text-lg font-semibold mb-2 ${result.score.passed ? "text-green-600" : "text-red-500"}`}>
            {result.score.passed ? "🎉 Congratulations! You Passed!" : "Keep trying — you can do this!"}
          </p>
          <p className="text-slate-500 text-sm mb-6">
            {result.score.rawMarks} / {result.score.totalMarks} marks · Pass mark: {activeQuiz.passPercent}%
          </p>
          <button onClick={() => setPhase("list")} className="rounded-full bg-plum-dark text-cream px-8 py-3 text-sm font-bold">
            ← Back to Tests
          </button>
        </div>

        {/* Answer review */}
        <div className="space-y-3">
          <h3 className="font-display font-bold text-plum-dark">Answer Review</h3>
          {result.answers.map((myAns, i) => {
            const quizQ = activeQuiz.questions.find(q => q.id === myAns.questionId)
              || activeQuiz.questions.find(q => q.text === myAns.questionText)
              || activeQuiz.questions[i];
            return (
              <div key={myAns.questionId} className={`rounded-2xl border p-5 ${myAns.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-start gap-2 mb-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${myAns.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    {myAns.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <p className="text-slate-800 text-sm font-semibold flex-1">Q{i + 1}. {myAns.questionText || quizQ?.text || ""}</p>
                  <span className="text-xs font-mono text-slate-500 shrink-0">+{myAns.marksAwarded} marks</span>
                </div>
                {quizQ && quizQ.options.length > 0 && (
                  <div className="ml-8 space-y-1.5 mb-3">
                    {quizQ.options.map((opt) => {
                      const isSelected = myAns.selectedOptions.includes(opt.label);
                      const isCorrectOpt = myAns.correctOptions.includes(opt.label);
                      let optClass = "border-slate-200 bg-white text-slate-600";
                      if (isCorrectOpt && isSelected) optClass = "border-green-500 bg-green-100 text-green-800 font-semibold";
                      else if (isCorrectOpt) optClass = "border-green-400 bg-green-50 text-green-700 font-semibold";
                      else if (isSelected) optClass = "border-red-400 bg-red-100 text-red-700";
                      let badge: React.ReactNode = null;
                      if (isCorrectOpt && isSelected) badge = <span className="ml-auto text-green-600 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">✓ Your answer (Correct)</span>;
                      else if (isCorrectOpt) badge = <span className="ml-auto text-green-600 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">✓ Correct Answer</span>;
                      else if (isSelected) badge = <span className="ml-auto text-red-500 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">✗ Your answer (Wrong)</span>;
                      return (
                        <div key={opt.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${optClass}`}>
                          <span className={`h-5 w-5 shrink-0 grid place-items-center rounded-full text-[10px] font-bold border ${
                            isCorrectOpt ? "bg-green-500 border-green-500 text-white"
                            : isSelected ? "bg-red-400 border-red-400 text-white"
                            : "border-slate-300 text-slate-400"
                          }`}>
                            {isCorrectOpt ? <Check className="h-3 w-3" /> : isSelected ? <X className="h-3 w-3" /> : opt.label}
                          </span>
                          <span>{opt.text}</span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>
                )}
                {myAns.explanation && (
                  <p className="text-xs text-slate-500 ml-8 mt-1 italic">💡 {myAns.explanation}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function StudentClassroomDetail() {
  const params = (Route.useParams as any)();
  const navigate = Route.useNavigate();
  const id = params.id as string;
  const { classrooms, currentUser } = useClassroomStore();
  const CURRENT_STUDENT = { id: currentUser?.id || "", name: currentUser?.name || "" };
  const [tab, setTab] = useState<TabKey>("announcements");
  const [isLoading, setIsLoading] = useState(!classrooms.some((c) => c.id === id));
  const [loadError, setLoadError] = useState<string | null>(null);

  const cls = classrooms.find((c) => c.id === id);
  const myInfo = cls?.students.find((s) => s.id === CURRENT_STUDENT.id);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoadError(null);
        const hasCached = classrooms.some((c) => c.id === id);
        if (hasCached && !isClassroomStale(id)) return;
        if (!hasCached) setIsLoading(true);
        const refreshed = await getClassroomById(id);
        if (!active) return;
        if (classrooms.some((c) => c.id === id)) {
          classroomActions.updateClassroom(id, refreshed);
        } else {
          classroomActions.addClassroom(refreshed);
        }
        markClassroomFresh(id);
      } catch (err) {
        if (active && !classrooms.some((c) => c.id === id)) {
          setLoadError(err instanceof Error ? err.message : "Could not load classroom");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-sm">Loading classroom...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-sm">Error loading classroom: {loadError}</p>
        <button onClick={() => navigate({ to: "/student/classrooms" })} className="mt-5 rounded-full bg-plum-dark text-cream px-6 py-2.5 text-sm font-bold">
          ← My Classrooms
        </button>
      </div>
    );
  }

  if (!cls || !myInfo || myInfo.status !== "active") {
    return (
      <div className="text-center py-20">
        <Lock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h2 className="font-display font-bold text-plum-dark text-xl">Access Denied</h2>
        <p className="text-slate-500 text-sm mt-2">You are not enrolled in this classroom.</p>
        <button onClick={() => navigate({ to: "/student/classrooms" })} className="mt-5 rounded-full bg-plum-dark text-cream px-6 py-2.5 text-sm font-bold">
          ← My Classrooms
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate({ to: "/student/classrooms" })} className="text-slate-400 hover:text-plum-dark mt-1 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-plum-dark">{cls.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-mono text-[11px] text-slate-400">{cls.code}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 text-xs">{cls.program}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 text-xs">{cls.students.filter((s) => s.status === "active").length} students enrolled</span>
          </div>
          {/* My progress bar */}
          <div className="mt-3 flex items-center gap-3 max-w-sm">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-plum rounded-full" style={{ width: `${myInfo.progress}%` }} />
            </div>
            <span className="text-xs font-mono text-plum-dark font-bold">{myInfo.progress}% complete</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap bg-cream/5 rounded-2xl p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2.5 transition-colors ${tab === t.key ? "bg-plum-dark text-cream shadow" : "text-slate-600 hover:text-plum-dark"}`}
          >
            <t.icon />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "announcements" && <AnnouncementsTab classroomId={cls.id} />}
      {tab === "live" && <LiveClassesTab classroomId={cls.id} />}
      {tab === "recordings" && <RecordingsTab classroomId={cls.id} />}
      {tab === "tests" && <TestsTab classroomId={cls.id} />}
    </div>
  );
}
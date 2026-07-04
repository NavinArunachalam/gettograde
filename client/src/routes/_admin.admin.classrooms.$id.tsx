import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  LuArrowLeft, LuMegaphone, LuVideo, LuBookOpen, LuClipboardList,
  LuPlus, LuX, LuTrash2, LuPlay, LuEye, LuEyeOff, LuCheck, LuSend,
  LuCalendar, LuClock, LuRadio, LuUpload, LuUsers, LuCircleDot, LuDownload, LuCopy, LuLink, LuAward
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { DarkCard } from "@/components/portal/PortalShell";
import {
  useClassroomStore,
  classroomActions,
  formatDuration,
  uid,
  isClassroomStale,
  markClassroomFresh,
  type Meeting,
  type Quiz,
  type Question,
  type Classroom,
  type Option,
  type QuizAttempt,
} from "@/lib/classroomStore";
import { addStudentsToClassroom, createMeeting, createClassroomAnnouncement, deleteClassroomAnnouncement, deleteMeeting, endMeeting as apiEndMeeting, getAdminUsers, getClassroomById, getQuizReport, publishQuiz, closeQuiz, deleteQuiz as apiDeleteQuiz, createQuiz, startMeeting as apiStartMeeting, updateClassroomStudentStatus, uploadClassroomRecordingToCloudflare, publishRecording, unpublishRecording, deleteRecording, getRecordingStreamUrl, updateQuiz, reuseClassroomRecording, uploadClassroomFileToCloudinary, generateQuizFromPdf } from "@/lib/api";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/classrooms/$id")({
  component: AdminClassroomDetail,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function MeetingStatusBadge({ status }: { status: Meeting["status"] }) {
  const map: Record<Meeting["status"], { cls: string; icon: IconType; label: string }> = {
    live: { cls: "bg-red-500/20 text-red-300", icon: LuRadio, label: "LIVE" },
    scheduled: { cls: "bg-lime/20 text-lime", icon: LuClock, label: "Scheduled" },
    ended: { cls: "bg-cream/10 text-cream/60", icon: LuCheck, label: "Done" },
    cancelled: { cls: "bg-red-900/30 text-red-400", icon: LuX, label: "Cancelled" },
  };
  const { cls, icon: Icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${cls}`}>
      <Icon className={`h-3 w-3 ${status === "live" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "announcements", label: "Announcements", icon: LuMegaphone },
  { key: "live", label: "Live Classes", icon: LuVideo },
  { key: "recordings", label: "Recordings", icon: LuCircleDot },
  { key: "tests", label: "Tests", icon: LuClipboardList },
  { key: "students", label: "Students", icon: LuUsers },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// ─── Announcements Tab ────────────────────────────────────────────────────────

function AnnouncementsTab({ classroom, refreshClassroom }: { classroom: Classroom; refreshClassroom: () => Promise<Classroom> }) {
  const cls = classroom;
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [driveLink, setDriveLink] = useState("");

  const handlePost = async () => {
    if (!text.trim() || isPosting) return;
    setError("");
    setIsPosting(true);
    try {
      let attachments: any[] = [];
      if (driveLink.trim()) {
        attachments.push({ name: 'Preview', url: driveLink.trim(), type: 'pdf' });
      }
      await createClassroomAnnouncement(classroom.id, text.trim(), attachments);
      setText("");
      setDriveLink("");
      await refreshClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post announcement");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (deletingId) return;
    setError("");
    setDeletingId(announcementId);
    try {
      await deleteClassroomAnnouncement(classroom.id, announcementId);
      await refreshClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Compose */}
      <DarkCard>
        <h3 className="font-display font-bold text-sm text-cream mb-3 flex items-center gap-2">
          <LuMegaphone className="h-4 w-4 text-lime" /> Post Announcement
        </h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your announcement… (supports emoji 🎯)"
          rows={3}
          disabled={isPosting}
          className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-3 text-cream text-sm outline-none focus:border-lime/50 resize-none disabled:opacity-50"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full">
              <LuLink className="h-3.5 w-3.5 text-cream/60 shrink-0" />
              <input
                type="url"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="Paste Google Drive PDF link..."
                disabled={isPosting}
                className="flex-1 sm:w-64 bg-cream/5 border border-cream/10 rounded-lg px-3 py-1.5 text-cream text-xs outline-none focus:border-lime/50 disabled:opacity-50"
              />
              {driveLink && (
                <button
                  onClick={() => setDriveLink("")}
                  disabled={isPosting}
                  className="text-cream/40 hover:text-red-400 shrink-0"
                >
                  <LuX className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handlePost}
            disabled={!text.trim() || isPosting}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-5 py-2 text-sm font-bold disabled:opacity-40 shrink-0"
          >
            <LuSend className="h-3.5 w-3.5" /> {isPosting ? "Posting…" : "Post to All Students"}
          </button>
        </div>
      </DarkCard>

      {/* Feed */}
      <div className="space-y-3">
        {cls.announcements.length === 0 && (
          <DarkCard className="text-center py-10">
            <LuMegaphone className="h-8 w-8 text-cream/20 mx-auto mb-2" />
            <p className="text-cream/50 text-sm">No announcements yet.</p>
          </DarkCard>
        )}
        {cls.announcements.map((ann) => (
          <DarkCard key={ann.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-plum-dark font-bold text-xs">
                  {ann.author.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-cream text-sm font-semibold">{ann.author}</span>
                    <span className="text-cream/50 text-xs">{timeAgo(ann.createdAt)}</span>
                  </div>
                  <p className="text-cream/80 text-sm leading-relaxed">{ann.content}</p>
                  {ann.attachments && ann.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {ann.attachments.map((at: any, i: number) => (
                          <a
                            key={i}
                            href={at.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-cream/5 border border-cream/10 rounded-lg px-3 py-2 text-xs font-semibold text-cream/70 hover:bg-cream/10 hover:text-lime transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            {"View PDF"}
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(ann.id)}
                disabled={deletingId === ann.id}
                className="text-cream/30 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
              >
                <LuTrash2 className="h-4 w-4" />
              </button>
            </div>
          </DarkCard>
        ))}
      </div>
    </div>
  );
}

// ─── Live Classes Tab ─────────────────────────────────────────────────────────

function LiveClassesTab({ classroomId, refreshClassroom }: { classroomId: string; refreshClassroom: () => Promise<Classroom> }) {
  const { classrooms } = useClassroomStore();
  const cls = classrooms.find((c) => c.id === classroomId)!;
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduledAt: "", duration: 60 });
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const formatForDateTimeLocal = (value: string) => {
    if (!value) return "";
    // normalize ISO and local datetime values for the browser picker
    const local = value.includes("T") ? value.slice(0, 16) : value;
    return local;
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    setError("");
    setDeletingMeetingId(meetingId);
    try {
      await deleteMeeting(meetingId);
      await refreshClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete meeting");
    } finally {
      setDeletingMeetingId(null);
    }
  };

  const handleStartMeeting = async (meetingId: string) => {
    setError("");
    try {
      await apiStartMeeting(meetingId);
      await refreshClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start meeting");
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    setError("");
    try {
      await apiEndMeeting(meetingId);
      await refreshClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end meeting");
    }
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.scheduledAt) return;
    setError("");
    setSaving(true);
    createMeeting({
      classroom: cls.code || classroomId,
      title: form.title,
      description: form.description,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      duration: form.duration,
      sendPortalNotification: notifyStudents,
      sendWhatsApp: false,
    })
      .then(async () => {
        await refreshClassroom();
        setForm({ title: "", description: "", scheduledAt: "", duration: 60 });
        setShowForm(false);
        alert("Live class scheduled successfully!");
      })
      .catch((err) => {
        console.error("Schedule Error:", err);
        setError(err.message || "Could not schedule meeting");
        alert("Error scheduling meeting: " + (err.message || "Unknown error"));
      })
      .finally(() => setSaving(false));
  };

  const upcoming = cls.meetings.filter((m) => m.status !== "ended" && m.status !== "cancelled");
  const past = cls.meetings.filter((m) => m.status === "ended" || m.status === "cancelled");

  return (
    <div className="space-y-5">
      {/* Schedule button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-5 py-2.5 text-sm font-bold"
        >
          <LuPlus className="h-4 w-4" /> Schedule Live Class
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <DarkCard>
          <h3 className="font-display font-bold text-cream mb-4">Schedule a Live Class</h3>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Class Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Ventilator Mode Deep Dive" className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What will be covered?" rows={2} className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Date & Time *</label>
                <input required type="datetime-local" value={formatForDateTimeLocal(form.scheduledAt)} onChange={(e) => setForm({ ...form, scheduledAt: e.currentTarget.value })}
                  className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Duration</label>
                <select value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full bg-[#1A0F33] border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50">
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-cream/70">
              <input
                id="notify-students"
                type="checkbox"
                checked={notifyStudents}
                onChange={(e) => setNotifyStudents(e.target.checked)}
                className="h-4 w-4 rounded border-cream/20 bg-cream/5 text-lime focus:ring-lime"
              />
              <label htmlFor="notify-students" className="select-none">Send join-link notification to active students</label>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-full bg-cream/10 text-cream py-2.5 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 rounded-full bg-lime text-plum-dark py-2.5 text-sm font-bold disabled:opacity-50">{saving ? 'Scheduling…' : 'Confirm & Schedule'}</button>
            </div>
          </form>
        </DarkCard>
      )}

      {/* Upcoming/Live meetings */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-cream/60 mb-3">Upcoming & Live</h3>
          <div className="space-y-3">
            {upcoming.map((m) => (
              <DarkCard key={m.id} className="flex items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime/10 text-lime">
                  {m.status === "live" ? <LuRadio className="h-5 w-5 animate-pulse" /> : <LuCalendar className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-cream text-sm truncate">{m.title}</span>
                    <MeetingStatusBadge status={m.status} />
                  </div>
                  <div className="text-cream/60 text-xs mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><LuCalendar className="h-3 w-3" /> {fmtShortDate(m.scheduledAt)}</span>
                    <span className="flex items-center gap-1"><LuClock className="h-3 w-3" /> {fmtTime(m.scheduledAt)}</span>
                    <span>{m.duration} min</span>
                    <span>{m.attendees.length} joined</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {m.status === "scheduled" && (
                    <button onClick={() => void handleStartMeeting(m.id)}
                      className="rounded-full bg-lime text-plum-dark px-4 py-2 text-xs font-bold flex items-center gap-1">
                      <LuPlay className="h-3 w-3" /> Start
                    </button>
                  )}
                  {m.status === "live" && (
                    <>
                      <Link to="/live/$roomId" params={{ roomId: m.roomId }}
                        className="rounded-full bg-red-500/20 text-red-300 px-4 py-2 text-xs font-bold flex items-center gap-1">
                        <LuRadio className="h-3 w-3" /> Join Class
                      </Link>
                      <button onClick={() => void handleEndMeeting(m.id)}
                        className="rounded-full bg-cream/10 text-cream/70 px-3 py-2 text-xs">
                        End
                      </button>
                    </>
                  )}
                  <button onClick={() => void handleDeleteMeeting(m.id)}
                    disabled={deletingMeetingId === m.id}
                    className="rounded-full bg-cream/5 text-cream/40 hover:text-red-400 p-2 text-xs disabled:opacity-50">
                    <LuTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DarkCard>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-cream/60 mb-3">Past Sessions</h3>
          <DarkCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-162.5 text-sm">
                <thead className="bg-cream/5">
                  <tr className="text-left text-[10px] uppercase tracking-widest text-cream/60">
                    <th className="p-4">Class</th><th>Date</th><th>Duration</th><th>Attendees</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((m) => (
                    <tr key={m.id} className="border-t border-cream/10">
                      <td className="p-4 font-semibold text-cream">{m.title}</td>
                      <td className="text-cream/70 text-xs">{fmtDate(m.scheduledAt)}</td>
                      <td className="font-mono text-cream/60 text-xs">{m.duration}m</td>
                      <td className="font-mono text-cream/80">{m.attendees.length}</td>
                      <td><MeetingStatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DarkCard>
        </div>
      )}

      {cls.meetings.length === 0 && (
        <DarkCard className="text-center py-12">
          <LuVideo className="h-8 w-8 text-cream/20 mx-auto mb-2" />
          <p className="text-cream/50 text-sm">No classes scheduled yet.</p>
        </DarkCard>
      )}
    </div>
  );
}

// ─── Recordings Tab ───────────────────────────────────────────────────────────

function RecordingsTab({ classroom, refreshClassroom }: { classroom: Classroom; refreshClassroom: () => Promise<Classroom> }) {
  const cls = classroom;
  const { accessToken, classrooms } = useClassroomStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", duration: 3600, isPublished: true, chapters: [] as { id: string; title: string; startTimeSec: number }[] });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadBytes, setUploadBytes] = useState({ loaded: 0, total: 0 });
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'preparing' | 'uploading' | 'saving'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Multipart tracking — null when using single-PUT path
  const [uploadPartInfo, setUploadPartInfo] = useState<{ part: number; totalParts: number } | null>(null);
  const [chapterInput, setChapterInput] = useState({ title: "", startTimeSec: 0 });
  const [activeRec, setActiveRec] = useState<any | null>(null);

  // Reuse Video states
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [selectedSourceClassroomId, setSelectedSourceClassroomId] = useState<string>("");
  const [selectedSourceRecordingId, setSelectedSourceRecordingId] = useState<string>("");
  const [reuseTitle, setReuseTitle] = useState("");
  const [reuseDescription, setReuseDescription] = useState("");
  const [isReusing, setIsReusing] = useState(false);
  const [reuseError, setReuseError] = useState<string | null>(null);

  const formatMB = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    if (!videoFile) {
      setUploadError('Please select a video file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadBytes({ loaded: 0, total: 0 });
    setUploadPhase('preparing');
    setUploadError(null);

    try {
      // Video goes directly to R2 — Railway never sees the file bytes
      await uploadClassroomRecordingToCloudflare({
        file: videoFile,
        classroom: classroom.id,
        title: form.title,
        description: form.description,
        duration: form.duration,
        isPublished: form.isPublished,
        chapters: form.chapters,
        onProgress: ({ loaded, total, percentage, part, totalParts }) => {
          setUploadPhase('uploading');
          setUploadProgress(percentage);
          setUploadBytes({ loaded, total });
          if (part != null && totalParts != null) {
            setUploadPartInfo({ part, totalParts });
          }
          if (percentage === 100) setUploadPhase('saving');
        },
      });
      setUploadPhase('idle');
      setForm({ title: "", description: "", duration: 3600, isPublished: false, chapters: [] });
      setVideoFile(null);
      setShowForm(false);
      await refreshClassroom();
    } catch (error) {
      setUploadPhase('idle');
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadBytes({ loaded: 0, total: 0 });
      setUploadPartInfo(null);
    }
  };

  const addChapter = () => {
    if (!chapterInput.title) return;
    setForm((f) => ({ ...f, chapters: [...f.chapters, { id: uid(), ...chapterInput }] }));
    setChapterInput({ title: "", startTimeSec: 0 });
  };

  const handleConfirmReuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceRecordingId || !reuseTitle) return;

    setIsReusing(true);
    setReuseError(null);
    try {
      await reuseClassroomRecording({
        sourceRecordingId: selectedSourceRecordingId,
        targetClassroomId: classroom.id,
        title: reuseTitle,
        description: reuseDescription,
      });
      setShowReuseModal(false);
      setSelectedSourceClassroomId("");
      setSelectedSourceRecordingId("");
      setReuseTitle("");
      setReuseDescription("");
      await refreshClassroom();
      alert("Video recording reused successfully!");
    } catch (err) {
      setReuseError(err instanceof Error ? err.message : "Failed to reuse recording");
    } finally {
      setIsReusing(false);
    }
  };

  const streamUrl = activeRec
    ? activeRec.storageProvider === 'cloudflare'
      ? `${getRecordingStreamUrl(activeRec.id)}${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`
      : activeRec.cloudflareUrl
    : '';

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-3">
        <button onClick={() => { setShowForm(!showForm); setShowReuseModal(false); }} className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-5 py-2.5 text-sm font-bold">
          <LuUpload className="h-4 w-4" /> Upload Recording
        </button>
        <button onClick={() => { setShowReuseModal(!showReuseModal); setShowForm(false); }} className="inline-flex items-center gap-2 rounded-full bg-cream/10 text-cream px-5 py-2.5 text-sm font-bold hover:bg-cream/20 transition-colors">
          <LuCopy className="h-4 w-4" /> Reuse Video from other Class
        </button>
      </div>

      {showReuseModal && (
        <DarkCard>
          <h3 className="font-display font-bold text-cream mb-4">Reuse Video from another Classroom</h3>
          <form onSubmit={handleConfirmReuse} className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Source Classroom *</label>
              <select
                required
                value={selectedSourceClassroomId}
                onChange={(e) => {
                  setSelectedSourceClassroomId(e.target.value);
                  setSelectedSourceRecordingId("");
                  setReuseTitle("");
                  setReuseDescription("");
                }}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50"
              >
                <option value="" className="bg-plum-dark">-- Select Class --</option>
                {classrooms
                  .filter((c) => c.id !== classroom.id && c.status === "active")
                  .map((c) => (
                    <option key={c.id} value={c.id} className="bg-plum-dark">
                      {c.name} ({c.code})
                    </option>
                  ))}
              </select>
            </div>

            {selectedSourceClassroomId && (() => {
              const sourceClassroom = classrooms.find(c => c.id === selectedSourceClassroomId);
              const recordings = sourceClassroom ? sourceClassroom.recordings : [];
              return (
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Select Recording *</label>
                  <select
                    required
                    value={selectedSourceRecordingId}
                    onChange={(e) => {
                      const recId = e.target.value;
                      setSelectedSourceRecordingId(recId);
                      const r = recordings.find(x => x.id === recId);
                      if (r) {
                        setReuseTitle(r.title);
                        setReuseDescription(r.description || "");
                      }
                    }}
                    className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50"
                  >
                    <option value="" className="bg-plum-dark">-- Select Recording --</option>
                    {recordings.map((r) => (
                      <option key={r.id} value={r.id} className="bg-plum-dark">
                        {r.title} ({Math.round(r.duration / 60)} min)
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {selectedSourceRecordingId && (
              <>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">New Recording Title *</label>
                  <input
                    required
                    value={reuseTitle}
                    onChange={(e) => setReuseTitle(e.target.value)}
                    placeholder="Enter title for this class"
                    className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">New Description</label>
                  <textarea
                    value={reuseDescription}
                    onChange={(e) => setReuseDescription(e.target.value)}
                    rows={2}
                    placeholder="Enter description for this class"
                    className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50 resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowReuseModal(false);
                  setSelectedSourceClassroomId("");
                  setSelectedSourceRecordingId("");
                  setReuseTitle("");
                  setReuseDescription("");
                }}
                disabled={isReusing}
                className="flex-1 rounded-full bg-cream/10 text-cream py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedSourceRecordingId || !reuseTitle || isReusing}
                className="flex-1 rounded-full bg-lime text-plum-dark py-2.5 text-sm font-bold disabled:opacity-60"
              >
                {isReusing ? 'Reusing...' : 'Reuse Recording'}
              </button>
            </div>
            {reuseError && <p className="text-sm text-red-400 mt-1">{reuseError}</p>}
          </form>
        </DarkCard>
      )}

      {showForm && (
        <DarkCard>
          <h3 className="font-display font-bold text-cream mb-4">Upload Recorded Class</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Recording Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Module 3: Advanced Haemodynamics" className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Video File *</label>
              <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                className="w-full text-cream text-sm file:bg-cream/10 file:border-cream/10 file:rounded-xl file:px-3 file:py-2 file:text-cream" />
              {videoFile && (() => {
                const mb = videoFile.size / (1024 * 1024);
                const CHUNK_MB = 50;
                const isMultipart = mb >= CHUNK_MB;
                const parts = isMultipart ? Math.ceil(mb / CHUNK_MB) : null;
                return (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-cream/50">
                      {videoFile.name} &mdash; {mb.toFixed(1)} MB
                    </span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${isMultipart ? 'bg-lime/15 text-lime' : 'bg-cream/10 text-cream/60'
                      }`}>
                      {isMultipart
                        ? `⚡ Multipart · ${parts} × 50 MB chunks`
                        : '↑ Single upload'}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50 resize-none" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Duration (seconds)</label>
              <input type="number" min={60} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>

            {/* Chapter markers */}
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-2">Chapter Markers</label>
              <div className="flex gap-2 mb-2">
                <input value={chapterInput.title} onChange={(e) => setChapterInput({ ...chapterInput, title: e.target.value })}
                  placeholder="Chapter title" className="flex-1 bg-cream/5 border border-cream/10 rounded-xl px-3 py-2 text-cream text-xs outline-none focus:border-lime/50" />
                <input type="number" min={0} value={chapterInput.startTimeSec} onChange={(e) => setChapterInput({ ...chapterInput, startTimeSec: Number(e.target.value) })}
                  placeholder="Start (sec)" className="w-24 bg-cream/5 border border-cream/10 rounded-xl px-3 py-2 text-cream text-xs outline-none focus:border-lime/50" />
                <button type="button" onClick={addChapter} className="rounded-xl bg-lime/10 text-lime px-3 py-2 text-xs font-bold">+ Add</button>
              </div>
              {form.chapters.map((ch, i) => (
                <div key={ch.id} className="flex items-center gap-2 bg-cream/5 rounded-lg px-3 py-1.5 mb-1 text-xs text-cream/80">
                  <span className="font-mono text-lime">{Math.floor(ch.startTimeSec / 60).toString().padStart(2, "0")}:{(ch.startTimeSec % 60).toString().padStart(2, "0")}</span>
                  <span className="flex-1">{ch.title}</span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, chapters: f.chapters.filter((_, ci) => ci !== i) }))} className="text-cream/40 hover:text-red-400"><LuX className="h-3 w-3" /></button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="accent-lime" />
              <span className="text-cream/80 text-sm">Publish immediately (notify students)</span>
            </label>

            {/* ── Upload Progress ─────────────────────────────────────────── */}
            {uploading && (
              <div className="rounded-xl bg-cream/5 border border-cream/10 p-4 space-y-3">

                {/* Phase label + percentage */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cream/80">
                    {uploadPhase === 'preparing' && (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full border-2 border-lime border-t-transparent animate-spin" />
                        {uploadPartInfo
                          ? `Initiating multipart upload…`
                          : 'Preparing upload…'}
                      </span>
                    )}
                    {uploadPhase === 'uploading' && uploadPartInfo && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-lime animate-pulse" />
                        Part&nbsp;
                        <span className="text-lime font-bold">{uploadPartInfo.part}</span>
                        &nbsp;of&nbsp;
                        <span className="text-lime font-bold">{uploadPartInfo.totalParts}</span>
                        &nbsp;uploading…
                      </span>
                    )}
                    {uploadPhase === 'uploading' && !uploadPartInfo && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-lime animate-pulse" />
                        Uploading to cloud…
                      </span>
                    )}
                    {uploadPhase === 'saving' && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-lime" />
                        Saving metadata…
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-lime text-sm font-bold">{uploadProgress}%</span>
                </div>

                {/* Progress bar with part segments */}
                <div className="relative w-full h-3 bg-cream/10 rounded-full overflow-hidden">
                  {/* filled bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-lime rounded-full transition-all duration-200"
                    style={{ width: `${uploadPhase === 'saving' ? 100 : uploadProgress}%` }}
                  />
                  {/* part segment ticks — shown only for multipart */}
                  {uploadPartInfo && uploadPartInfo.totalParts > 1 && (
                    Array.from({ length: uploadPartInfo.totalParts - 1 }, (_, i) => {
                      const pct = ((i + 1) / uploadPartInfo.totalParts) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute inset-y-0 w-px bg-cream/20"
                          style={{ left: `${pct}%` }}
                        />
                      );
                    })
                  )}
                </div>

                {/* Byte counter + strategy badge */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cream/50 font-mono">
                    {uploadPhase === 'uploading'
                      ? `${formatMB(uploadBytes.loaded)} / ${formatMB(uploadBytes.total)}`
                      : uploadPhase === 'saving'
                        ? `${formatMB(uploadBytes.total)} — assembling on R2…`
                        : 'Connecting…'}
                  </span>
                  <span className={`uppercase tracking-widest font-bold px-2 py-0.5 rounded ${uploadPartInfo ? 'bg-lime/15 text-lime' : 'bg-cream/10 text-cream/50'
                    }`}>
                    {uploadPartInfo
                      ? `⚡ Multipart · ${uploadPartInfo.totalParts} chunks`
                      : '↑ Direct upload'}
                  </span>
                </div>

              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} disabled={uploading} className="flex-1 rounded-full bg-cream/10 text-cream py-2.5 text-sm font-semibold disabled:opacity-40">Cancel</button>
              <button type="submit" disabled={uploading} className="flex-1 rounded-full bg-lime text-plum-dark py-2.5 text-sm font-bold disabled:opacity-60">
                {uploading ? (
                  uploadPhase === 'saving'
                    ? 'Saving…'
                    : uploadPartInfo
                      ? `Part ${uploadPartInfo.part}/${uploadPartInfo.totalParts} — ${uploadProgress}%`
                      : uploadProgress > 0
                        ? `Uploading… ${uploadProgress}%`
                        : 'Preparing…'
                ) : 'Save Recording'}
              </button>
            </div>
            {uploadError && <p className="text-sm text-red-400 mt-1">{uploadError}</p>}
          </form>
        </DarkCard>
      )}

      {/* Recording cards */}
      {cls.recordings.length === 0 && (
        <DarkCard className="text-center py-12">
          <LuBookOpen className="h-8 w-8 text-cream/20 mx-auto mb-2" />
          <p className="text-cream/50 text-sm">No recordings uploaded yet.</p>
        </DarkCard>
      )}
      <div className="space-y-3">
        {cls.recordings.map((rec) => {
          const avgWatch = rec.viewStats.length
            ? Math.round(rec.viewStats.reduce((s, v) => s + v.watchedPercent, 0) / rec.viewStats.length)
            : 0;
          return (
            <DarkCard key={rec.id}>
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <button
                  onClick={() => setActiveRec(rec)}
                  className="w-20 h-14 rounded-lg bg-linear-to-br from-lime/20 to-lime/5 flex items-center justify-center shrink-0 hover:from-lime/30 hover:to-lime/10 transition-colors"
                >
                  <LuPlay className="h-5 w-5 text-lime" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-cream text-sm">{rec.title}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${rec.isPublished ? "bg-lime/20 text-lime" : "bg-cream/10 text-cream/60"}`}>
                      {rec.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-cream/60 text-xs mt-0.5 line-clamp-1">{rec.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-cream/50 font-mono">{formatDuration(rec.duration)}</span>
                    <span className="text-xs text-cream/50">{rec.viewStats.length} viewers · {avgWatch}% avg watched</span>
                    <span className="text-xs text-cream/50">{rec.chapters.length} chapters</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setActiveRec(rec)}
                    className="rounded-full bg-lime text-plum-dark px-3.5 py-1.5 text-xs font-bold flex items-center gap-1 hover:bg-lime/90 transition-colors"
                  >
                    <LuPlay className="h-3 w-3 fill-plum-dark animate-pulse" /> Watch
                  </button>
                  <button
                    onClick={async () => {
                      console.log("PUBLISH BUTTON CLICKED");
                      console.log("Recording:", rec);
                      console.log("Recording ID:", rec.id);
                      console.log("Published:", rec.isPublished);

                      try {
                        if (rec.isPublished) {
                          console.log("Calling unpublishRecording...");
                          await unpublishRecording(rec.id);
                        } else {
                          console.log("Calling publishRecording...");
                          await publishRecording(rec.id);
                        }

                        console.log("Refresh classroom...");
                        await refreshClassroom();
                      } catch (error) {
                        console.error("Publish/Unpublish Error:", error);
                      }
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 ${rec.isPublished ? "bg-cream/10 text-cream/70" : "bg-lime/10 text-lime"}`}
                  >
                    {rec.isPublished ? <><LuEyeOff className="h-3 w-3" /> Unpublish</> : <><LuEye className="h-3 w-3" /> Publish</>}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteRecording(rec.id);
                        await refreshClassroom();
                      } catch (error) {
                        console.error('Failed to delete recording', error);
                      }
                    }}
                    className="rounded-full bg-cream/5 text-cream/40 hover:text-red-400 p-2">
                    <LuTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {/* View analytics */}
              {rec.viewStats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cream/10">
                  <div className="text-[10px] uppercase tracking-widest text-cream/50 mb-2">Viewer Progress</div>
                  <div className="space-y-1.5">
                    {rec.viewStats.map((vs) => (
                      <div key={vs.studentId} className="flex items-center gap-3">
                        <span className="text-xs text-cream/80 w-32 truncate">{vs.studentName}</span>
                        <div className="flex-1 h-1.5 bg-cream/10 rounded-full overflow-hidden">
                          <div className="h-full bg-lime rounded-full" style={{ width: `${vs.watchedPercent}%` }} />
                        </div>
                        <span className="text-xs font-mono text-cream/60 w-8">{vs.watchedPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DarkCard>
          );
        })}
      </div>

      {/* Admin Video Preview Modal */}
      {activeRec && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#110D26] border-b border-cream/10">
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm truncate">{activeRec.title}</span>
              <span className="text-cream/50 text-[10px] uppercase tracking-widest font-mono font-medium">Admin Video Preview</span>
            </div>
            <button
              onClick={() => setActiveRec(null)}
              className="text-white/60 hover:text-white p-1 hover:bg-cream/10 rounded-full transition-colors"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>

          {/* Player area */}
          <div className="flex flex-1 relative">
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {streamUrl ? (
                <video
                  src={streamUrl}
                  crossOrigin="use-credentials"
                  className="w-full h-full max-h-[85vh] object-contain bg-black"
                  controls
                  autoPlay
                  poster="/default-video-thumb.jpg"
                />
              ) : (
                <p className="text-cream/50 text-sm">Video stream URL not configured.</p>
              )}
            </div>

            {/* Chapters sidebar */}
            {activeRec.chapters && activeRec.chapters.length > 0 && (
              <div className="w-64 bg-[#110D26] border-l border-cream/10 overflow-y-auto animate-in slide-in-from-right duration-250">
                <div className="p-3 border-b border-cream/10 text-white/70 text-xs uppercase tracking-widest font-bold">Chapters</div>
                {activeRec.chapters.map((ch: any) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      const video = document.querySelector('video');
                      if (video) {
                        video.currentTime = ch.startTimeSec;
                        video.play().catch(() => { });
                      }
                    }}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-cream/5 border-b border-cream/5 text-cream/70 hover:text-cream transition-colors"
                  >
                    <span className="font-mono text-[10px] text-lime font-bold shrink-0">
                      {Math.floor(ch.startTimeSec / 60).toString().padStart(2, "0")}:{(ch.startTimeSec % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="text-xs truncate font-medium">{ch.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Builder Tab ─────────────────────────────────────────────────────────

function newQuestion(order: number, defaultMarks: number = 1): Question {
  return {
    id: uid(),
    type: "mcq",
    text: "",
    marks: defaultMarks,
    explanation: "",
    order,
    options: [
      { label: "A", text: "", isCorrect: false },
      { label: "B", text: "", isCorrect: false },
      { label: "C", text: "", isCorrect: false },
      { label: "D", text: "", isCorrect: false },
    ],
  };
}

function QuestionCard({ q, qIdx, onChange, onRemove }: {
  q: Question; qIdx: number;
  onChange: (updated: Question) => void;
  onRemove: () => void;
}) {
  const setType = (type: Question["type"]) => {
    const opts: Option[] = type === "true_false"
      ? [{ label: "True", text: "True", isCorrect: true }, { label: "False", text: "False", isCorrect: false }]
      : [{ label: "A", text: "", isCorrect: false }, { label: "B", text: "", isCorrect: false }, { label: "C", text: "", isCorrect: false }, { label: "D", text: "", isCorrect: false }];
    onChange({ ...q, type, options: opts });
  };

  const toggleCorrect = (label: string) => {
    onChange({
      ...q,
      options: q.options.map((o) => ({
        ...o,
        isCorrect: q.type === "msq" ? (o.label === label ? !o.isCorrect : o.isCorrect) : (o.label === label),
      })),
    });
  };

  const LABELS = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="rounded-xl bg-cream/3 border border-cream/10 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-lime/10 text-lime text-xs font-bold shrink-0">Q{qIdx + 1}</span>
        <select value={q.type} onChange={(e) => setType(e.target.value as Question["type"])}
          className="bg-cream/5 border border-cream/10 rounded-lg px-3 py-1.5 text-cream text-xs outline-none">
          <option value="mcq">Single Correct (MCQ)</option>
          <option value="msq">Multiple Correct (MSQ)</option>
          <option value="true_false">True / False</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <input type="number" min={0.5} step={0.5} value={q.marks} onChange={(e) => onChange({ ...q, marks: Number(e.target.value) })}
            className="w-16 bg-cream/5 border border-cream/10 rounded-lg px-2 py-1.5 text-cream text-xs outline-none text-center" />
          <span className="text-cream/50 text-xs">marks</span>
          <button onClick={onRemove} className="text-cream/30 hover:text-red-400 ml-2"><LuTrash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <textarea value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })}
        placeholder={`Question ${qIdx + 1} text…`} rows={2}
        className="w-full bg-cream/5 border border-cream/10 rounded-xl px-3 py-2.5 text-cream text-sm outline-none focus:border-lime/50 resize-none" />

      <div className="space-y-2">
        {q.options.map((opt, oi) => (
          <div key={opt.label} className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${opt.isCorrect ? "border-lime/40 bg-lime/5" : "border-cream/10 bg-cream/2"}`}>
            <button onClick={() => toggleCorrect(opt.label)}
              className={`h-5 w-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold border transition-colors ${opt.isCorrect ? "bg-lime border-lime text-plum-dark" : "border-cream/30 text-cream/50"}`}>
              {opt.isCorrect ? <LuCheck className="h-3 w-3" /> : opt.label}
            </button>
            {q.type === "true_false" ? (
              <span className="flex-1 text-sm text-cream/80">{opt.text}</span>
            ) : (
              <input value={opt.text} onChange={(e) => {
                const opts = [...q.options]; opts[oi] = { ...opts[oi], text: e.target.value };
                onChange({ ...q, options: opts });
              }} placeholder={`Option ${opt.label}`} className="flex-1 bg-transparent outline-none text-sm text-cream placeholder:text-cream/30" />
            )}
          </div>
        ))}
        {q.type !== "true_false" && q.options.length < 6 && (
          <button onClick={() => onChange({ ...q, options: [...q.options, { label: LABELS[q.options.length] || `Opt${q.options.length + 1}`, text: "", isCorrect: false }] })}
            className="text-lime/70 hover:text-lime text-xs flex items-center gap-1 mt-1">
            <LuPlus className="h-3 w-3" /> Add option
          </button>
        )}
      </div>
      <input value={q.explanation} onChange={(e) => onChange({ ...q, explanation: e.target.value })}
        placeholder="Explanation shown to student after submission (optional)" className="w-full bg-cream/5 border border-cream/10 rounded-xl px-3 py-2 text-cream/70 text-xs outline-none focus:border-lime/50" />
    </div>
  );
}

function TestsTab({ classroom, refreshClassroom }: { classroom: Classroom; refreshClassroom: () => Promise<Classroom> }) {
  const cls = classroom;
  const classroomId = classroom.id;
  const { classrooms } = useClassroomStore();
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [quizOperationQuizId, setQuizOperationQuizId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewQuizId, setViewQuizId] = useState<string | null>(null);
  const [reportAttempts, setReportAttempts] = useState<QuizAttempt[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [duplicateQuiz, setDuplicateQuiz] = useState<Quiz | null>(null);
  const [selectedTargetClassrooms, setSelectedTargetClassrooms] = useState<string[]>([]);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [bulkMarksEnabled, setBulkMarksEnabled] = useState(false);
  const [bulkMarksValue, setBulkMarksValue] = useState(4);
  const [bulkNegEnabled, setBulkNegEnabled] = useState(false);
  const [bulkNegValue, setBulkNegValue] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  React.useEffect(() => {
    if (!viewQuizId) {
      setReportAttempts([]);
      setReportError("");
      return;
    }
    let active = true;
    const loadReport = async () => {
      setIsLoadingReport(true);
      setReportError("");
      try {
        const attempts = await getQuizReport(viewQuizId);
        if (!active) return;
        setReportAttempts(attempts);
      } catch (err) {
        if (active) setReportError(err instanceof Error ? err.message : "Could not load quiz report");
      } finally {
        if (active) setIsLoadingReport(false);
      }
    };
    loadReport();
    return () => {
      active = false;
    };
  }, [viewQuizId]);

  const [quiz, setQuiz] = useState<Omit<Quiz, "id" | "attempts">>({
    title: "", instructions: "", duration: null, maxAttempts: 1,
    randomizeQuestions: true, randomizeOptions: true,
    showLeaderboard: false, negativeMarking: true,
    negativeMarkValue: 1, passPercent: 60,
    availableFrom: "", availableUntil: "",
    status: "draft", questions: [],
  });

  const updateQ = (idx: number, updated: Question) => {
    setQuiz((q) => { const qs = [...q.questions]; qs[idx] = updated; return { ...q, questions: qs }; });
    if (updated.marks !== bulkMarksValue) {
      setBulkMarksEnabled(false);
    }
  };

  const totalMarks = quiz.questions.reduce((s, q) => s + q.marks, 0);

  const handleSave = async (status: Quiz["status"]) => {
    if (!quiz.title || quiz.questions.length === 0) return;
    setSaveError(null);
    setIsSavingQuiz(true);
    try {
      if (editingQuizId) {
        const updatedQuiz = await updateQuiz(editingQuizId, { ...quiz, status });
        classroomActions.updateQuiz(classroomId, editingQuizId, updatedQuiz);
      } else {
        const createdQuiz = await createQuiz(classroomId, { ...quiz, status });
        classroomActions.addQuiz(classroomId, createdQuiz);
      }
      setShowBuilder(false);
      setEditingQuizId(null);
      setQuiz({ title: "", instructions: "", duration: null, maxAttempts: 1, randomizeQuestions: true, randomizeOptions: true, showLeaderboard: false, negativeMarking: true, negativeMarkValue: 1, passPercent: 60, availableFrom: "", availableUntil: "", status: "draft", questions: [] });
      setBulkMarksEnabled(false);
      setBulkMarksValue(4);
      setBulkNegEnabled(false);
      setBulkNegValue(1);
    } catch (error) {
      console.error(error);
      setSaveError(error instanceof Error ? error.message : 'Could not save quiz.');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsGeneratingPdf(true);
    setPdfError("");
    try {
      const generatedQuestions = await generateQuizFromPdf(file);
      if (generatedQuestions && Array.isArray(generatedQuestions)) {
        // Map unique IDs and orders to the generated questions
        const newQuestions = generatedQuestions.map((q: any, i: number) => ({
          id: uid(),
          type: q.type || "mcq",
          text: q.text,
          marks: q.marks || 1,
          explanation: q.explanation || "",
          order: quiz.questions.length + i + 1,
          options: (q.options || []).map((o: any) => ({
            label: o.label,
            text: o.text,
            isCorrect: !!o.isCorrect
          }))
        }));
        
        setQuiz(prev => ({
          ...prev,
          questions: [...prev.questions, ...newQuestions]
        }));
      }
    } catch (error) {
      console.error("PDF Generation error:", error);
      setPdfError(error instanceof Error ? error.message : "Failed to generate questions from PDF");
    } finally {
      setIsGeneratingPdf(false);
      // Reset input value to allow re-upload of same file if needed
      e.target.value = "";
    }
  };

  const handlePublishQuiz = async (quizId: string) => {
    setQuizOperationQuizId(quizId);
    try {
      await publishQuiz(quizId);
      classroomActions.updateQuizStatus(classroomId, quizId, "published");
    } catch (error) {
      console.error(error);
    } finally {
      setQuizOperationQuizId(null);
    }
  };

  const handleCloseQuiz = async (quizId: string) => {
    setQuizOperationQuizId(quizId);
    try {
      await closeQuiz(quizId);
      classroomActions.updateQuizStatus(classroomId, quizId, "closed");
    } catch (error) {
      console.error(error);
    } finally {
      setQuizOperationQuizId(null);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    setQuizOperationQuizId(quizId);
    try {
      await apiDeleteQuiz(quizId);
      classroomActions.deleteQuiz(classroomId, quizId);
    } catch (error) {
      console.error(error);
    } finally {
      setQuizOperationQuizId(null);
    }
  };

  const handleDownloadQuiz = (q: Quiz, format: 'pdf' | 'doc') => {
    const totalMarks = q.questions.reduce((s, quest) => s + quest.marks, 0);
    
    // Create professional HTML structure
    let htmlContent = `
      <div class="header">
        <h1>${cls.name}</h1>
        <h2>${q.title}</h2>
        <div class="meta">
          <span><strong>Total Marks:</strong> ${totalMarks}</span>
          <span><strong>Time:</strong> ${q.duration ? q.duration + ' mins' : 'N/A'}</span>
        </div>
        ${q.instructions ? `<p class="instructions"><strong>Instructions:</strong> ${q.instructions}</p>` : ''}
      </div>
      <div class="questions">
    `;

    q.questions.forEach((quest, i) => {
      htmlContent += `
        <div class="question">
          <div class="q-header">
            <span class="q-num">Q${i + 1}.</span>
            <span class="q-text">${quest.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
            <span class="q-marks">[${quest.marks} Marks]</span>
          </div>
          <div class="options">
      `;
      quest.options.forEach((opt) => {
        htmlContent += `
            <div class="option">
              <strong>${opt.label})</strong> ${opt.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
        `;
      });
      htmlContent += `</div></div>`; // end options and question
    });
    
    htmlContent += `</div>`;

    const fullHtml = `
      <html>
        <head>
          <title>${q.title}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.5; padding: 40px; color: black; background: white; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0 0 10px 0; font-size: 24px; text-transform: uppercase; }
            .header h2 { margin: 0 0 15px 0; font-size: 20px; font-weight: normal; }
            .meta { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
            .instructions { font-size: 14px; text-align: left; font-style: italic; }
            .question { margin-bottom: 25px; page-break-inside: avoid; }
            .q-header { display: flex; align-items: flex-start; margin-bottom: 10px; }
            .q-num { font-weight: bold; margin-right: 10px; min-width: 30px; }
            .q-text { flex-grow: 1; }
            .q-marks { font-size: 12px; font-weight: bold; margin-left: 15px; white-space: nowrap; }
            .options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-left: 40px; margin-bottom: 10px; }
            .option { font-size: 14px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;

    if (format === 'doc') {
      const blob = new Blob(['\ufeff', fullHtml], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${q.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_quiz.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        alert("Please allow popups to generate PDF");
      }
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateQuiz || selectedTargetClassrooms.length === 0) return;
    setIsDuplicating(true);
    try {
      const quizData = {
        title: `${duplicateQuiz.title}`,
        instructions: duplicateQuiz.instructions,
        duration: duplicateQuiz.duration,
        maxAttempts: duplicateQuiz.maxAttempts,
        randomizeQuestions: duplicateQuiz.randomizeQuestions,
        randomizeOptions: duplicateQuiz.randomizeOptions,
        showLeaderboard: duplicateQuiz.showLeaderboard,
        negativeMarking: duplicateQuiz.negativeMarking,
        negativeMarkValue: duplicateQuiz.negativeMarkValue,
        passPercent: duplicateQuiz.passPercent,
        availableFrom: duplicateQuiz.availableFrom,
        availableUntil: duplicateQuiz.availableUntil,
        status: "draft",
        questions: duplicateQuiz.questions.map((quest) => ({
          type: quest.type,
          text: quest.text,
          marks: quest.marks,
          explanation: quest.explanation,
          options: quest.options.map((o) => ({
            label: o.label,
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        })),
      };

      for (const targetId of selectedTargetClassrooms) {
        await createQuiz(targetId, quizData);
      }

      alert("Quiz duplicated successfully to selected class(es)!");
      setDuplicateQuiz(null);
      setSelectedTargetClassrooms([]);
      await refreshClassroom();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Duplication failed");
    } finally {
      setIsDuplicating(false);
    }
  };

  if (showBuilder) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            setShowBuilder(false);
            setEditingQuizId(null);
            setQuiz({ title: "", instructions: "", duration: null, maxAttempts: 1, randomizeQuestions: true, randomizeOptions: true, showLeaderboard: false, negativeMarking: false, negativeMarkValue: 0.25, passPercent: 60, availableFrom: "", availableUntil: "", status: "draft", questions: [] });
            setBulkMarksEnabled(false);
            setBulkMarksValue(1);
            setBulkNegEnabled(true);
            setBulkNegValue(1);
          }} className="text-cream/60 hover:text-cream"><LuArrowLeft className="h-5 w-5" /></button>
          <h2 className="font-display font-bold text-cream text-xl">{editingQuizId ? "Edit Quiz" : "Quiz Builder"}</h2>
        </div>

        {/* Settings */}
        <DarkCard className="space-y-4">
          <h3 className="font-display font-bold text-cream">Quiz Settings</h3>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Quiz Title *</label>
            <input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              placeholder="e.g. Module 2 Assessment — Ventilator Management" className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Instructions for students</label>
            <textarea value={quiz.instructions} onChange={(e) => setQuiz({ ...quiz, instructions: e.target.value })}
              rows={2} className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50 resize-none" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Timer (min, blank = no timer)</label>
              <input type="number" min={1} value={quiz.duration ?? ""} onChange={(e) => setQuiz({ ...quiz, duration: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Max Attempts</label>
              <input type="number" min={1} value={quiz.maxAttempts} onChange={(e) => setQuiz({ ...quiz, maxAttempts: Number(e.target.value) })}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Pass Mark %</label>
              <input type="number" min={1} max={100} value={quiz.passPercent} onChange={(e) => setQuiz({ ...quiz, passPercent: Number(e.target.value) })}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Available From</label>
              <input type="datetime-local" value={quiz.availableFrom} onChange={(e) => setQuiz({ ...quiz, availableFrom: e.target.value })}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-cream/60 block mb-1">Available Until</label>
              <input type="datetime-local" value={quiz.availableUntil} onChange={(e) => setQuiz({ ...quiz, availableUntil: e.target.value })}
                className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-2.5 text-cream text-sm outline-none focus:border-lime/50" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "randomizeQuestions", label: "Randomize question order" },
              { key: "randomizeOptions", label: "Randomize option order" },
              { key: "negativeMarking", label: "Negative marking (−1/wrong)" },
              { key: "showLeaderboard", label: "Show leaderboard to students" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(quiz[key as keyof typeof quiz])}
                  onChange={(e) => setQuiz({ ...quiz, [key]: e.target.checked })} className="accent-lime" />
                <span className="text-cream/80 text-sm">{label}</span>
              </label>
            ))}
          </div>
        </DarkCard>

        {/* Bulk Marks Setter — Checkbox approach */}
        {quiz.questions.length > 0 && (
          <DarkCard className="space-y-3">
            <span className="text-cream/70 text-sm font-semibold">Quick apply to all questions:</span>
            <div className="flex flex-wrap gap-4">
              {/* Fix Marks */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bulkMarksEnabled}
                  className="accent-lime h-4 w-4"
                  onChange={(e) => {
                    setBulkMarksEnabled(e.target.checked);
                    if (e.target.checked) {
                      setQuiz(q => ({ ...q, questions: q.questions.map(quest => ({ ...quest, marks: bulkMarksValue })) }));
                    }
                  }}
                />
                <span className="text-cream/80 text-sm">Fix marks:</span>
                <input
                  type="number" min={0.5} step={0.5}
                  value={bulkMarksValue}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBulkMarksValue(val);
                    if (bulkMarksEnabled && val > 0) {
                      setQuiz(q => ({ ...q, questions: q.questions.map(quest => ({ ...quest, marks: val })) }));
                    }
                  }}
                  className="w-16 bg-cream/5 border border-cream/20 rounded-lg px-2 py-1 text-cream text-xs outline-none text-center focus:border-lime/50"
                />
                <span className="text-cream/50 text-xs">marks / question</span>
              </label>

              {/* Fix Negative Marks */}
              {quiz.negativeMarking && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkNegEnabled}
                    className="accent-red-400 h-4 w-4"
                    onChange={(e) => {
                      setBulkNegEnabled(e.target.checked);
                      if (e.target.checked) {
                        setQuiz(q => ({ ...q, negativeMarkValue: bulkNegValue }));
                      }
                    }}
                  />
                  <span className="text-cream/80 text-sm">Fix negative mark:</span>
                  <input
                    type="number" min={0.25} step={0.25}
                    value={bulkNegValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBulkNegValue(val);
                      if (bulkNegEnabled && val > 0) {
                        setQuiz(q => ({ ...q, negativeMarkValue: val }));
                      }
                    }}
                    className="w-16 bg-cream/5 border border-cream/20 rounded-lg px-2 py-1 text-cream text-xs outline-none text-center focus:border-red-400/50"
                  />
                  <span className="text-cream/50 text-xs">marks deducted</span>
                </label>
              )}
            </div>
          </DarkCard>
        )}

        {/* Questions */}
        <div className="space-y-3">
          {quiz.questions.map((q, i) => (
            <QuestionCard key={q.id} q={q} qIdx={i} onChange={(u) => updateQ(i, u)} onRemove={() => setQuiz((qz) => ({ ...qz, questions: qz.questions.filter((_, ci) => ci !== i) }))} />
          ))}
        </div>

        {pdfError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{pdfError}</div>}
        
        <div className="flex gap-3">
          <button onClick={() => setQuiz((q) => ({ ...q, questions: [...q.questions, newQuestion(q.questions.length + 1, bulkMarksEnabled ? bulkMarksValue : 1)] }))}
            className="flex-1 rounded-2xl border-2 border-dashed border-lime/20 hover:border-lime/40 py-5 text-lime/70 hover:text-lime text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <LuPlus className="h-4 w-4" /> Add Question
          </button>
          <label className={`flex-1 rounded-2xl border-2 border-dashed border-lime/20 hover:border-lime/40 py-5 text-lime/70 hover:text-lime text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${isGeneratingPdf ? 'opacity-50 pointer-events-none' : ''}`}>
            <LuUpload className="h-4 w-4" /> {isGeneratingPdf ? 'Generating...' : 'Upload PDF (AI)'}
            <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={isGeneratingPdf} />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-cream/5 px-5 py-3">
          <span className="text-cream/60 text-sm">Questions: <strong className="text-cream">{quiz.questions.length}</strong></span>
          <span className="text-cream/60 text-sm">Total marks: <strong className="text-cream">{totalMarks}</strong></span>
          <span className="text-cream/60 text-sm">Est. time: <strong className="text-cream">~{quiz.questions.length * 2}m</strong></span>
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleSave("draft")}
            disabled={quiz.questions.length === 0 || isSavingQuiz}
            className="flex-1 rounded-full bg-cream/10 text-cream py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {isSavingQuiz ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave("published")}
            disabled={quiz.questions.length === 0 || isSavingQuiz}
            className="flex-1 rounded-full bg-lime text-plum-dark py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
            {isSavingQuiz ? 'Publishing...' : 'Publish & Notify Students'}
          </button>
        </div>
        {saveError && <p className="text-sm text-red-400 mt-2">{saveError}</p>}
      </div>
    );
  }

  // Quiz Report View
  if (viewQuizId) {
    const q = cls.quizzes.find((x) => x.id === viewQuizId);
    if (!q) return null;
    const submitted = reportAttempts.filter((a) => a.status === "submitted");
    const passRate = submitted.length ? Math.round(submitted.filter((a) => a.score.passed).length / submitted.length * 100) : 0;
    const avgScore = submitted.length ? Math.round(submitted.reduce((s, a) => s + a.score.percentage, 0) / submitted.length) : 0;

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewQuizId(null)} className="text-cream/60 hover:text-cream"><LuArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <h2 className="font-display font-bold text-cream">{q.title} — Report</h2>
            <p className="text-cream/60 text-xs">
              {isLoadingReport ? "Loading submissions…" : `${submitted.length} submissions · ${passRate}% pass rate · ${avgScore}% avg score`}
            </p>
          </div>
          <button
            onClick={() => void refreshClassroom().then(() => getQuizReport(viewQuizId).then(setReportAttempts))}
            disabled={isLoadingReport}
            className="rounded-full bg-cream/10 text-cream px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        {reportError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {reportError}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[{ l: "Submitted", v: submitted.length }, { l: "Pass Rate", v: `${passRate}%` }, { l: "Avg Score", v: `${avgScore}%` }].map((s) => (
            <div key={s.l} className="rounded-2xl bg-[#1A0F33] border border-cream/10 p-4 text-center">
              <div className="text-[10px] uppercase tracking-widest text-cream/60">{s.l}</div>
              <div className="font-display text-2xl font-bold text-cream mt-1">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="p-0 overflow-hidden">
          <DarkCard className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream/5">
                <tr className="text-[10px] uppercase tracking-widest text-cream/60 text-left">
                  <th className="p-4">Student</th>
                  <th>Score</th>
                  <th>%</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((att) => (
                  <tr key={att.id} className="border-t border-cream/10 hover:bg-cream/5">
                    <td className="p-4 font-semibold text-cream">{att.studentName}</td>
                    <td className="font-mono text-cream/80">{att.score.rawMarks}/{att.score.totalMarks}</td>
                    <td className="font-mono text-cream/80">{att.score.percentage}%</td>
                    <td><span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${att.score.passed ? "bg-lime/20 text-lime" : "bg-red-500/20 text-red-300"}`}>{att.score.passed ? "Pass" : "Fail"}</span></td>
                    <td className="text-cream/60 text-xs">{att.submittedAt ? fmtDate(att.submittedAt) : "—"}</td>
                  </tr>
                ))}
                {isLoadingReport && (<tr><td colSpan={5} className="p-6 text-center text-cream/50 text-sm">Loading report…</td></tr>)}
                {!isLoadingReport && submitted.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-cream/50 text-sm">No submissions yet.</td></tr>)}
              </tbody>
            </table>
          </DarkCard>
        </div>
      </div>
    );
  }

  // Quiz list
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => {
          setEditingQuizId(null);
          setQuiz({ title: "", instructions: "", duration: null, maxAttempts: 1, randomizeQuestions: true, randomizeOptions: true, showLeaderboard: false, negativeMarking:true , negativeMarkValue: 1, passPercent: 60, availableFrom: "", availableUntil: "", status: "draft", questions: [] });
          setBulkMarksEnabled(false);
          setBulkMarksValue(1);
          setBulkNegEnabled(false);
          setBulkNegValue(1);
          setShowBuilder(true);
        }} className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-5 py-2.5 text-sm font-bold">
          <LuPlus className="h-4 w-4" /> Create Quiz
        </button>
      </div>

      {cls.quizzes.length === 0 && (
        <DarkCard className="text-center py-12">
          <LuClipboardList className="h-8 w-8 text-cream/20 mx-auto mb-2" />
          <p className="text-cream/50 text-sm">No quizzes created yet.</p>
        </DarkCard>
      )}

      <div className="space-y-3">
        {cls.quizzes.map((q) => {
          const subCount = q.attempts.filter((a) => a.status === "submitted").length;
          return (
            <DarkCard key={q.id}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-cream">{q.title}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${q.status === "published" ? "bg-lime/20 text-lime" : q.status === "closed" ? "bg-cream/10 text-cream/60" : "bg-yellow-500/20 text-yellow-300"}`}>
                      {q.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-cream/60">
                    <span>{q.questions.length} questions</span>
                    <span>{q.questions.reduce((s, x) => s + x.marks, 0)} total marks</span>
                    {q.duration && <span>{q.duration} min timer</span>}
                    <span>{subCount} submissions</span>
                    <span>Pass: {q.passPercent}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewQuizId(q.id)} className="rounded-full bg-cream/10 text-cream px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-cream/20 transition-colors">
                    <LuEye className="h-3 w-3" /> Report
                  </button>
                  <button
                    onClick={() => {
                      setEditingQuizId(q.id);
                      setQuiz({
                        title: q.title,
                        instructions: q.instructions || "",
                        duration: q.duration,
                        maxAttempts: q.maxAttempts || 1,
                        randomizeQuestions: q.randomizeQuestions ?? true,
                        randomizeOptions: q.randomizeOptions ?? true,
                        showLeaderboard: q.showLeaderboard ?? false,
                        negativeMarking: q.negativeMarking ?? false,
                        negativeMarkValue: q.negativeMarkValue ?? 0.25,
                        passPercent: q.passPercent || 60,
                        availableFrom: q.availableFrom || "",
                        availableUntil: q.availableUntil || "",
                        status: q.status || "draft",
                        questions: q.questions || [],
                      });
                      const hasQuestions = q.questions && q.questions.length > 0;
                      const allSameMarks = hasQuestions && q.questions.every(quest => quest.marks === q.questions[0].marks);
                      if (allSameMarks) {
                        setBulkMarksEnabled(true);
                        setBulkMarksValue(q.questions[0].marks);
                      } else {
                        setBulkMarksEnabled(false);
                        setBulkMarksValue(1);
                      }
                      setBulkNegEnabled(q.negativeMarking ?? false);
                      setBulkNegValue(q.negativeMarkValue ?? 0);
                      setShowBuilder(true);
                    }}
                    className="rounded-full bg-cream/10 text-cream px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-cream/20 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDuplicateQuiz(q);
                      setSelectedTargetClassrooms([]);
                    }}
                    className="rounded-full bg-cream/10 text-cream px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-cream/20 transition-colors"
                    title="Reuse/Duplicate to another class"
                  >
                    <LuCopy className="h-3 w-3" /> Reuse
                  </button>
                  <button
                    onClick={() => handleDownloadQuiz(q, 'pdf')}
                    className="rounded-full bg-cream/10 text-cream px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-cream/20 transition-colors"
                    title="Download Quiz as PDF"
                  >
                    <LuDownload className="h-3.5 w-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => handleDownloadQuiz(q, 'doc')}
                    className="rounded-full bg-cream/10 text-cream px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-cream/20 transition-colors"
                    title="Download Quiz as Word Doc"
                  >
                    <LuDownload className="h-3.5 w-3.5" /> DOC
                  </button>
                  {q.status === "draft" && (
                    <button onClick={() => handlePublishQuiz(q.id)}
                      disabled={quizOperationQuizId === q.id}
                      className="rounded-full bg-lime/10 text-lime px-3 py-1.5 text-xs font-semibold hover:bg-lime/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                      {quizOperationQuizId === q.id ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                  {q.status === "published" && (
                    <button onClick={() => handleCloseQuiz(q.id)}
                      disabled={quizOperationQuizId === q.id}
                      className="rounded-full bg-cream/10 text-cream/70 px-3 py-1.5 text-xs font-semibold hover:bg-cream/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                      {quizOperationQuizId === q.id ? 'Closing...' : 'Close'}
                    </button>
                  )}
                  <button onClick={() => handleDeleteQuiz(q.id)}
                    disabled={quizOperationQuizId === q.id}
                    className="rounded-full bg-cream/5 text-cream/40 hover:text-red-400 p-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                    <LuTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </DarkCard>
          );
        })}
      </div>

      {/* Quiz Reuse / Duplication Modal */}
      {duplicateQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1A0F33] border border-cream/10 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-cream/10 flex items-center justify-between">
              <h3 className="font-display font-bold text-cream">Reuse Quiz in other Classes</h3>
              <button
                onClick={() => setDuplicateQuiz(null)}
                className="text-cream/50 hover:text-cream p-1 rounded-full hover:bg-cream/5"
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="text-sm text-cream/70 mb-2">
                Duplicate <strong className="text-lime">{duplicateQuiz.title}</strong> to the following classroom(s):
              </div>
              <div className="space-y-2">
                {classrooms
                  .filter((c) => c.id !== classroomId && c.status === "active")
                  .map((targetCls) => {
                    const isChecked = selectedTargetClassrooms.includes(targetCls.id);
                    return (
                      <label
                        key={targetCls.id}
                        className="flex items-center gap-3 bg-cream/5 border border-cream/10 rounded-xl p-3 cursor-pointer hover:border-lime/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargetClassrooms([...selectedTargetClassrooms, targetCls.id]);
                            } else {
                              setSelectedTargetClassrooms(selectedTargetClassrooms.filter((id) => id !== targetCls.id));
                            }
                          }}
                          className="accent-lime h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-cream">{targetCls.name}</div>
                          <div className="text-[10px] font-mono text-cream/50 uppercase tracking-widest">{targetCls.code} &middot; {targetCls.program}</div>
                        </div>
                      </label>
                    );
                  })}
                {classrooms.filter((c) => c.id !== classroomId && c.status === "active").length === 0 && (
                  <p className="text-xs text-cream/40 text-center py-4">No other active classes available.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-black/20 border-t border-cream/10 flex gap-3">
              <button
                type="button"
                onClick={() => setDuplicateQuiz(null)}
                disabled={isDuplicating}
                className="flex-1 rounded-full bg-cream/10 text-cream py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicateConfirm}
                disabled={selectedTargetClassrooms.length === 0 || isDuplicating}
                className="flex-1 rounded-full bg-lime text-plum-dark py-2.5 text-sm font-bold disabled:opacity-40"
              >
                {isDuplicating ? "Duplicating…" : "Confirm Duplicate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Students Tab ─────────────────────────────────────────────────────────────

function StudentsTab({ classroom, refreshClassroom }: { classroom: Classroom; refreshClassroom: () => Promise<Classroom> }) {
  const { users } = useClassroomStore();
  const cls = classroom;
  const [showAdd, setShowAdd] = useState(false);
  const [mongoStudents, setMongoStudents] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  React.useEffect(() => {
    let active = true;
    const loadStudents = async () => {
      try {
        const students = await getAdminUsers("student");
        if (!active) return;
        setMongoStudents(students);
        setError("");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load students from MongoDB");
      }
    };
    loadStudents();
    return () => {
      active = false;
    };
  }, []);

  const refreshClassroomLocal = refreshClassroom;

  const handleAddStudent = async (studentId: string) => {
    setError("");
    setIsAdding(studentId);
    try {
      await addStudentsToClassroom(classroom.id, [studentId]);
      await refreshClassroomLocal();
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student to classroom");
    } finally {
      setIsAdding(null);
    }
  };

  const handleStatusChange = async (studentId: string, status: "active" | "held" | "removed") => {
    setError("");
    try {
      await updateClassroomStudentStatus(classroom.id, studentId, status);
      await refreshClassroomLocal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update student status");
    }
  };

  const studentsOnly = mongoStudents.length > 0 ? mongoStudents : users.filter((u) => u.role === "student");
  const notEnrolled = studentsOnly.filter((s) => !cls.students.find((cs) => cs.id === s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-cream/60 text-sm">{cls.students.length} enrolled · {cls.students.filter((s) => s.status === "active").length} active</p>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 rounded-full bg-lime text-plum-dark px-5 py-2.5 text-sm font-bold">
          <LuPlus className="h-4 w-4" /> Add Student
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showAdd && notEnrolled.length > 0 && (
        <DarkCard>
          <h3 className="font-display font-bold text-cream mb-3">Add Students to Classroom</h3>
          <div className="space-y-2">
            {notEnrolled.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-cream/5 px-4 py-3">
                <div>
                  <div className="text-cream text-sm font-semibold">{s.name}</div>
                  <div className="text-cream/60 text-xs">{s.email}</div>
                </div>
                <button
                  onClick={() => handleAddStudent(s.id)}
                  disabled={isAdding === s.id}
                  className="rounded-full bg-lime text-plum-dark px-4 py-1.5 text-xs font-bold disabled:opacity-60"
                >
                  {isAdding === s.id ? "Adding..." : "Add"}
                </button>
              </div>
            ))}
          </div>
        </DarkCard>
      )}

      {showAdd && notEnrolled.length === 0 && (
        <DarkCard className="text-center py-8">
          <p className="text-cream/50 text-sm">No available MongoDB students to add.</p>
        </DarkCard>
      )}

      <DarkCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-175 text-sm">
            <thead className="bg-cream/5">
              <tr className="text-[10px] uppercase tracking-widest text-cream/60 text-left">
                <th className="p-4">Student</th>
                <th>Progress</th>
                <th>Attendance</th>
                <th>Quiz Avg</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cls.students.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-cream/50">No students enrolled yet.</td></tr>
              )}
              {cls.students.map((s) => (
                <tr key={s.id} className="border-t border-cream/10 hover:bg-cream/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-lime text-plum-dark text-xs font-bold shrink-0">
                        {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-cream">{s.name}</div>
                        <div className="text-[11px] text-cream/60 font-mono">{s.enrollmentId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 w-28">
                      <div className="flex-1 h-1.5 bg-cream/10 rounded-full overflow-hidden">
                        <div className="h-full bg-lime rounded-full" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs font-mono text-cream/70">{s.progress}%</span>
                    </div>
                  </td>
                  <td className="font-mono text-cream/80 text-sm">{s.attendance}%</td>
                  <td className="font-mono text-cream/80 text-sm">{s.quizAvg}%</td>
                  <td>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${s.status === "active" ? "bg-lime/20 text-lime" : s.status === "held" ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="pr-4">
                    <select value={s.status} onChange={(e) => handleStatusChange(s.id, e.target.value as "active" | "held" | "removed")}
                      className="bg-[#1A0F33] border border-cream/10 rounded-lg px-2 py-1 text-cream/70 text-xs outline-none">
                      <option value="active">Active</option>
                      <option value="held">Hold</option>
                      <option value="removed">Remove</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DarkCard>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AdminClassroomDetail() {
  const params = (Route.useParams as any)();
  const id = params.id as string;
  const { classrooms } = useClassroomStore();

  // ── Stale-While-Revalidate: grab cached classroom immediately ──────────────
  const storeClassroom = React.useMemo(
    () => classrooms.find((c) => c.id === id) ?? null,
    [classrooms, id]
  );

  // Only show the full-page spinner when we have NOTHING in cache
  const [isLoading, setIsLoading] = useState(!storeClassroom);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("announcements");

  const refreshClassroom = React.useCallback(async () => {
    const refreshed = await getClassroomById(id);
    if (storeClassroom) {
      classroomActions.updateClassroom(id, refreshed);
    } else {
      classroomActions.addClassroom(refreshed);
    }
    markClassroomFresh(id);
    return refreshed;
  }, [id, storeClassroom]);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      // Skip entirely if cache is fresh
      if (storeClassroom && !isClassroomStale(id)) return;

      try {
        setLoadError(null);
        if (!storeClassroom) setIsLoading(true);
        await refreshClassroom();
      } catch (err) {
        if (active && !storeClassroom) {
          setLoadError(err instanceof Error ? err.message : "Could not load classroom by id");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [id]);

  // Merge: prefer store data (kept fresh by background sync) over nothing
  const classroom = React.useMemo(
    () => storeClassroom,
    [storeClassroom]
  );

  if (isLoading && !classroom) {
    return (
      <div className="text-cream text-center py-20">
        <p className="text-cream/60">Loading classroom...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-cream text-center py-20">
        <p className="text-red-400">Error loading classroom: {loadError}</p>
        <Link to="/admin/classrooms" className="mt-4 text-lime block">← Back to Classrooms</Link>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="text-cream text-center py-20">
        <p className="text-cream/60">Classroom not found.</p>
        <Link to="/admin/classrooms" className="mt-4 text-lime block">← Back to Classrooms</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-cream">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/admin/classrooms" className="text-cream/60 hover:text-cream mt-1 shrink-0">
          <LuArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{classroom.name}</h1>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${classroom.status === "active" ? "bg-lime/20 text-lime" : "bg-cream/10 text-cream/60"}`}>{classroom.status}</span>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="font-mono text-[11px] text-cream/50">{classroom.code}</span>
            <span className="text-cream/60 text-xs">·</span>
            <span className="text-cream/60 text-xs">{classroom.students.filter((s) => s.status === "active").length} / {classroom.maxStudents} students</span>
            <span className="text-cream/60 text-xs">·</span>
            <span className="text-cream/60 text-xs">{classroom.program}</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto bg-cream/5 rounded-2xl p-1.5 whitespace-nowrap [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2 transition-colors ${tab === t.key ? "bg-lime text-plum-dark" : "text-cream/70 hover:text-cream"}`}>
            <t.icon className="h-3.5 w-3.5 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "announcements" && <AnnouncementsTab classroom={classroom} refreshClassroom={refreshClassroom} />}
      {tab === "live" && <LiveClassesTab classroomId={classroom.id} refreshClassroom={refreshClassroom} />}
      {tab === "recordings" && <RecordingsTab classroom={classroom} refreshClassroom={refreshClassroom} />}
      {tab === "tests" && <TestsTab classroom={classroom} refreshClassroom={refreshClassroom} />}
      {tab === "students" && <StudentsTab classroom={classroom} refreshClassroom={refreshClassroom} />}
    </div>
  );
}

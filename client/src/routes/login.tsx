import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useState } from "react";
import { classroomStore, type User } from "@/lib/classroomStore";
import { loginUser } from "@/lib/api";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = await loginUser(userId, password);
      const backendUser = payload.user;
      const accessToken = payload.accessToken || null;
      const role = backendUser.role === "student" ? "student" : backendUser.role;
      const currentUser: User = {
        id: backendUser._id,
        name: backendUser.fullName || backendUser.email,
        email: backendUser.email,
        phone: backendUser.phone,
        role,
        userId: backendUser.userId || ""
      };

      classroomStore.setState(() => ({ currentUser, accessToken }));
      navigate({ to: role === "student" ? "/student/dashboard" : "/admin/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid Credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left visual */}
      <div className="hidden lg:flex w-1/2 relative bg-plum-dark text-cream p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-lime/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-plum/50 blur-3xl" />

        <Link to="/" className="relative inline-flex items-center gap-2 w-fit">
          <span className="relative block h-10 w-10 overflow-hidden rounded-xl">
            <img src="/logo.jpeg" alt="Beyond20" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-lg font-bold">Beyond20</span>
        </Link>

        <div className="relative">
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.05] tracking-[-0.02em]">
            Welcome back.<br />
            Your <span className="bg-lime text-plum-dark px-2 rounded">cohort</span> is waiting.
          </h1>
          <p className="mt-5 text-cream/70 max-w-md">
            Pick up where you left off — live classes, recorded modules, exam prep, and your career roadmap.
          </p>
        </div>

        <div className="relative text-xs text-cream/50">© {new Date().getFullYear()} Beyond20</div>
      </div>

      {/* Right form */}
      <div className="flex-1 grid place-items-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <span className="relative block h-9 w-9 overflow-hidden rounded-xl">
              <img src="/logo.jpeg" alt="Beyond20" className="h-full w-full object-cover" />
            </span>
            <span className="font-display font-bold text-plum-dark">Beyond20</span>
          </Link>

          <h2 className="font-display text-3xl font-bold text-plum-dark">Sign in</h2>
          <p className="mt-2 text-sm text-foreground/65">Enter your credentials to access your portal.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {error && <div className="text-red-500 text-sm font-semibold p-3 bg-red-50 rounded-lg">{error}</div>}
            <div>
              <label className="block text-xs font-semibold text-plum-dark mb-1.5">User ID/Email</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} type="text" placeholder="e.g. example@gmail.com or Admin" className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum" required />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-plum-dark">Password</label>
                <a href="#" className="text-xs text-plum font-semibold">Forgot?</a>
              </div>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum" required />
            </div>

            <button type="submit" disabled={isSubmitting} className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-plum-dark px-6 py-3.5 text-sm font-semibold text-cream hover:bg-plum transition disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? "Signing in..." : "Sign in"} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <p className="mt-6 text-center text-sm text-foreground/65">
            New to Beyond20? <Link to="/courses" className="font-semibold text-plum-dark">Browse courses →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

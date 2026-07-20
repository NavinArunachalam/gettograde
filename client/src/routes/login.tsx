import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useState } from "react";
import { classroomStore, type User } from "@/lib/classroomStore";
import { loginUser, forgotPassword, resetPassword } from "@/lib/api";
import { useOrganizationDetails } from "@/lib/organization";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset flow states
  const [forgotMode, setForgotMode] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(forgotEmail);
      if (res.success) {
        setSuccessMsg(res.message || "A verification code has been sent to your email.");
        setResetStep(2);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please check your email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword({
        email: forgotEmail,
        otp: resetCode,
        newPassword
      });
      if (res.success) {
        setSuccessMsg("Password reset successfully! You can now log in.");
        setTimeout(() => {
          setForgotMode(false);
          setResetStep(1);
          setForgotEmail("");
          setResetCode("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccessMsg("");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "Reset failed. Please verify the code and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const organization = useOrganizationDetails();

  return (
    <div className="min-h-screen flex">
      {/* Left visual */}
      <div className="hidden lg:flex w-1/2 relative bg-plum-dark text-cream p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-lime/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-plum/50 blur-3xl" />

        <Link to="/" className="relative inline-flex items-center gap-2 w-fit">
          <span className="relative block h-10 w-10 overflow-hidden rounded-xl">
            <img src={organization.logo} alt={organization.name} className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-lg font-bold">{organization.name}</span>
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

        <div className="relative text-xs text-cream/50">© {new Date().getFullYear()} {organization.name}</div>
      </div>

      {/* Right form */}
      <div className="flex-1 grid place-items-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <span className="relative block h-9 w-9 overflow-hidden rounded-xl">
              <img src={organization.logo} alt={organization.name} className="h-full w-full object-cover" />
            </span>
            <span className="font-display font-bold text-plum-dark">{organization.name}</span>
          </Link>

          {!forgotMode ? (
            <>
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
                    <button type="button" onClick={() => { setForgotMode(true); setResetStep(1); setError(""); setSuccessMsg(""); }} className="text-xs text-plum font-semibold hover:underline">Forgot?</button>
                  </div>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum" required />
                </div>

                <button type="submit" disabled={isSubmitting} className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-plum-dark px-6 py-3.5 text-sm font-semibold text-cream hover:bg-plum transition disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? "Signing in..." : "Sign in"} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-bold text-plum-dark">Reset password</h2>
              <p className="mt-2 text-sm text-foreground/65">
                {resetStep === 1
                  ? "Enter your email to receive a password reset verification code."
                  : "Enter the code sent to your email and choose a new password."}
              </p>

              {error && <div className="text-red-500 text-sm font-semibold p-3 bg-red-50 rounded-lg mt-6">{error}</div>}
              {successMsg && <div className="text-green-600 text-sm font-semibold p-3 bg-green-50 rounded-lg mt-6">{successMsg}</div>}

              {resetStep === 1 ? (
                <form onSubmit={handleRequestCode} className="mt-8 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-plum-dark mb-1.5">Email Address</label>
                    <input
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      type="email"
                      placeholder="e.g. yourname@example.com"
                      className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-plum-dark px-6 py-3.5 text-sm font-semibold text-cream hover:bg-plum transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Sending code..." : "Send Verification Code"}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-center text-xs text-plum font-semibold mt-4 hover:underline block"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="mt-8 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-plum-dark mb-1.5">Verification Code (6-digit)</label>
                    <input
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum font-mono text-center tracking-widest text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum-dark mb-1.5">New Password</label>
                    <input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum-dark mb-1.5">Confirm New Password</label>
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-plum-dark px-6 py-3.5 text-sm font-semibold text-cream hover:bg-plum transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Resetting password..." : "Reset Password"}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="flex justify-between items-center mt-4 px-2">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-xs text-plum font-semibold hover:underline"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="text-xs text-plum font-semibold hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <p className="mt-6 text-center text-sm text-foreground/65">
            New to {organization.name}? <Link to="/courses" className="font-semibold text-plum-dark">Browse courses →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

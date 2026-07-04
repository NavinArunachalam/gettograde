import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import {  getAdminPrograms, type RegisterStudentData, type ProgramCourse } from "@/lib/api";
import { submitToGoogleSheet } from "@/lib/googleSheets";
export const Route = createFileRoute("/enroll")({ component: Enroll });

function Enroll() {
  const [formData, setFormData] = useState<RegisterStudentData>({
    fullName: "",
    email: "",
    phone: "",
    qualification: "",
    address: "",
    program: "",
    message: "",
  });

  const [programs, setPrograms] = useState<ProgramCourse[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchPrograms() {
      try {
        const data = await getAdminPrograms();
        setPrograms(data.filter(p => p.status === 'published'));
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      } finally {
        setIsLoadingPrograms(false);
      }
    }
    fetchPrograms();
  }, []);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setError("");
  setIsSubmitting(true);

  if (!formData.fullName || !formData.email) {
    setError(
      "Please fill in all required fields (Full Name, Email)"
    );
    setIsSubmitting(false);
    return;
  }

  try {
    const selectedProgram = programs.find(
      (p) => p.id === formData.program
    );

    const result = await submitToGoogleSheet(
      "Enrollment Registrations",
      {
        Timestamp: new Date().toISOString(),
        FullName: formData.fullName,
        Email: formData.email,
        Phone: formData.phone,
        Qualification: formData.qualification,
        Address: formData.address,
        Program: selectedProgram?.title || formData.program,
        Message: formData.message,
      }
    );

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message);
    }
  } catch (error) {
    console.error(error);

    setError(
      error instanceof Error
        ? error.message
        : "Registration failed"
    );
  } finally {
    setIsSubmitting(false);
  }
};
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-lime/20 text-lime">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="font-display text-3xl font-bold text-plum-dark">Application Received!</h2>
          <p className="mt-4 text-foreground/65">
            Thank you for applying to Get To Grade MedAcademy. Your registration is now under review by our admissions team.
          </p>
          <p className="mt-2 text-sm text-foreground/50">
            We will contact you via email once your application has been processed.
          </p>
          <div className="mt-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-plum-dark px-8 py-3.5 text-sm font-semibold text-cream hover:bg-plum transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left visual */}
      <div className="hidden lg:flex w-1/3 relative bg-plum-dark text-cream p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-lime/30 blur-3xl" />
        
        <Link to="/" className="relative inline-flex items-center gap-2 w-fit">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-plum-dark">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">Get To Grade .Academy</span>
        </Link>

        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-[-0.02em]">
            Start your<br />
            <span className="text-lime">medical career</span><br />
            journey here.
          </h1>
          <p className="mt-6 text-cream/70 text-sm leading-relaxed">
            Join a community of dedicated healthcare professionals. Complete the form to begin your enrollment process.
          </p>
          
          <div className="mt-10 space-y-6">
            {[
              { title: "Expert Faculty", desc: "Learn from industry-leading practitioners." },
              { title: "Live Cohorts", desc: "Interactive real-time learning environment." },
              { title: "Career Support", desc: "Dedicated placement and roadmap guidance." }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full border border-lime/30 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-lime" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-cream">{item.title}</h4>
                  <p className="text-xs text-cream/50 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-cream/50">© {new Date().getFullYear()} Get To Grade </div>
      </div>

      {/* Right form */}
      <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-12 lg:px-20">
        <div className="mx-auto max-w-2xl">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-plum-dark text-lime">
              <Stethoscope className="h-5 w-5" />
            </span>
            <span className="font-display font-bold text-plum-dark">Get To Grade MedAcademy</span>
          </Link>

          <header>
            <h2 className="font-display text-3xl font-bold text-plum-dark">Student Registration</h2>
            <p className="mt-2 text-sm text-foreground/65">Fill out the details below to apply for enrollment.</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex gap-3">
                <span className="shrink-0 h-5 w-5 rounded-full bg-red-100 flex items-center justify-center text-[10px]">✕</span>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Full Name *</label>
              <input
                required
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                type="text"
                placeholder="e.g. John Doe"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Email Address *</label>
                <input
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="john.doe@example.com"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Phone Number</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  type="tel"
                  placeholder="+91 00000 00000"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Program Interest</label>
                <select
                  name="program"
                  value={formData.program}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all appearance-none"
                >
                  <option value="">Select a program</option>
                  {isLoadingPrograms ? (
                    <option disabled>Loading programs...</option>
                  ) : (
                    programs.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Educational Qualification</label>
                <input
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  type="text"
                  placeholder="e.g. MBBS, BHMS"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                placeholder="Your full mailing address"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-plum-dark/50">Message / Remarks</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={2}
                placeholder="Anything else you'd like us to know?"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-plum/20 focus:border-plum transition-all resize-none"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group w-full md:w-fit inline-flex items-center justify-center gap-2 rounded-full bg-plum-dark px-10 py-4 text-sm font-semibold text-cream hover:bg-plum transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-plum-dark/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-foreground/50">
              Already have an account? <Link to="/login" className="font-bold text-plum hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

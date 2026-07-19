import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, Sparkles, Cloud, Server, Code, Terminal, Cpu } from "lucide-react";

const stats = [
  { v: "15+", l: "Years Expert Trainers" },
  { v: "1,000+", l: "Alumni Placed" },
  { v: "100%", l: "Hands-on Project Labs" },
  { v: "5", l: "Full-Fledged Programs" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-6 lg:pt-10 pb-12 lg:pb-16">
      {/* Background art */}
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <div className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 h-[600px] w-[1100px] rounded-full bg-lime/25 blur-3xl" />
      <div className="absolute -z-10 -bottom-32 -right-20 h-[400px] w-[400px] rounded-full bg-plum/20 blur-3xl" />

      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-plum-dark/5 border border-plum-dark/10 px-3 py-1.5 text-xs font-semibold text-plum-dark"
            >
              <Sparkles className="h-3.5 w-3.5 text-plum" />
              Professional IT & Digital Marketing Academy
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-5 font-display font-bold text-plum-dark text-balance text-[40px] sm:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.03em]"
            >
              Go Beyond. Skill Beyond.{" "}
              <span className="relative inline-block">
                <span className="relative z-10"> Career Beyond Limits.</span>
                <span className="absolute inset-x-0 bottom-1 h-3 lg:h-4 bg-lime -z-0 rounded-sm" />
              </span>{" "}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 max-w-xl text-base lg:text-lg text-foreground/70 leading-relaxed"
            >
              Welcome to Beyond20 — a professional training academy built for turning learners into industry-ready professionals. Master Oracle Cloud, SAP, AWS, Azure, and Digital Marketing with trainers holding 15+ years of experience.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/courses"
                className="group inline-flex items-center gap-2 rounded-full bg-plum-dark px-6 py-3.5 text-sm font-semibold text-cream hover:bg-plum transition"
              >
                Explore Courses
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-plum-dark/15 bg-white/50 backdrop-blur px-6 py-3.5 text-sm font-semibold text-plum-dark hover:bg-white transition"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-plum-dark">
                  <Play className="h-3 w-3 fill-current" />
                </span>
                Book a Free Demo
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl"
            >
              {stats.map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl lg:text-3xl font-bold text-plum-dark">
                    {s.v}
                  </div>
                  <div className="mt-1 text-xs lg:text-sm text-foreground/60">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative hidden md:block"
          >
            <HeroArt />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroArt() {
  return (
    <div className="relative aspect-[5/6] w-full max-w-md mx-auto">
      <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-plum-dark via-plum to-plum-dark overflow-hidden shadow-2xl shadow-plum-dark/30">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-lime/30 blur-3xl" />

        {/* Tech Grid / Connection lines SVG */}
        <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full text-lime/30" stroke="currentColor" strokeWidth="1" fill="none">
          <circle cx="200" cy="200" r="120" strokeDasharray="5,5" />
          <circle cx="200" cy="200" r="180" strokeDasharray="3,3" />
          <line x1="200" y1="20" x2="200" y2="380" />
          <line x1="20" y1="200" x2="380" y2="200" />
        </svg>

        {/* Floating chips */}
        <FloatChip icon={Cloud} label="Oracle Cloud" pos="top-8 left-6" delay={0} />
        <FloatChip icon={Server} label="AWS & Azure" pos="top-24 right-4" delay={0.4} />
        <FloatChip icon={Code} label="SAP S/4HANA" pos="bottom-28 left-4" delay={0.8} />
        <FloatChip icon={Terminal} label="Marketing" pos="bottom-8 right-6" delay={1.2} />

        {/* Center card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute bottom-6 left-6 right-6 rounded-2xl bg-cream/95 backdrop-blur p-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime">
              <Cpu className="h-5 w-5 text-plum-dark" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-plum-dark/60 font-medium">Next Cohort</div>
              <div className="text-sm font-semibold text-plum-dark">Cloud & SAP Training</div>
            </div>
            <div className="text-[10px] font-bold uppercase text-plum-dark bg-lime rounded-full px-2 py-1">
              OPEN
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-plum-dark/10 overflow-hidden">
            <motion.div
              className="h-full bg-plum-dark rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "85%" }}
              transition={{ duration: 1.5, delay: 0.6 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FloatChip({
  icon: Icon,
  label,
  pos,
  delay,
}: {
  icon: typeof Cloud;
  label: string;
  pos: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { delay, duration: 0.6 },
        y: { delay, duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`absolute ${pos} flex items-center gap-2 rounded-full bg-cream/95 backdrop-blur px-3 py-1.5 text-xs font-semibold text-plum-dark shadow-lg`}
    >
      <Icon className="h-3.5 w-3.5 text-plum" />
      {label}
    </motion.div>
  );
}

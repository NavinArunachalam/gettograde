import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const faqs = [
  { q: "Do you offer both weekday and weekend batches?", a: "Yes. Beyond20 offers flexible weekday and weekend batch options across Oracle Cloud, SAP, AWS, Azure and Digital Marketing courses, so working professionals and students can choose what fits their schedule." },
  { q: "Is placement support included with every course?", a: "Yes, all eligible students who complete their program receive placement support, including resume building, mock interviews, and access to our hiring partner network." },
  { q: "Do I need a technical background to join?", a: "It depends on the course. Our counsellors will help assess your background during a free consultation and recommend the right starting point." },
  { q: "Are recorded classes available for revision?", a: "Yes, every live session is recorded and made available on the student portal within a few hours, offering lifetime access for revision." },
  { q: "Who are the trainers at Beyond20?", a: "Every trainer at Beyond20 is a working industry practitioner with over 15 years of hands-on experience in their respective domain (OCI, SAP, AWS, Azure, or Digital Marketing)." },
  { q: "Can I pay the course fee in installments?", a: "Yes, we support flexible payment options and interest-free EMI plans. Get in touch with our counsellors for exact fee structures." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-10 lg:py-16 bg-secondary/40">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— 09 / Questions</div>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-plum-dark tracking-tight">
            Frequently asked.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`rounded-2xl border bg-card transition-colors ${isOpen ? "border-plum-dark" : "border-border"}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-display font-semibold text-plum-dark">{f.q}</span>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${isOpen ? "bg-lime text-plum-dark" : "bg-secondary text-plum-dark"}`}>
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-foreground/75">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

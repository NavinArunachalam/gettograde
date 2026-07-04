import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PublicLayout } from "../components/site/Layout";
import { Hero } from "../components/home/Hero";
import { CourseStrip } from "../components/home/CourseStrip";
import { WhyUs } from "../components/home/WhyUs";
import { PlacementBanner } from "../components/home/PlacementBanner";
import { Faculty } from "../components/home/Faculty";
import { Testimonials } from "../components/home/Testimonials";
import { Partners } from "../components/home/Partners";
import { LearningPath } from "../components/home/LearningPath";
import { BlogPreview } from "../components/home/BlogPreview";
import { FAQ } from "../components/home/FAQ";
import { CtaBlock } from "../components/home/CtaBlock";
import { useClassroomStore } from "@/lib/classroomStore";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { currentUser } = useClassroomStore();

  if (currentUser) {
    if (currentUser.role === "admin" || currentUser.role === "faculty") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser.role === "student") {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return (
    <PublicLayout>
      <Hero />
      <CourseStrip />
      <WhyUs />
      <PlacementBanner />
      <LearningPath />
      <Faculty />
      <Testimonials />
      <Partners />
      <BlogPreview />
      <FAQ />
      <CtaBlock />
    </PublicLayout>
  );
}

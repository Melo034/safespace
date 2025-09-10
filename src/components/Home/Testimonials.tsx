import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import TestimonialImage1 from "@/assets/1.jpg";
import TestimonialImage2 from "@/assets/2.jpg";
import TestimonialImage3 from "@/assets/3.jpg";
import TestimonialImage4 from "@/assets/4.jpg";
import TestimonialImage5 from "@/assets/5.jpg";
const Testimonials = () => {
  const testimonials = [
    {
      quote:
        "I felt safe sharing my story. Being able to report anonymously and get matched with support gave me courage I didn’t think I had.",
      name: "Mariama Bangura",
      designation: "Survivor (Community Member)",
      src: TestimonialImage3,
    },
    {
      quote:
        "The intake is trauma‑informed and respectful. Referrals arrive with the right context, so I can focus on care—not paperwork.",
      name: "Isatu Kamara",
      designation: "Licensed Therapist & Trauma Counselor",
      src: TestimonialImage2,
    },
    {
      quote:
        "Evidence uploads and a clear timeline help me advise clients quickly. Privacy defaults are strong and client‑first.",
      name: "Abdulai Koroma",
      designation: "Legal Aid Attorney",
      src: TestimonialImage1,
    },
    {
      quote:
        "Coordinating support used to take days. Now I can connect survivors to services in minutes and track follow‑ups responsibly.",
      name: "Fatmata Sesay",
      designation: "Social Worker",
      src: TestimonialImage4,
    },
    {
      quote:
        "As a support group facilitator, I appreciate the verified resources and clear guidance on safety planning.",
      name: "Abigail Kargbo",
      designation: "Support Group Facilitator",
      src: TestimonialImage5,
    },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:py-14 lg:py-18">
      <h2 className="text-3xl sm:text-5xl font-bold text-center my-10">Stories of Support</h2>
      <p className="text-center text-lg mb-12">
        Hear from survivors, therapists, and legal advocates using Safespace.
      </p>
      <AnimatedTestimonials testimonials={testimonials} />
    </div>
  )
}

export default Testimonials

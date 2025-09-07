import { HoverEffect } from "../ui/card-hover-effect";
import { Users, BookOpen, MessageCircle, Lock } from "lucide-react"

const Features = () => {
   const projects = [
  {
    title: "Anonymous Reporting",
    description:
      "Submit reports safely without revealing your identity. Your privacy is our priority.",
    icon: <Lock className="text-4xl text-rose-400 mb-4" />
  },
  {
    title: "24/7 Live Support",
    description:
      "Connect with our in-app support chat whenever you need help.",
    icon: <MessageCircle className="text-4xl text-rose-400 mb-4" />
  },
  {
    title: "Resource Library",
    description:
      "Access educational materials, legal information, and support resources.",
    icon: <BookOpen className="text-4xl text-rose-400 mb-4" />
  },
   {
    title: "Community Support",
    description:
      "Connect with support groups and community resources in your area.",
    icon: <Users className="text-4xl text-rose-400 mb-4" />
  },
];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-3xl sm:text-5xl font-bold text-center mb-4">Comprehensive Support Services</h2>
      <p className="text-center text-base md:text-lg mb-10 text-muted-foreground">
        Our platform offers safe reporting, live support, rich resources, and community connections.
      </p>
      <HoverEffect items={projects} />
    </div>
  )
}

export default Features

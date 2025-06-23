import { HoverEffect } from "../ui/card-hover-effect";
import { Shield, Users, BookOpen, MessageCircle, MapPin, Lock } from "lucide-react"

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
      "Connect with trained counselors and support specialists anytime you need help.",
    icon: <MessageCircle className="text-4xl text-rose-400 mb-4" />
  },
  {
    title: "Emergency SOS",
    description:
      "Immediate access to emergency services with one-click activation for urgent situations.",
    icon: <Shield className="text-4xl text-rose-400 mb-4" />
  },
  {
    title: "Resource Library",
    description:
      "Access educational materials, legal information, and support resources.",
    icon: <BookOpen className="text-4xl text-rose-400 mb-4" />
  },
   {
    title: "Location Services",
    description:
      "Optional location tracking for incidents and nearby support services.",
    icon: <MapPin className="text-4xl text-rose-400 mb-4" />
  },
   {
    title: "Community Support",
    description:
      "Connect with support groups and community resources in your area.",
    icon: <Users className="text-4xl text-rose-400 mb-4" />
  },
];
  return (
    <div className="max-w-6xl mx-auto px-8">
      <h2 className="text-3xl sm:text-5xl font-bold text-center my-8">Comprehensive Support Services</h2>
      <p className="text-center text-lg mb-12">
        Our platform provides multiple ways to seek help, report incidents, and access vital resources.
      </p>
      <HoverEffect items={projects} />
    </div>
  )
}

export default Features
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "@/server/supabase";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HeartHandshake,
  ShieldCheck,
  FileText,
  MessageSquare,
  BookOpen,
  Sparkles,
} from "lucide-react";
import LiveChat from "@/components/Home/LiveChat";
import MissionImpact from "@/components/About/MissionImpact";
import SafetyPrivacy from "@/components/About/SafetyPrivacy";
import MediaContact from "@/components/About/MediaContact";
import SOSButton from "@/components/utils/SOSButton";

const values = [
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    title: "Safety First",
    desc: "Privacy, consent, and protection are built into every flow.",
  },
  {
    icon: <HeartHandshake className="h-6 w-6 text-primary" />,
    title: "Human Support",
    desc: "We connect people to verified resources and caring communities.",
  },
  {
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    title: "Empowerment",
    desc: "Share stories, find strength, and amplify trusted information.",
  },
];

const features = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Secure Reporting",
    desc: "Submit incidents with anonymity options, evidence upload, and respectful follow‑up.",
    cta: { href: "/report", text: "Report an Incident" },
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Resources",
    desc: "Find legal aid, counseling, and safety planning tailored to your needs.",
    cta: { href: "/resources", text: "Browse Resources" },
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Community Stories",
    desc: "Read and share experiences. Healing grows when we are heard.",
    cta: { href: "/stories", text: "Explore Stories" },
  },
];

const nf = (n: number) => new Intl.NumberFormat().format(n);

export default function About() {
  const [reports, setReports] = useState<number | null>(null);
  const [stories, setStories] = useState<number | null>(null);
  const [resources, setResources] = useState<number | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  // Removed unused loading state

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // setLoading(true); // removed unused loading state
        const [r1, r2, r3, r4] = await Promise.all([
          supabase.from("reports").select("id", { count: "exact", head: true }),
          supabase.from("stories").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("resources").select("id", { count: "exact", head: true }).eq("is_verified", true),
          supabase.from("community_members").select("id", { count: "exact", head: true }),
        ]);
        if (!alive) return;
        setReports(r1.count ?? 0);
        setStories(r2.count ?? 0);
        setResources(r3.count ?? 0);
        setMembers(r4.count ?? 0);
      } catch (e) {
        console.error("About stats error", e);
        if (!alive) return;
        setReports(0); setStories(0); setResources(0); setMembers(0);
      } finally {
        // if (alive) setLoading(false); // removed unused loading state
      }
    })();
    return () => { alive = false; };
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1 py-12 sm:py-16 lg:py-24 container mx-auto px-4 md:px-6 max-w-6xl">
        {/* Hero */}
        <section className="mb-10 sm:mb-14">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur mb-3">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" /> About Us
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3">
            <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">A safer space to report, heal, and find support</span>
          </h1>
          <p className="text-muted-foreground max-w-3xl text-base sm:text-lg">
            We’re building compassionate, privacy‑respecting tools to help people impacted by gender‑based
            violence report incidents, access trusted resources, and connect with a caring community.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild>
              <Link to="/report">Report an Incident</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/auth/signup">Join the Community</Link>
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center min-w-0 hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">{reports == null ? "—" : nf(reports)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Reports Supported</p>
            </CardContent>
          </Card>
          <Card className="text-center min-w-0 hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">{stories == null ? "—" : nf(stories)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Stories Shared</p>
            </CardContent>
          </Card>
          <Card className="text-center min-w-0 hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">{resources == null ? "—" : nf(resources)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Resources Verified</p>
            </CardContent>
          </Card>
          <Card className="text-center min-w-0 hover:-translate-y-0.5 hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">{members == null ? "—" : nf(members)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Members</p>
            </CardContent>
          </Card>
        </section>

        {/* What we do */}
        <section className="mb-16">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">What We Do</h2>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="hover:-translate-y-0.5 hover:shadow-md transition">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary">
                    {f.icon}
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{f.desc}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link to={f.cta.href}>{f.cta.text}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Our values */}
        <section className="mb-16">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Our Values</h2>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title} className="hover:-translate-y-0.5 hover:shadow-md transition">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {v.icon}
                    <CardTitle className="text-base">{v.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mission & Impact */}
        <MissionImpact />

        {/* Safety & Privacy */}
        <SafetyPrivacy />

        {/* CTA */}
        <section className="mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">Need help or want to get involved?</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Report an incident, join the community, or contribute resources.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button asChild>
                  <Link to="/report">Report Now</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to="/auth/signup">Join Us</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
        {/* Media & Contact */}
        <MediaContact />
      </main>
      <SOSButton/>
      <LiveChat/>
      <Footer />
    </div>
  );
}

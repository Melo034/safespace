import Features from "@/components/Home/Features"
import Hero from "@/components/Home/Hero"
import LiveChat from "@/components/Home/LiveChat"
import HowItWorks from "@/components/Home/HowItWorks"
import QuickSOSCallout from "@/components/Home/QuickSOSCallout"
import SafetyTips from "@/components/Home/SafetyTips"
import ResourceSpotlight from "@/components/Home/ResourceSpotlight"
import RecentStoriesHome from "@/components/Home/RecentStoriesHome"
import TrustSecurity from "@/components/Home/TrustSecurity"
import FAQ from "@/components/Home/FAQ"
import GetUpdates from "@/components/Home/GetUpdates"
import StickyGetHelpBar from "@/components/Home/StickyGetHelpBar"
import Statistics from "@/components/Home/Statistics"
import Testimonials from "@/components/Home/Testimonials"
import { Footer } from "@/components/utils/Footer"
import  Navbar  from "@/components/utils/Navbar"
import SOSButton from "@/components/utils/SOSButton"
import NearbyServices from "@/components/Home/NearbyServices"

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <QuickSOSCallout />
        <Statistics />
        <ResourceSpotlight />
        <RecentStoriesHome />
        <NearbyServices />
        <SafetyTips />
        <TrustSecurity />
        <FAQ />
        <GetUpdates />
        <Testimonials />
      </main>
      <StickyGetHelpBar />
      <SOSButton/>
      <LiveChat />
      <Footer />
    </div>
  )
}

export default Home

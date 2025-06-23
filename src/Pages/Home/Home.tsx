import Features from "@/components/Home/Features"
import Hero from "@/components/Home/Hero"
import LiveChat from "@/components/Home/LiveChat"
import Statistics from "@/components/Home/Statistics"
import Testimonials from "@/components/Home/Testimonials"
import { Footer } from "@/components/utils/Footer"
import { Navbar } from "@/components/utils/Navbar"

const Home = () => {
  return (
    <div>
        <Navbar/>
        <Hero/>
        <Features/>
        <Statistics/>
        <Testimonials/>
        <LiveChat/>
        <Footer/>
    </div>
  )
}

export default Home
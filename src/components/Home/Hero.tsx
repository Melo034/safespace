import { motion } from "motion/react";
import HeroImage from "@/assets/Hero.jpg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Content */}
      <div className="px-4 py-10 md:py-20">
        <div className="container max-w-7xl mx-auto flex flex-col items-center justify-between gap-12 md:flex-row">

          {/* Text Section */}
          <div className="w-full md:basis-1/2 text-center md:text-left">
            <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold text-neutral-900 max-w-xl mx-auto md:mx-0">
              {"Your Voice Matters, Your Safety First".split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    ease: "easeInOut",
                  }}
                  className="mr-2 inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              className="mt-6 max-w-lg text-lg text-neutral-600 dark:text-neutral-400 mx-auto md:mx-0"
            >
              A secure platform providing anonymous reporting, immediate support, and comprehensive resources for survivors of gender-based abuse.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 1 }}
              className="mt-8 flex flex-wrap justify-center md:justify-start gap-4"
            >
              <Button asChild size={"lg"} className="transform font-Lora transition-all duration-300 hover:-translate-y-0.5">
                <Link to="/report">Report</Link>
              </Button>
              <Button asChild variant={"outline"} className="transform font-Lora transition-all duration-300 hover:-translate-y-0.5">
                <Link to="/support">Contact Support</Link>
              </Button>
            </motion.div>
          </div>

          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 1.2 }}
            className="w-full md:basis-1/2"
          >
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100 p-2 shadow-md ">
              <img
                src={HeroImage}
                alt="Landing page preview"
                className="aspect-[4/3] w-full  object-contain rounded-xl border border-gray-300"
                height={1000}
                width={1000}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Hero

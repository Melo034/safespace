import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    { q: "Can I report anonymously?", a: "Yes. You can choose to report without sharing your identity." },
    { q: "Who can see my report?", a: "Only authorized support staff and admins. We minimize access by default." },
    { q: "What files can I upload as evidence?", a: "Images (JPG/PNG) and PDFs up to 10MB each." },
    { q: "How do I get urgent help?", a: "Use the SOS button to call a trusted contact and share your location, or call local emergency services." },
    { q: "How are resources verified?", a: "We review providers before listing and maintain active checks." },
  ];
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-6">FAQ</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-none">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}


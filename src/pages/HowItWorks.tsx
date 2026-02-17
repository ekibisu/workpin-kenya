import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HowItWorksSection from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";

const HowItWorks = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <div className="container py-12">
        <h1 className="mb-2 text-3xl font-extrabold">How Workpin Works</h1>
        <p className="mb-8 text-muted-foreground">A simple, transparent process to get your job done.</p>
      </div>
      <HowItWorksSection />
      <CTASection />
    </main>
    <Footer />
  </div>
);

export default HowItWorks;

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServiceCategories from "@/components/home/ServiceCategories";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";

const Index = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <HeroSection />
      <ServiceCategories />
      <HowItWorks />
      <CTASection />
    </main>
    <Footer />
  </div>
);

export default Index;

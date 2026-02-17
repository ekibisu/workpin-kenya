import { motion } from "framer-motion";
import { FileText, Users, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Describe Your Job",
    description: "Tell us what you need done, your budget, and location. It takes just 2 minutes.",
  },
  {
    icon: Users,
    title: "Get Free Quotes",
    description: "Receive quotes from verified professionals in your area. Compare prices and reviews.",
  },
  {
    icon: CheckCircle,
    title: "Hire & Pay Securely",
    description: "Choose your pro, chat directly, and pay via M-Pesa when the job is done.",
  },
];

const HowItWorks = () => (
  <section className="bg-secondary py-16 md:py-24">
    <div className="container">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-3xl font-extrabold md:text-4xl">
          How <span className="text-gradient">Workpin</span> works
        </h2>
        <p className="mx-auto max-w-md text-muted-foreground">
          Getting help shouldn't be hard. Three simple steps to get your job done.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="relative text-center"
          >
            {i < steps.length - 1 && (
              <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-border md:block" />
            )}
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-brand">
              <step.icon className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
              Step {i + 1}
            </span>
            <h3 className="mb-2 font-heading text-lg font-bold text-foreground">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;

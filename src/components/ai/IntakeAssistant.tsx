import { useState, useEffect } from "react";
import { aiStudioChat } from "@/lib/aiStudio";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Raw imports for prompts (keeps logic clean and manageable)
import optionsGeneratorPrompt from "@/lib/optionsGeneratorPrompt.md?raw";
import summaryGeneratorPrompt from "@/lib/summaryGeneratorPrompt.md?raw";

// Skeleton loader for AI assistant
const AssistantSkeleton = () => (
  <div className="space-y-4 animate-pulse p-1">
    <div className="h-4 bg-slate-200 rounded-full w-3/4"></div>
    <div className="grid grid-cols-1 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-slate-100 rounded-xl w-full border border-slate-50"></div>
      ))}
    </div>
  </div>
);

interface IntakeAssistantProps {
  readonly serviceName: string;
  readonly onComplete: (description: string, isAi: boolean) => void;
}

type StepData = {
  step: number;
  question: string;
  options: string[];
  type: string;
};

export default function IntakeAssistant({ serviceName, onComplete }: IntakeAssistantProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [stepData, setStepData] = useState<StepData | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Reset assistant state whenever the service selection changes
  useEffect(() => {
    setStep(1);
    setAnswers([]);
    setCompleted(false);
    setStepData(null);
    setOpen(false);
  }, [serviceName]);

  const fetchNextStep = async (stepNumber: number, currentAnswers: string[] = []) => {
    setLoading(true);

    // Process the template from optionsGeneratorPrompt.md
    const prompt = optionsGeneratorPrompt
      .replace("{{selected_service}}", serviceName)
      .replace("{{current_step}}", stepNumber.toString())
      + `\n\n**User Context so far:** ${currentAnswers.join(", ") || "Starting fresh"}`;

    try {
      const rawResponse = await aiStudioChat(prompt);
      
      // Clean up markdown block markers and parse JSON
      const cleanJson = rawResponse.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanJson);
      setStepData(data);
    } catch (error) {
      console.error("AI Step Generation Error:", error);
      setOpen(false); // Graceful close on error
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    // Fetch first step only if we don't have it yet
    if (!open && !stepData && !loading) {
      fetchNextStep(1, []);
    }
    setOpen(!open);
  };

  const handleOptionClick = async (option: string) => {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);
    
    if (step < 3) {
      const nextStep = step + 1;
      setStep(nextStep);
      await fetchNextStep(nextStep, newAnswers);
    } else {
      await fetchSummary(newAnswers);
    }
  };

  const fetchSummary = async (allAnswers: string[]) => {
    setLoading(true);

    // Process the template from summaryGeneratorPrompt.md
    const prompt = summaryGeneratorPrompt
      .replace("{{selected_service}}", serviceName)
      .replace("{{user_answers}}", allAnswers.join(", "));

    try {
      const response = await aiStudioChat(prompt);
      
      // Robust cleaning of any AI prefixes (e.g., "Summary:")
      const cleanSummary = response
        .replace(/^(Description:|Summary:|Job Request:|Project Description:|Assistant:)/i, "")
        .trim();

      setCompleted(true);
      setOpen(false);
      onComplete(cleanSummary, true);
    } catch (error) {
      console.error("AI Summary Generation Error:", error);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      {/* Toggle Button */}
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        onClick={handleStart} 
        className="flex items-center gap-2 text-primary hover:bg-primary/5 h-8" 
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        <span className="text-sm font-medium">
          {loading ? "Thinking..." : "Help me write this"}
        </span>
      </Button>

      {/* Interactive Step UI */}
      {open && !completed && (
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          {loading ? (
            <AssistantSkeleton />
          ) : stepData ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Step {step} of 3</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {stepData.question}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {stepData.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionClick(option)}
                    className="w-full p-3 text-left text-sm border bg-white rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group shadow-sm active:scale-[0.98]"
                  >
                    <span className="text-slate-700 font-medium">{option}</span>
                    <span className="text-slate-300 group-hover:text-primary transition-colors">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-slate-500 mb-2">Something went wrong.</p>
              <Button variant="outline" size="sm" onClick={() => fetchNextStep(step, answers)}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
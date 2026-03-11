import { useState, useEffect, useRef } from "react";
import { aiStudioChat } from "@/lib/aiStudio";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";


interface IntakeAssistantProps {
  readonly serviceName: string;
  readonly onComplete: (description: string) => void;
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
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [timeoutMsg, setTimeoutMsg] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Prefetch first question when serviceName changes
  useEffect(() => {
    setOpen(false);
    setStep(1);
    setAnswers([]);
    setCompleted(false);
    setTimeoutMsg("");
    // Only prefetch if serviceName is set
    if (serviceName) {
      setLoading(true);
      fetchNextStep(1, []).then(() => setLoading(false));
    } else {
      setStepData(null);
      setLoading(false);
    }
  }, [serviceName]);

  const SYSTEM_PROMPT = `You are the Workpin Intake Architect. Your job is to generate diagnostic questions for the service: {{selected_service}}.

RULES:
1. RESPONSE FORMAT: You must respond ONLY with a valid JSON object. No prose, no 'Here is your question.'
2. STRUCTURE: The JSON must contain:
   {
     "step": {{current_step}},
     "question": "A concise question for the user",
     "options": ["Option A", "Option B", "Option C", "Option D"],
     "type": "single-choice"
   }
3. SERVICE SPECIFICITY: 
   - If Plumbing: Ask about fixtures (sink, toilet), then issue type (leak, block), then parts.
   - If Cleaning: Ask about house type, then depth (deep vs standard), then supplies.
4. LOCALIZATION: Use Kenyan context (e.g., 'Bedsitter', 'Estate', 'Fundi').
5. MEMORY: Ignore all previous service categories. Focus ONLY on {{selected_service}}.`;

  const fetchNextStep = async (stepNumber: number, currentAnswers: string[] = []) => {
    setLoading(true);
    setShowSkeleton(true);
    setTimeoutMsg("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTimeoutMsg("This is taking longer than usual. Please wait or try again in a moment.");
    }, 8000); // 8 seconds
    const prompt = SYSTEM_PROMPT.replace("{{selected_service}}", serviceName).replace("{{current_step}}", String(stepNumber));
    const userInput = JSON.stringify({ service: serviceName, step: stepNumber, previousAnswers: currentAnswers });
    const response = await aiStudioChat([
      { role: "system", content: prompt },
      { role: "user", content: userInput }
    ], prompt);
    let data;
    try {
      data = typeof response.content === "string" ? JSON.parse(response.content) : response.content;
    } catch (e) {
      console.error('Failed to parse AI response:', e, response.content);
      data = { question: "Sorry, there was an error. Please try again.", options: [], type: "single-choice" };
    }
    setStepData(data);
    setLoading(false);
    setTimeoutMsg("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Always show skeleton for at least 0.5s
    setTimeout(() => setShowSkeleton(false), 500);
  };

  const handleStart = () => {
    setOpen((prev) => !prev);
    // No need to fetch again, question is already prefetched
  };

  const handleOptionClick = (option: string) => {
    const newAnswers = [...answers, option];
    if (step < 3) {
      setStep(step + 1);
      setAnswers(newAnswers);
      fetchNextStep(step + 1, newAnswers);
    } else {
      fetchSummary(newAnswers);
    }
  };

  const fetchSummary = async (allAnswers: string[]) => {
    setLoading(true);
    setShowSkeleton(true);
    setTimeoutMsg("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Always show skeleton for at least 1s for summary
    const minSkeleton = new Promise((resolve) => setTimeout(resolve, 1000));
    const summaryPrompt = `You are the Workpin Intake Architect. Write a 3-sentence professional summary for a ${serviceName} request using these details: ${allAnswers.join(", ")}. Format: Project Description: [summary]`;
    const aiPromise = aiStudioChat([
      { role: "system", content: summaryPrompt }
    ], summaryPrompt);
    const [response] = await Promise.all([aiPromise, minSkeleton]);
    let summary = response.content;
    if (typeof summary === "string" && summary.startsWith("Project Description:")) {
      summary = summary.replace("Project Description:", "").trim();
    }
    setLoading(false);
    setShowSkeleton(false);
    setCompleted(true);
    setOpen(false);
    setTimeoutMsg("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onComplete(summary);
  };

  return (
    <div className="mt-2">
      <Button type="button" variant="ghost" size="sm" onClick={handleStart} className="flex items-center gap-1" title="Help me write this">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Help me write this</span>
      </Button>
      {open && !completed && (
        <div className="mt-2 rounded-xl bg-accent/60 border border-border p-4 shadow-sm animate-in fade-in flex flex-col gap-3">
          {showSkeleton || loading || !stepData ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-12 bg-slate-100 rounded-lg w-full"></div>
              <div className="h-12 bg-slate-100 rounded-lg w-full"></div>
            </div>
          ) : (
            <>
              <div className="text-primary font-semibold mb-1">{stepData.question}</div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {stepData.options.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    className="p-3 text-left bg-white border border-slate-200 rounded-lg hover:border-[#00a884] hover:bg-emerald-50 transition-all"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {completed && (
        <div className="mt-2 rounded-xl bg-green-50 border border-green-200 p-3 text-green-900 text-sm animate-in fade-in">
          <span>Done! Your description has been filled in above.</span>
        </div>
      )}
    </div>
  );
}
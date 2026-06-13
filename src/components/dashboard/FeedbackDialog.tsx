import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FeedbackDialogProps {
  open: boolean;
  requestId: string | null;
  providerId: string | null;
  workThreadMap: Record<string, string>;
  onClose: () => void;
}

export default function FeedbackDialog({
  open, requestId, providerId, workThreadMap, onClose,
}: FeedbackDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(5);
      setComment("");
    }
  }, [open, requestId]);

  const handleSubmit = async () => {
    if (!user || !requestId || !providerId) return;
    let threadId = workThreadMap[requestId];
    if (!threadId) {
      const { data: wt } = await supabase
        .from("work_threads")
        .select("id")
        .eq("job_request_id", requestId)
        .eq("client_id", user.id)
        .maybeSingle();
      threadId = wt?.id;
    }
    if (!threadId) {
      toast({ title: "Error", description: "Could not find work thread for this job.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      work_thread_id: threadId,
      client_id: user.id,
      provider_id: providerId,
      rating,
      body: comment || null,
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" });
      return;
    }
    await supabase.from("work_threads")
      .update({ status: "reviewed" })
      .eq("id", threadId);
    setSubmitting(false);
    onClose();
    toast({ title: "Thank you!", description: "Your feedback has been submitted." });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How was the service?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-7 w-7 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-comment">Comments (optional)</Label>
            <Textarea
              id="feedback-comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feedback
            </Button>
            <Button variant="outline" onClick={onClose}>Skip</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

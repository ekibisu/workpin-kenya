import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Image from "@/components/ui/Image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadMediaFile } from "@/hooks/useMediaUpload";

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workThreadId: string;
  jobRequestId: string;
  onDisputeFiled: () => void;
}

const REASONS = [
  "Work not completed",
  "Quality below standard",
  "Provider no-show",
  "Safety concern",
  "Other",
];

const MAX_EVIDENCE = 3;

export default function DisputeDialog({
  open, onOpenChange, workThreadId, jobRequestId, onDisputeFiled,
}: DisputeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason(""); setDescription(""); setFiles([]); setSubmitting(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    const merged = [...files, ...incoming].slice(0, MAX_EVIDENCE);
    setFiles(merged);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!reason) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    if (description.trim().length < 20) {
      toast({
        title: "More detail needed",
        description: "Please describe what happened (at least 20 characters).",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const rec = await uploadMediaFile({
          file,
          context: "dispute-evidence",
        });
        if (rec?.public_url) uploadedUrls.push(rec.public_url);
      }

      const { error: insertErr } = await supabase.from("disputes").insert({
        work_thread_id: workThreadId,
        filed_by_id: user.id,
        reason,
        description,
        evidence_urls: uploadedUrls,
        status: "open",
      });
      if (insertErr) throw insertErr;

      const { error: updateErr } = await supabase
        .from("job_requests")
        .update({ status: "pending" })
        .eq("id", jobRequestId);
      if (updateErr) throw updateErr;

      await supabase
        .from("work_threads")
        .update({ status: "disputed" })
        .eq("id", workThreadId);

      toast({
        title: "Dispute filed",
        description: "We'll be in touch within 24 hours.",
      });
      onDisputeFiled();
      handleClose(false);
    } catch (err) {
      console.error("[DisputeDialog]", err);
      toast({
        title: "Could not file dispute",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Describe what went wrong. Our team reviews within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..."
              rows={5}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {description.trim().length}/20 minimum characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Evidence photos (optional, up to {MAX_EVIDENCE})</Label>
            {files.length < MAX_EVIDENCE && (
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={submitting}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
              />
            )}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`Evidence ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={submitting}
                      className="absolute right-0 top-0 rounded-bl-md bg-background/80 p-0.5 hover:bg-background"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            File Dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

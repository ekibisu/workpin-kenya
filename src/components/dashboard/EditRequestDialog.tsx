import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadMediaFile } from "@/hooks/useMediaUpload";
import questionsData from "@/data/questions.json";
import { deriveArchetype, type JobRequest } from "./dashboardTypes";

interface EditRequestDialogProps {
  request: JobRequest | null;
  onClose: () => void;
  onSaved: (updated: Partial<JobRequest>) => void;
}

export default function EditRequestDialog({ request, onClose, onSaved }: EditRequestDialogProps) {
  const { toast } = useToast();
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [editLocation, setEditLocation] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editUploading, setEditUploading] = useState(false);

  useEffect(() => {
    if (!request) return;
    try {
      setEditAnswers(JSON.parse(request.description));
    } catch {
      setEditAnswers({ task_description: request.description });
    }
    setEditLocation(request.location_name ?? "");
    setEditImages(Array.isArray(request.image_urls) ? request.image_urls : []);
  }, [request]);

  const handleSaveEdit = async () => {
    if (!request) return;
    setSavingEdit(true);
    const updatedDescription = JSON.stringify(editAnswers);
    const updates = {
      description: updatedDescription,
      location_name: editLocation.trim() || null,
      image_urls: editImages,
    };
    const { error } = await supabase
      .from("job_requests")
      .update(updates)
      .eq("id", request.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
      return;
    }
    onSaved(updates);
    onClose();
    toast({ title: "Request updated" });
  };

  const handleRemoveEditImage = (idx: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddEditImages = async (files: FileList | null) => {
    if (!files) return;
    setEditUploading(true);
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadMediaFile({ file: files[i], context: "request-image" });
        uploaded.push(result.public_url);
      } catch {}
    }
    setEditImages((prev) => [...prev, ...uploaded]);
    setEditUploading(false);
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-base">
            Edit Request
            {request?.services?.name && (
              <span className="ml-1 font-normal text-muted-foreground">— {request.services.name}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {(() => {
            const archetype = deriveArchetype(request?.services?.archetype);
            const questions: any[] = (questionsData as any).archetypes?.[archetype]?.questions ?? [];
            return questions
              .filter((q) => q.type !== "image_upload")
              .map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <Label className="text-sm font-medium">{q.label}</Label>
                  {q.type === "textarea" ? (
                    <Textarea
                      value={editAnswers[q.id] ?? ""}
                      onChange={(e) => setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      rows={3}
                      className="resize-none text-sm"
                      placeholder={q.placeholder}
                    />
                  ) : q.type === "date" ? (
                    <Input
                      type="date"
                      value={editAnswers[q.id] ?? ""}
                      onChange={(e) => setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="text-sm"
                    />
                  ) : (
                    <select
                      value={editAnswers[q.id] ?? ""}
                      onChange={(e) => setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select…</option>
                      {q.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ));
          })()}

          <div className="border-t border-border" />

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Photos</Label>
            <div className="flex flex-wrap gap-2">
              {editImages.map((url, idx) => (
                <div key={url || idx} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                  <img src={url} alt={`edit-img-${idx}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveEditImage(idx)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 shadow"
                    aria-label="Remove image"
                  >
                    <span style={{ fontWeight: "bold", fontSize: "1.1em" }}>&times;</span>
                  </button>
                </div>
              ))}
              {editImages.length < 3 && (
                <label className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-100 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    disabled={editUploading}
                    onChange={(e) => handleAddEditImages(e.target.files)}
                  />
                  <span style={{ fontSize: "2em" }}>+</span>
                  <span className="text-[10px]">Add photo</span>
                </label>
              )}
            </div>
            <p className="text-xs text-gray-400">Up to 3 photos · JPG, PNG, WebP</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="e.g. Kilimani, Nairobi"
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={savingEdit || !editAnswers.task_description?.trim()}
            onClick={handleSaveEdit}
          >
            {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

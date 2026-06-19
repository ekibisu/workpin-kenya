import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmHireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  serviceName: string;
  priceKes: number;
  onConfirm: () => void;
  confirming: boolean;
}

export default function ConfirmHireDialog({
  open,
  onOpenChange,
  providerName,
  serviceName,
  priceKes,
  onConfirm,
  confirming,
}: ConfirmHireDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!confirming) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hire {providerName}?</DialogTitle>
          <DialogDescription>
            Review your selection before continuing to payment.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium text-foreground text-right">{serviceName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium text-foreground text-right">{providerName}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2">
            <span className="text-muted-foreground">Quoted price</span>
            <span className="font-bold text-primary text-right">
              KES {Number(priceKes).toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Confirming will decline any other quotes on this request. You'll be asked
          to pay via M-Pesa on the next step.
        </p>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={confirming}>
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm and continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

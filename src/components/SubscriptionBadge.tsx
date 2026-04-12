import { Badge } from "@/components/ui/badge";
import { Crown, Zap } from "lucide-react";

interface SubscriptionBadgeProps {
  status: string | null;
  size?: "sm" | "md";
}

const SubscriptionBadge = ({ status, size = "sm" }: SubscriptionBadgeProps) => {
  if (!status || status === "free") return null;

  const isPremium = status === "premium";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <Badge
      className={`gap-1 ${
        isPremium
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
      }`}
      variant="outline"
    >
      {isPremium ? (
        <Crown className={iconSize} />
      ) : (
        <Zap className={iconSize} />
      )}
      {isPremium ? "Premium" : "Pro"}
    </Badge>
  );
};

export default SubscriptionBadge;

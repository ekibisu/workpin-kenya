import { useEffect, useState } from "react";
import { Star, Clock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface ProviderProfileCardProps {
  userId: string;
}

const ProviderProfileCard = ({ userId }: ProviderProfileCardProps) => {
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [breakdown, setBreakdown] = useState<number[]>([0, 0, 0, 0, 0]); // index 0 = 1-star, 4 = 5-star

  useEffect(() => {
    const fetch = async () => {

      const [provRes, revRes] = await Promise.all([
        supabase
          .from("provider_profiles")
          .select("avg_rating, total_reviews")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("reviews")
          .select("rating")
          .eq("provider_id", userId),
      ]);

      if (provRes.data) {
        setRating(Number(provRes.data.avg_rating) || 0);
        setTotalReviews(Number(provRes.data.total_reviews) || 0);
      }

      if (revRes.data) {
        const counts = [0, 0, 0, 0, 0];
        revRes.data.forEach((r) => {
          const v = r.rating;
          if (v && v >= 1 && v <= 5) counts[v - 1]++;
        });
        setBreakdown(counts);
      }

      setLoading(false);
    };
    fetch();
  }, [userId]);

  const renderStars = (value: number) => {
    const rounded = Math.round(value * 2) / 2;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i <= rounded
                ? "fill-[#059669] text-[#059669]"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const maxCount = Math.max(...breakdown, 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Professional Profile</h3>

      {/* Average Rating */}
      <div className="flex items-center gap-3">
        <span className="text-4xl font-extrabold text-foreground">
          {rating > 0 ? rating.toFixed(1) : "—"}
        </span>
        <div>
          {renderStars(rating)}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star - 1];
          const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right text-muted-foreground">{star}</span>
              <Star className="h-3 w-3 fill-[#059669] text-[#059669]" />
              <Progress value={pct} className="h-2 flex-1" />
              <span className="w-5 text-right text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background p-2.5">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">&lt; 2 hrs</p>
            <p className="text-[10px] text-muted-foreground">Response</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background p-2.5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">98%</p>
            <p className="text-[10px] text-muted-foreground">Completion</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfileCard;

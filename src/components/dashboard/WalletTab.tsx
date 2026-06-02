import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useUserBusinesses,
  useProviderWallet,
  useWalletTransactions,
} from "@/hooks/useNewSchemaQueries";
import { Wallet as WalletIcon, Clock } from "lucide-react";

const formatKES = (n: number | null | undefined) =>
  `KES ${(n ?? 0).toLocaleString()}`;

const typeBadgeClass = (type: string) => {
  if (type === "credit") return "bg-green-100 text-green-800 border-green-200";
  if (type === "platform_fee") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
};

const amountClass = (type: string) =>
  type === "credit" ? "text-green-600" : "text-red-600";

const amountPrefix = (type: string) => (type === "credit" ? "+" : "-");

const WalletTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { data: businesses } = useUserBusinesses(user?.id ?? "");
  const businessId = businesses?.[0]?.id ?? "";

  const { data: wallet, isLoading: walletLoading } = useProviderWallet(businessId);
  const { data: transactions, isLoading: txLoading } = useWalletTransactions(businessId);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("mpesa_phone")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const available = wallet?.available_balance_kes ?? 0;
  const pending = wallet?.pending_balance_kes ?? 0;
  const canPayout = available > 0 && !!profile?.mpesa_phone;

  const handlePayout = async () => {
    if (!profile?.mpesa_phone) {
      toast({
        title: "M-Pesa number missing",
        description: "Add your M-Pesa phone number in Settings to request a payout.",
        variant: "destructive",
      });
      return;
    }
    if (available <= 0 || !businessId) return;
    setSubmitting(true);
    const { error } = await supabase.from("payout_requests").insert({
      provider_id: businessId,
      amount_kes: available,
      mpesa_phone: profile.mpesa_phone,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't request payout", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payout requested. We process within 2 business days." });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WalletIcon className="h-4 w-4" /> Available
          </div>
          {walletLoading ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <div className="mt-2 text-2xl font-extrabold text-foreground">{formatKES(available)}</div>
          )}
          <Button
            className="mt-4 w-full"
            disabled={!canPayout || submitting}
            onClick={handlePayout}
          >
            {submitting ? "Requesting…" : "Request Payout"}
          </Button>
          {!profile?.mpesa_phone && !walletLoading && (
            <p className="mt-2 text-xs text-muted-foreground">
              Add your M-Pesa number in Settings to enable payouts.
            </p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Pending
          </div>
          {walletLoading ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <div className="mt-2 text-2xl font-extrabold text-foreground">{formatKES(pending)}</div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Funds clear once jobs are marked complete.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Transactions</h3>
        </div>
        {txLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No transactions yet. Complete your first job to start earning.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-foreground">{tx.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={typeBadgeClass(tx.type)}>
                        {tx.type}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${amountClass(tx.type)}`}>
                      {amountPrefix(tx.type)}
                      {formatKES(Math.abs(tx.amount_kes))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WalletTab;

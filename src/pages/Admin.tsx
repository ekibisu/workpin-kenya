import { Fragment as FragmentRow, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Image from "@/components/ui/Image";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const DISPUTE_STATUSES = ["open", "investigating", "resolved", "closed"];
const PAYOUT_STATUSES = ["pending", "paid", "rejected"];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-800",
    investigating: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-muted text-muted-foreground",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-muted text-muted-foreground";
};

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- TAB 1: VERIFICATION ---------- */
function VerificationQueueTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("businesses")
        .select("id, business_name, owner_id, verification_id_url, verification_submitted_at, is_verified")
        .not("verification_id_url", "is", null)
        .order("verification_submitted_at", { ascending: false });
      if (error) throw error;
      const ownerIds = Array.from(new Set((rows || []).map((r) => r.owner_id))).filter(Boolean);
      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ownerIds);
        profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      }
      return (rows || []).map((r) => ({ ...r, owner: profileMap[r.owner_id] }));
    },
  });

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("businesses").update({ is_verified: true }).eq("id", id);
    setBusyId(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Business verified" });
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("businesses")
      .update({ is_verified: false, verification_id_url: null })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Verification rejected" });
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
  };

  if (isLoading) return <TableSkeleton cols={5} />;
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">No pending verifications.</p>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.business_name}</TableCell>
              <TableCell>{row.owner?.full_name || row.owner?.email || "—"}</TableCell>
              <TableCell>
                {row.verification_submitted_at
                  ? format(new Date(row.verification_submitted_at), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell>
                {row.verification_id_url ? (
                  <button onClick={() => setPreviewUrl(row.verification_id_url)} className="block h-12 w-12 overflow-hidden rounded border border-border">
                    <Image src={row.verification_id_url} alt="ID" className="h-full w-full object-cover" />
                  </button>
                ) : "—"}
              </TableCell>
              <TableCell>
                <Badge className={row.is_verified ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}>
                  {row.is_verified ? "verified" : "pending"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => handleApprove(row.id)} disabled={busyId === row.id}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(row.id)} disabled={busyId === row.id}>
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>ID Document</DialogTitle></DialogHeader>
          {previewUrl && <Image src={previewUrl} alt="ID full" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- TAB 2: DISPUTES ---------- */
function DisputesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { status?: string; admin_note?: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const filerIds = Array.from(new Set((rows || []).map((r) => r.filed_by_id))).filter(Boolean);
      let profMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (filerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", filerIds);
        profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      }
      const threadIds = Array.from(new Set((rows || []).map((r) => r.work_thread_id))).filter(Boolean);
      let payMap: Record<string, { id: string; status: string; amount_kes: number }> = {};
      if (threadIds.length) {
        const { data: pays } = await supabase
          .from("payments")
          .select("id, status, amount_kes, work_thread_id, created_at")
          .in("work_thread_id", threadIds)
          .order("created_at", { ascending: false });
        for (const p of pays || []) {
          if (!payMap[p.work_thread_id] && (p.status === "held" || p.status === "paid" || p.status === "released" || p.status === "refunded")) {
            payMap[p.work_thread_id] = { id: p.id, status: p.status, amount_kes: p.amount_kes };
          }
        }
      }
      return (rows || []).map((r) => ({
        ...r,
        filer: profMap[r.filed_by_id],
        payment: payMap[r.work_thread_id] ?? null,
      }));
    },
  });

  const saveDispute = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setSavingId(id);
    const update: Record<string, unknown> = {};
    if (edit.status) update.status = edit.status;
    if (edit.admin_note !== undefined) update.admin_note = edit.admin_note;
    const { error } = await supabase.from("disputes").update(update).eq("id", id);
    setSavingId(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Dispute updated" });
    setEdits((p) => { const n = { ...p }; delete n[id]; return n; });
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  };

  const refundClient = async (disputeId: string, paymentId: string, note: string) => {
    if (!confirm("Refund the client? The provider will not be paid.")) return;
    setActionBusyId(disputeId);
    const { error: rpcErr } = await supabase.rpc("refund_payment", { p_payment_id: paymentId });
    if (rpcErr) {
      setActionBusyId(null);
      return toast({ title: "Refund failed", description: rpcErr.message, variant: "destructive" });
    }
    await supabase.from("disputes").update({ status: "resolved", admin_note: note }).eq("id", disputeId);
    setActionBusyId(null);
    toast({ title: "Client refunded" });
    setEdits((p) => { const n = { ...p }; delete n[disputeId]; return n; });
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  };

  const releaseToProvider = async (disputeId: string, paymentId: string, note: string) => {
    if (!confirm("Release escrow to the provider?")) return;
    setActionBusyId(disputeId);
    const { error: updErr } = await supabase
      .from("disputes")
      .update({ status: "resolved", admin_note: note })
      .eq("id", disputeId);
    if (updErr) {
      setActionBusyId(null);
      return toast({ title: "Error", description: updErr.message, variant: "destructive" });
    }
    const { error: rpcErr } = await supabase.rpc("release_escrow", { p_payment_id: paymentId });
    setActionBusyId(null);
    if (rpcErr) {
      return toast({ title: "Release failed", description: rpcErr.message, variant: "destructive" });
    }
    toast({ title: "Escrow released to provider" });
    setEdits((p) => { const n = { ...p }; delete n[disputeId]; return n; });
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  };

  if (isLoading) return <TableSkeleton cols={4} />;
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">No disputes filed.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Filed by</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const isOpen = expanded === row.id;
          const edit = edits[row.id] || {};
          const currentStatus = edit.status ?? row.status;
          const currentNote = edit.admin_note ?? row.admin_note ?? "";
          return (
            <FragmentRow key={row.id}>
              <TableRow className="cursor-pointer" onClick={() => setExpanded(isOpen ? null : row.id)}>
                <TableCell>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                <TableCell className="font-medium">{row.reason}</TableCell>
                <TableCell><Badge className={statusBadge(row.status)}>{row.status}</Badge></TableCell>
                <TableCell>{row.filer?.full_name || row.filer?.email || "—"}</TableCell>
                <TableCell>{format(new Date(row.created_at), "MMM d, yyyy")}</TableCell>
              </TableRow>
              {isOpen && (
                <TableRow key={`${row.id}-detail`}>
                  <TableCell colSpan={5} className="bg-muted/30">
                    <div className="space-y-3 py-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Description</p>
                        <p className="text-sm">{row.description || "—"}</p>
                      </div>
                      {row.evidence_urls?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Evidence</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {row.evidence_urls.map((u: string, i: number) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer" className="h-16 w-16 overflow-hidden rounded border border-border">
                                <Image src={u} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 md:flex-row md:items-end">
                        <div className="flex-1">
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Status</p>
                          <Select
                            value={currentStatus}
                            onValueChange={(v) => setEdits((p) => ({ ...p, [row.id]: { ...p[row.id], status: v } }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DISPUTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-[2]">
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Admin note</p>
                          <Textarea
                            value={currentNote}
                            onChange={(e) => setEdits((p) => ({ ...p, [row.id]: { ...p[row.id], admin_note: e.target.value } }))}
                            rows={2}
                          />
                        </div>
                        <Button size="sm" onClick={() => saveDispute(row.id)} disabled={savingId === row.id}>
                          {savingId === row.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Save
                        </Button>
                      </div>
                      {row.payment && (row.payment.status === "held" || row.payment.status === "paid") && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground mr-2">
                            Resolve escrow (KES {row.payment.amount_kes}):
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionBusyId === row.id}
                            onClick={() => refundClient(row.id, row.payment.id, currentNote)}
                          >
                            {actionBusyId === row.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Refund client
                          </Button>
                          <Button
                            size="sm"
                            disabled={actionBusyId === row.id}
                            onClick={() => releaseToProvider(row.id, row.payment.id, currentNote)}
                          >
                            {actionBusyId === row.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Release to provider
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </FragmentRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/* ---------- TAB 3: PAYOUTS ---------- */
function PayoutsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const providerIds = Array.from(new Set((rows || []).map((r) => r.provider_id))).filter(Boolean);
      let bizMap: Record<string, { business_name: string; owner_id: string }> = {};
      let ownerMap: Record<string, { mpesa_phone: string | null }> = {};
      if (providerIds.length) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, business_name, owner_id")
          .in("id", providerIds);
        bizMap = Object.fromEntries((biz || []).map((b) => [b.id, b]));
        const ownerIds = Array.from(new Set((biz || []).map((b) => b.owner_id)));
        if (ownerIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, mpesa_phone")
            .in("id", ownerIds);
          ownerMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
        }
      }
      return (rows || []).map((r) => {
        const b = bizMap[r.provider_id];
        return {
          ...r,
          business_name: b?.business_name || "—",
          mpesa_phone: (b && ownerMap[b.owner_id]?.mpesa_phone) || r.mpesa_phone || "—",
        };
      });
    },
  });

  const markPaid = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("payout_requests")
      .update({ status: "paid", processed_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Marked as paid" });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    setBusyId(rejectId);
    const { error } = await supabase
      .from("payout_requests")
      .update({ status: "rejected", admin_note: rejectNote, processed_at: new Date().toISOString() })
      .eq("id", rejectId);
    setBusyId(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Payout rejected" });
    setRejectId(null);
    setRejectNote("");
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
  };

  if (isLoading) return <TableSkeleton cols={5} />;
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">No payout requests.</p>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Amount (KES)</TableHead>
            <TableHead>M-Pesa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.business_name}</TableCell>
              <TableCell>{row.amount_kes.toLocaleString()}</TableCell>
              <TableCell>{row.mpesa_phone}</TableCell>
              <TableCell><Badge className={statusBadge(row.status)}>{row.status}</Badge></TableCell>
              <TableCell>{format(new Date(row.created_at), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right">
                {row.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => markPaid(row.id)} disabled={busyId === row.id}>
                      Mark Paid
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectId(row.id); setRejectNote(""); }} disabled={busyId === row.id}>
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payout</DialogTitle></DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button onClick={confirmReject} disabled={busyId === rejectId}>
              {busyId === rejectId && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- TAB 4: USERS ---------- */
function UsersTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, country_code, subscription_tier, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((u) =>
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  if (isLoading) return <TableSkeleton cols={5} />;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
              <TableCell>{u.email || "—"}</TableCell>
              <TableCell>{u.country_code}</TableCell>
              <TableCell><Badge variant="secondary">{u.subscription_tier}</Badge></TableCell>
              <TableCell>{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ---------- PAGE ---------- */
export default function Admin() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useIsAdmin();

  useEffect(() => {
    if (!isLoading && isAdmin === false) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <div>
        <Navbar />
        <main className="container py-8"><Skeleton className="h-96 w-full" /></main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="container py-6">
        <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">Admin</h1>
        <Tabs defaultValue="verifications">
          <TabsList>
            <TabsTrigger value="verifications">Verification Queue</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="verifications" className="mt-4"><VerificationQueueTab /></TabsContent>
          <TabsContent value="disputes" className="mt-4"><DisputesTab /></TabsContent>
          <TabsContent value="payouts" className="mt-4"><PayoutsTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

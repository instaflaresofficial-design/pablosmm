"use client";

import * as React from "react";
import { Clock, ShieldCheck, CheckCircle2, RefreshCw, FileText, ChevronDown, ChevronUp, Download, Hourglass } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card } from "@/components/admin/ui/card";
import { toast } from "sonner";

export interface SubmissionsAuditViewProps {
  isAdmin?: boolean;
  providerNameFilter?: string;
}

export function AdminSubmissionsView({ isAdmin = true, providerNameFilter }: SubmissionsAuditViewProps) {
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = React.useState(false);

  const fetchSubmissions = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/provider/services/curate");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to load submissions", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Filter submissions by providerName if in provider mode
  const filteredSubmissions = React.useMemo(() => {
    if (!providerNameFilter) return submissions;
    const filterKey = providerNameFilter.toLowerCase().replace(/[^a-z0-9]/g, "");
    return submissions.filter((s) => {
      const provName = (s.providerName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return provName.includes(filterKey) || filterKey.includes(provName);
    });
  }, [submissions, providerNameFilter]);

  const [hasInitializedExpand, setHasInitializedExpand] = React.useState(false);

  // Auto-expand latest submission ONCE on load
  React.useEffect(() => {
    if (filteredSubmissions.length > 0 && !hasInitializedExpand) {
      setExpandedId(filteredSubmissions[0].id);
      setHasInitializedExpand(true);
    }
  }, [filteredSubmissions, hasInitializedExpand]);

  const visibleSubmissions = filteredSubmissions;

  return (
    <Card className="p-5 border-2 border-emerald-500/30 bg-card rounded-2xl shadow-sm space-y-4 my-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              {isAdmin ? "Live Provider Submissions Feed" : "Your Submitted Verifications Audit"}
              <Badge className="bg-emerald-600 text-white font-mono text-xs">
                {filteredSubmissions.length} Batches
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Review exact service verifications, refill guarantees, and cancel button settings marked by your panel providers."
                : "Audit trail of working services, custom refill rules, and limit overrides you have submitted."}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchSubmissions}
          disabled={loading}
          className="gap-1.5 text-xs font-semibold shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground border-2 border-dashed rounded-xl space-y-1">
          <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="font-semibold text-foreground">
            {isAdmin ? "No Provider Submissions Received Yet" : "No Submitted Verification Batches Yet"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isAdmin
              ? "Share verification links with your providers to start receiving live verifications here."
              : "Pick working services from the catalog and click Submit to log your verification batch."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSubmissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const dateStr = sub.timestamp ? new Date(sub.timestamp).toLocaleString("en-IN") : "Recent";

            return (
              <div
                key={sub.id}
                className="border-2 border-border/80 rounded-xl overflow-hidden bg-card hover:border-emerald-500/40 transition-all"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="p-4 bg-muted/30 hover:bg-muted/60 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold text-xs font-mono">
                      BATCH #{sub.id.slice(-6).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                        {sub.providerName || "Provider Verification"}
                        <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                          {sub.count || sub.updates?.length || 0} Services Marked Working
                        </Badge>
                      </h4>
                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" /> {dateStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Status Display */}
                    {sub.status === "approved" ? (
                      <Badge className="bg-emerald-600 text-white font-mono text-xs px-2.5 py-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED ✅
                      </Badge>
                    ) : sub.status === "rejected" ? (
                      <Badge variant="destructive" className="font-mono text-xs px-2.5 py-1">
                        REJECTED ❌
                      </Badge>
                    ) : isAdmin ? (
                      /* Admin Privileged Approval Controls */
                      <>
                        <Button
                          size="xs"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch("/api/provider/services/curate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "approve",
                                  submissionId: sub.id,
                                  updates: sub.updates,
                                }),
                              });
                              if (res.ok) {
                                toast.success(`Approved & applied ${sub.updates?.length || 0} service edits to live catalog!`);
                                await fetchSubmissions();
                              }
                            } catch (err: any) {
                              toast.error("Failed to approve submission");
                            }
                          }}
                          className="h-7 text-xs gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Apply
                        </Button>

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch("/api/provider/services/curate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "reject",
                                  submissionId: sub.id,
                                }),
                              });
                              if (res.ok) {
                                toast.info("Rejected provider submission batch.");
                                await fetchSubmissions();
                              }
                            } catch (err: any) {
                              toast.error("Failed to reject submission");
                            }
                          }}
                          className="h-7 text-xs gap-1 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      /* Provider Read-Only Status Badge */
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-300 font-mono text-xs px-2.5 py-1 flex items-center gap-1 border border-amber-500/30">
                        <Hourglass className="w-3.5 h-3.5" /> Submitted for Admin Review
                      </Badge>
                    )}

                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sub, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", jsonStr);
                        downloadAnchor.setAttribute("download", `submission_${sub.id}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        toast.success("Downloaded submission JSON!");
                      }}
                      className="h-7 text-xs gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Export JSON
                    </Button>

                    <Button size="xs" variant="ghost" className="h-7 w-7 p-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t bg-background space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Detailed Service Modifications ({sub.updates?.length || 0})
                    </h5>

                    <div className="border rounded-xl overflow-hidden divide-y text-xs">
                      <div className="p-2.5 bg-muted/40 font-bold grid grid-cols-12 gap-2 text-muted-foreground uppercase text-[10px]">
                        <div className="col-span-2">Service ID</div>
                        <div className="col-span-4">Platform & Category</div>
                        <div className="col-span-3">Refill & Cancel Setting</div>
                        <div className="col-span-3 text-right">Min / Max Limits</div>
                      </div>

                      {(sub.updates || []).map((item: any, idx: number) => {
                        const rateText = typeof item.rate === "number" && item.rate > 0 
                          ? `₹${item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / 1k`
                          : undefined;

                        return (
                          <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                            <div className="col-span-2 font-mono font-bold text-primary">
                              #{item.id}
                            </div>

                            <div className="col-span-4 space-y-0.5">
                              <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                <span>{item.name || item.serviceName || `${item.platform || "general"} → ${item.category || "working"}`}</span>
                                {sub.status === "approved" && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0">
                                    VERIFIED LIVE ✅
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                                <span>Slot: {item.platform || "general"} → {item.category || "working"}</span>
                                {rateText && <span className="text-emerald-600 dark:text-emerald-400 font-bold">{rateText}</span>}
                              </div>
                            </div>

                            <div className="col-span-3 space-y-0.5">
                              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 block w-fit">
                                ♻️ {item.refillTag || "No Refill"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-mono border-sky-500/30 text-sky-600 block w-fit">
                                🚫 Cancel: {item.cancel === true ? "Enabled" : item.cancel === false ? "Disabled" : "API Default"}
                              </Badge>
                            </div>

                            <div className="col-span-3 text-right font-mono text-[11px] text-foreground font-semibold">
                              Limits: {item.min || 100} - {item.max ? item.max.toLocaleString() : "50,000"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}
    </Card>
  );
}

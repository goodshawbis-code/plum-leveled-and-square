import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProject,
  useListProjectRfis,
  useListProjectComments,
  useUpdateRfi,
  useDeleteComment,
  getListProjectRfisQueryKey,
  getListProjectCommentsQueryKey,
} from "@workspace/api-client-react";
import type { Rfi, SiteComment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  MapPin,
  Layers,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const PRIORITY_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low:    { label: "Low",    variant: "secondary" },
  medium: { label: "Medium", variant: "outline" },
  high:   { label: "High",   variant: "destructive" },
  urgent: { label: "Urgent", variant: "destructive" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:     { label: "Open",     color: "text-red-600",    icon: <Circle className="h-3.5 w-3.5 fill-red-600 text-red-600" /> },
  answered: { label: "Answered", color: "text-amber-600",  icon: <Clock className="h-3.5 w-3.5 text-amber-600" /> },
  closed:   { label: "Closed",   color: "text-green-600",  icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function RFICard({ rfi, onRespond }: { rfi: Rfi; onRespond: (rfi: Rfi) => void }) {
  const st = STATUS_CONFIG[rfi.status] ?? STATUS_CONFIG.open;
  const pr = PRIORITY_VARIANTS[rfi.priority] ?? PRIORITY_VARIANTS.medium;

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-muted-foreground">
              RFI-{String(rfi.rfiNumber).padStart(3, "0")}
            </span>
            <Badge variant={pr.variant} className="text-xs">{pr.label}</Badge>
            <div className={`flex items-center gap-1 text-xs font-semibold ${st.color}`}>
              {st.icon}
              {st.label}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(rfi.createdAt)}</span>
        </div>

        <div>
          <h3 className="font-semibold text-base">{rfi.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{rfi.description}</p>
        </div>

        <p className="text-xs text-muted-foreground">
          Submitted by <span className="font-medium text-foreground">{rfi.submittedBy}</span>
        </p>

        {rfi.status === "answered" && rfi.response && (
          <div className="rounded-md bg-muted/50 border p-3 space-y-1">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Office Response</p>
            <p className="text-sm leading-relaxed">{rfi.response}</p>
            {rfi.respondedAt && (
              <p className="text-xs text-muted-foreground">{timeAgo(rfi.respondedAt)}</p>
            )}
          </div>
        )}

        {rfi.status === "closed" && rfi.response && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-1">
            <p className="text-xs font-bold tracking-wide text-green-700 uppercase">Resolution</p>
            <p className="text-sm text-green-800 leading-relaxed">{rfi.response}</p>
          </div>
        )}

        {rfi.status === "open" && (
          <Button size="sm" onClick={() => onRespond(rfi)}>
            Respond to RFI
          </Button>
        )}
        {rfi.status === "answered" && (
          <Button size="sm" variant="outline" onClick={() => onRespond(rfi)}>
            Update Response
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CommentCard({ comment, onDelete }: { comment: SiteComment; onDelete: () => void }) {
  const pinIcon = comment.pinType === "gps"
    ? <MapPin className="h-3 w-3 text-green-600" />
    : comment.pinType === "blueprint"
    ? <Layers className="h-3 w-3 text-blue-600" />
    : <MessageCircle className="h-3 w-3 text-muted-foreground" />;

  const pinLabel = comment.pinType === "gps" ? "GPS Tagged"
    : comment.pinType === "blueprint" ? "Blueprint Pin"
    : "General";

  return (
    <div className="flex gap-3 py-3">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{comment.authorName}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {pinIcon}
            <span>{pinLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm leading-relaxed">{comment.content}</p>
        {comment.locationLabel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{comment.locationLabel}</span>
          </div>
        )}
        {!comment.locationLabel && comment.locationLat && comment.locationLng && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{comment.locationLat.toFixed(5)}, {comment.locationLng.toFixed(5)}</span>
          </div>
        )}
      </div>
      <button
        className="text-muted-foreground hover:text-destructive transition-colors mt-1 shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RespondModal({
  rfi,
  onClose,
  onSave,
}: {
  rfi: Rfi;
  onClose: () => void;
  onSave: (response: string, status: "answered" | "closed") => Promise<void>;
}) {
  const [response, setResponse] = useState(rfi.response ?? "");
  const [status, setStatus] = useState<"answered" | "closed">("answered");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await onSave(response.trim(), status);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Respond to RFI-{String(rfi.rfiNumber).padStart(3, "0")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{rfi.title}</p>
        </div>

        <div className="rounded-md bg-muted/40 border p-3 text-sm text-muted-foreground">
          {rfi.description}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Response</label>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Provide your clarification or resolution here…"
            rows={5}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mark as</label>
          <div className="flex gap-3">
            {(["answered", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  status === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                {s === "answered" ? "Answered (pending closure)" : "Closed (resolved)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !response.trim()}>
            {saving ? "Saving…" : "Send Response"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectRFIs() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId);
  const { data: rfis, isLoading: rfisLoading } = useListProjectRfis(projectId);
  const { data: comments, isLoading: commentsLoading } = useListProjectComments(projectId);
  const { mutateAsync: updateRfi } = useUpdateRfi();
  const { mutateAsync: deleteComment } = useDeleteComment();

  const [respondingTo, setRespondingTo] = useState<Rfi | null>(null);

  const openCount = rfis?.filter((r) => r.status === "open").length ?? 0;

  async function handleRespond(response: string, status: "answered" | "closed") {
    if (!respondingTo) return;
    try {
      await updateRfi({
        id: respondingTo.id,
        data: { response, status },
      });
      await queryClient.invalidateQueries({ queryKey: getListProjectRfisQueryKey(projectId) });
      toast({ title: "Response sent", description: `RFI-${String(respondingTo.rfiNumber).padStart(3, "0")} updated.` });
      setRespondingTo(null);
    } catch {
      toast({ title: "Error", description: "Failed to save response.", variant: "destructive" });
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment({ id: commentId });
      await queryClient.invalidateQueries({ queryKey: getListProjectCommentsQueryKey(projectId) });
      toast({ title: "Comment deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete comment.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{project?.name ?? "Project"}</h1>
          <p className="text-sm text-muted-foreground">Field Communications — RFIs &amp; Comments</p>
        </div>
      </div>

      {/* RFI section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              Requests for Information
            </h2>
            {openCount > 0 && (
              <Badge variant="destructive" className="text-xs">{openCount} open</Badge>
            )}
          </div>
        </div>

        {rfisLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : !rfis || rfis.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No RFIs yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                When the foreman submits a Request for Information from the field app, it will appear here for your response.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rfis.map((rfi) => (
              <RFICard key={rfi.id} rfi={rfi} onRespond={setRespondingTo} />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Comments section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">
            Field Comments
          </h2>
          <span className="text-sm text-muted-foreground">({comments?.length ?? 0})</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Notes, flags, and location-tagged observations submitted by the foreman from the job site.
        </p>

        {commentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !comments || comments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No field comments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4 divide-y">
              {comments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onDelete={() => handleDeleteComment(c.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {respondingTo && (
        <RespondModal
          rfi={respondingTo}
          onClose={() => setRespondingTo(null)}
          onSave={handleRespond}
        />
      )}
    </div>
  );
}

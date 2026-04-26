import { useState } from "react";
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Mail,
  Calendar,
  User,
  FolderKanban,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/utils";

interface License {
  id: number;
  token: string;
  projectId: number;
  projectName: string | null;
  granteeName: string;
  granteeEmail: string;
  createdBy: string;
  expiresAt: string;
  isActive: boolean;
  warningSentAt: string | null;
  inviteSentAt: string | null;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function LicenseStatusBadge({ license }: { license: License }) {
  const days = daysUntil(license.expiresAt);
  if (!license.isActive) return <Badge variant="destructive">Revoked</Badge>;
  if (days <= 0) return <Badge variant="destructive">Expired</Badge>;
  if (days <= 7) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Expiring Soon ({days}d)</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">Active ({days}d left)</Badge>;
}

export default function AdminLicenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<License | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);

  const [form, setForm] = useState({
    projectId: "",
    granteeName: "",
    granteeEmail: "",
    expiresAt: "",
    sendInviteEmail: true,
  });

  const { data: licenses = [], isLoading } = useQuery<License[]>({
    queryKey: ["admin-licenses"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/admin/licenses"));
      if (!r.ok) throw new Error("Failed to load licenses");
      return r.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/projects"));
      if (!r.ok) throw new Error("Failed to load projects");
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch(getApiUrl("/api/admin/licenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(data.projectId),
          granteeName: data.granteeName,
          granteeEmail: data.granteeEmail,
          expiresAt: new Date(data.expiresAt).toISOString(),
          sendInviteEmail: data.sendInviteEmail,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed to create license");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-licenses"] });
      setCreateOpen(false);
      setForm({ projectId: "", granteeName: "", granteeEmail: "", expiresAt: "", sendInviteEmail: true });
      toast({ title: "License created", description: "The GC/client has been granted access." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const r = await fetch(getApiUrl(`/api/admin/licenses/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to update license");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-licenses"] });
      setRevokeTarget(null);
      toast({ title: "License updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(getApiUrl(`/api/admin/licenses/${id}`), { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete license");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-licenses"] });
      setDeleteTarget(null);
      toast({ title: "License deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resendMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(getApiUrl(`/api/admin/licenses/${id}/resend-invite`), { method: "POST" });
      if (!r.ok) throw new Error("Failed to resend");
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-licenses"] });
      toast({
        title: data.sent ? "Invite sent" : "Email not sent",
        description: data.sent
          ? "Invite email delivered successfully."
          : "Configure RESEND_API_KEY to enable email delivery.",
        variant: data.sent ? "default" : "destructive",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const active = licenses.filter((l) => l.isActive && daysUntil(l.expiresAt) > 0);
  const expiring = licenses.filter((l) => l.isActive && daysUntil(l.expiresAt) > 0 && daysUntil(l.expiresAt) <= 7);
  const expired = licenses.filter((l) => !l.isActive || daysUntil(l.expiresAt) <= 0);

  const defaultExpiry = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Temporary Licenses</h1>
            <p className="text-muted-foreground text-sm">
              Grant GC and client access to specific projects for a set period.
            </p>
          </div>
        </div>
        <Button onClick={() => { setForm({ ...form, expiresAt: defaultExpiry() }); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New License
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-3xl font-bold">{licenses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
            <p className="text-3xl font-bold text-green-600">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Expiring Soon</p>
            <p className="text-3xl font-bold text-yellow-600">{expiring.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Expired / Revoked</p>
            <p className="text-3xl font-bold text-destructive">{expired.length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && licenses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Key className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No licenses yet. Create one to grant a GC or client temporary access.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create First License
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && licenses.length > 0 && (
        <div className="space-y-3">
          {licenses.map((license) => {
            const days = daysUntil(license.expiresAt);
            return (
              <Card key={license.id} className={!license.isActive || days <= 0 ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <LicenseStatusBadge license={license} />
                        <span className="font-semibold truncate">{license.granteeName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {license.granteeEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3.5 w-3.5" />
                          {license.projectName ?? `Project #${license.projectId}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Expires {formatDate(license.expiresAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                        {license.inviteSentAt ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Invite sent {formatDate(license.inviteSentAt)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            No invite sent
                          </span>
                        )}
                        {license.warningSentAt && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <AlertTriangle className="h-3 w-3" />
                            7-day warning sent {formatDate(license.warningSentAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={resendMutation.isPending}
                        onClick={() => resendMutation.mutate(license.id)}
                        title="Resend invite email"
                      >
                        <Mail className="h-3.5 w-3.5 mr-1" />
                        Resend
                      </Button>

                      {license.isActive && days > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => setRevokeTarget(license)}
                        >
                          <ShieldOff className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => updateMutation.mutate({ id: license.id, data: { isActive: true } })}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Re-activate
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(license)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Temporary License</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>GC / Client Name</Label>
              <Input
                placeholder="John Smith"
                value={form.granteeName}
                onChange={(e) => setForm({ ...form, granteeName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="john@contractor.com"
                value={form.granteeEmail}
                onChange={(e) => setForm({ ...form, granteeEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Access Expiration Date</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Typically set to the project completion date.</p>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
              <input
                type="checkbox"
                id="sendEmail"
                checked={form.sendInviteEmail}
                onChange={(e) => setForm({ ...form, sendInviteEmail: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="sendEmail" className="cursor-pointer font-normal">
                Send invitation email with access link
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={
                createMutation.isPending ||
                !form.projectId ||
                !form.granteeName ||
                !form.granteeEmail ||
                !form.expiresAt
              }
            >
              {createMutation.isPending ? "Creating..." : "Create License"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke License</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately block <strong>{revokeTarget?.granteeName}</strong>'s access to{" "}
              <strong>{revokeTarget?.projectName}</strong>. You can re-activate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && updateMutation.mutate({ id: revokeTarget.id, data: { isActive: false } })}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete License</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the license for <strong>{deleteTarget?.granteeName}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

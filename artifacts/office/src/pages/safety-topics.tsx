import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  ClipboardList,
  ChevronDown,
  Calendar,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/utils";

interface SafetyTopic {
  id: number;
  title: string;
  content: string;
  weekOf: string;
  createdBy: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Acknowledgment {
  id: number;
  safetyTopicId: number;
  foremanName: string;
  projectId: number | null;
  notes: string | null;
  discussedAt: string;
}

interface JhaCheckin {
  id: number;
  foremanName: string;
  projectId: number | null;
  checkDate: string;
  scaffoldingStable: boolean;
  ppeVerified: boolean;
  trenchSafe: boolean;
  hazardsReviewed: boolean;
  firstAidAccessible: boolean;
  emergencyContactsPosted: boolean;
  notes: string | null;
  completedAt: string;
}

const API = getApiUrl();

function useSafetyTopics() {
  return useQuery<SafetyTopic[]>({
    queryKey: ["safety-topics"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/safety-topics`);
      if (!res.ok) throw new Error("Failed to load topics");
      return res.json();
    },
  });
}

function useAcknowledgments(topicId: number | null) {
  return useQuery<Acknowledgment[]>({
    queryKey: ["safety-acks", topicId],
    enabled: topicId !== null,
    queryFn: async () => {
      const res = await fetch(`${API}/api/safety-topics/${topicId}/acknowledgments`);
      if (!res.ok) throw new Error("Failed to load acknowledgments");
      return res.json();
    },
  });
}

function useJhaCheckins() {
  return useQuery<JhaCheckin[]>({
    queryKey: ["jha-checkins"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/jha-checkins`);
      if (!res.ok) throw new Error("Failed to load JHA check-ins");
      return res.json();
    },
  });
}

function getWeekOfMonday(d: Date = new Date()): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export default function SafetyTopics() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: topics, isLoading } = useSafetyTopics();
  const { data: jhaCheckins } = useJhaCheckins();

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<SafetyTopic | null>(null);
  const [selectedTopicForAcks, setSelectedTopicForAcks] = useState<number | null>(null);
  const [acksOpen, setAcksOpen] = useState<Record<number, boolean>>({});
  const [jhaOpen, setJhaOpen] = useState(false);

  const [form, setForm] = useState({ title: "", content: "", weekOf: getWeekOfMonday(), isPublished: false });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`${API}/api/safety-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create topic");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-topics"] });
      setIsNewDialogOpen(false);
      setForm({ title: "", content: "", weekOf: getWeekOfMonday(), isPublished: false });
      toast({ title: "Safety topic created" });
    },
    onError: () => toast({ title: "Failed to create topic", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SafetyTopic> }) => {
      const res = await fetch(`${API}/api/safety-topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update topic");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-topics"] });
      setEditingTopic(null);
      toast({ title: "Topic updated" });
    },
    onError: () => toast({ title: "Failed to update topic", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/safety-topics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete topic");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-topics"] });
      toast({ title: "Topic deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const handlePublishToggle = (topic: SafetyTopic) => {
    updateMutation.mutate({ id: topic.id, data: { isPublished: !topic.isPublished } });
  };

  const handleDelete = (topic: SafetyTopic) => {
    if (!confirm(`Delete "${topic.title}"?`)) return;
    deleteMutation.mutate(topic.id);
  };

  const handleSaveNew = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    createMutation.mutate(form);
  };

  const handleSaveEdit = () => {
    if (!editingTopic) return;
    updateMutation.mutate({
      id: editingTopic.id,
      data: { title: editingTopic.title, content: editingTopic.content, weekOf: editingTopic.weekOf },
    });
  };

  const jhaPassRate = jhaCheckins && jhaCheckins.length > 0
    ? Math.round(
        (jhaCheckins.slice(0, 20).filter((j) =>
          j.scaffoldingStable && j.ppeVerified && j.trenchSafe && j.hazardsReviewed && j.firstAidAccessible && j.emergencyContactsPosted
        ).length / Math.min(jhaCheckins.length, 20)) * 100
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Safety Hub</h1>
            <p className="text-muted-foreground text-sm">Toolbox talks, JHA check-ins, and crew safety log</p>
          </div>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Topic
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Topics</p>
            <p className="text-2xl font-bold">{topics?.length ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="text-2xl font-bold text-green-700">{topics?.filter((t) => t.isPublished).length ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">JHA Check-ins</p>
            <p className="text-2xl font-bold">{jhaCheckins?.length ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">All-Green Rate (last 20)</p>
            <p className={`text-2xl font-bold ${jhaPassRate !== null && jhaPassRate >= 80 ? "text-green-700" : "text-amber-600"}`}>
              {jhaPassRate !== null ? `${jhaPassRate}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Safety Topics List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Weekly Toolbox Talks
          </CardTitle>
          <CardDescription>Write topics here — published ones push to the Foreman's mobile app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          {!isLoading && (!topics || topics.length === 0) && (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No safety topics yet. Create your first toolbox talk.</p>
            </div>
          )}
          {topics?.map((topic) => (
            <Collapsible
              key={topic.id}
              open={acksOpen[topic.id]}
              onOpenChange={(open) => setAcksOpen((p) => ({ ...p, [topic.id]: open }))}
            >
              <div className="border rounded-md overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{topic.title}</span>
                      {topic.isPublished
                        ? <Badge className="bg-green-100 text-green-800 text-xs">Published</Badge>
                        : <Badge variant="outline" className="text-xs">Draft</Badge>
                      }
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />Week of {topic.weekOf}
                      </span>
                      <span className="text-xs text-muted-foreground">by {topic.createdBy}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Crew Log
                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${acksOpen[topic.id] ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTopic({ ...topic })}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${topic.isPublished ? "text-green-600" : "text-muted-foreground"}`}
                      onClick={() => handlePublishToggle(topic)}
                      title={topic.isPublished ? "Unpublish" : "Publish"}
                    >
                      {topic.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(topic)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {topic.content && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{topic.content}</p>
                  </div>
                )}
                <CollapsibleContent>
                  <AcknowledgmentLog topicId={topic.id} />
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* JHA Checkins Log */}
      <Collapsible open={jhaOpen} onOpenChange={setJhaOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 rounded-t-lg transition-colors pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Daily JHA Check-ins
                  {jhaCheckins && jhaCheckins.length > 0 && (
                    <Badge variant="outline" className="text-xs">{jhaCheckins.length} records</Badge>
                  )}
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${jhaOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription className="text-left">Foreman daily Job Hazard Analysis submissions from the field app.</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {!jhaCheckins || jhaCheckins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No JHA submissions yet.</p>
              ) : (
                <div className="space-y-2">
                  {jhaCheckins.map((jha) => {
                    const allGreen = jha.scaffoldingStable && jha.ppeVerified && jha.trenchSafe && jha.hazardsReviewed && jha.firstAidAccessible && jha.emergencyContactsPosted;
                    const fields = [
                      { label: "Scaffolding", ok: jha.scaffoldingStable },
                      { label: "PPE", ok: jha.ppeVerified },
                      { label: "Trench", ok: jha.trenchSafe },
                      { label: "Hazards", ok: jha.hazardsReviewed },
                      { label: "First Aid", ok: jha.firstAidAccessible },
                      { label: "Emergency Contacts", ok: jha.emergencyContactsPosted },
                    ];
                    return (
                      <div key={jha.id} className={`border rounded-md p-3 ${allGreen ? "border-green-200 bg-green-50/40" : "border-amber-200 bg-amber-50/40"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {allGreen
                              ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                              : <AlertCircle className="h-4 w-4 text-amber-600" />
                            }
                            <span className="text-sm font-medium">{jha.foremanName}</span>
                            <span className="text-xs text-muted-foreground">{jha.checkDate}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(jha.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fields.map((f) => (
                            <span key={f.label} className={`text-xs px-1.5 py-0.5 rounded ${f.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {f.ok ? "✓" : "✗"} {f.label}
                            </span>
                          ))}
                        </div>
                        {jha.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{jha.notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create Topic Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              New Toolbox Talk
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g., Scaffolding Safety Refresher" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Week Of</Label>
              <Input type="date" value={form.weekOf} onChange={(e) => setForm((f) => ({ ...f, weekOf: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                placeholder="Write the toolbox talk content here. This will be visible to foremen in the field app..."
                rows={6}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="publish-now"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="publish-now">Publish immediately (push to field app)</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveNew} disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}>
                <Send className="h-4 w-4 mr-1" />
                {form.isPublished ? "Publish Topic" : "Save as Draft"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Toolbox Talk</DialogTitle>
          </DialogHeader>
          {editingTopic && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editingTopic.title} onChange={(e) => setEditingTopic((t) => t && ({ ...t, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Week Of</Label>
                <Input type="date" value={editingTopic.weekOf} onChange={(e) => setEditingTopic((t) => t && ({ ...t, weekOf: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  rows={6}
                  value={editingTopic.content}
                  onChange={(e) => setEditingTopic((t) => t && ({ ...t, content: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingTopic(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AcknowledgmentLog({ topicId }: { topicId: number }) {
  const { data: acks, isLoading } = useAcknowledgments(topicId);
  return (
    <div className="border-t bg-muted/20 px-3 py-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Crew Discussion Log</p>
      {isLoading && <Skeleton className="h-8 w-full" />}
      {!isLoading && (!acks || acks.length === 0) && (
        <p className="text-xs text-muted-foreground italic">No crew acknowledgments yet.</p>
      )}
      {acks?.map((ack) => (
        <div key={ack.id} className="flex items-start gap-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">{ack.foremanName}</span>
            <span className="text-muted-foreground"> — Discussed with Crew on </span>
            <span className="text-muted-foreground">{new Date(ack.discussedAt).toLocaleString()}</span>
            {ack.notes && <p className="italic text-muted-foreground mt-0.5">"{ack.notes}"</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

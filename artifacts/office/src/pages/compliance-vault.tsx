import { useState, useRef } from "react";
import {
  Shield,
  Upload,
  FileText,
  Heart,
  CheckCircle,
  Folder,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Plus,
  RefreshCw,
  File,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/utils";

const CATEGORIES = [
  { id: "coi", label: "Certificate of Insurance (COI)", icon: Shield, color: "bg-blue-100 text-blue-800" },
  { id: "workers_comp", label: "Worker's Compensation", icon: Heart, color: "bg-red-100 text-red-800" },
  { id: "wa_license", label: "Washington Business License", icon: FileText, color: "bg-green-100 text-green-800" },
  { id: "or_license", label: "Oregon Business License", icon: FileText, color: "bg-orange-100 text-orange-800" },
  { id: "right_to_work", label: "Right to Work Authorization", icon: CheckCircle, color: "bg-purple-100 text-purple-800" },
  { id: "other", label: "Other Documents", icon: Folder, color: "bg-gray-100 text-gray-700" },
];

interface ComplianceDoc {
  id: number;
  category: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  originalName: string | null;
  uploadedBy: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  category: "",
  title: "",
  description: "",
  expiresAt: "",
};

function daysUntilExpiry(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ComplianceVault() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: docs = [], isLoading } = useQuery<ComplianceDoc[]>({
    queryKey: ["compliance-docs"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/compliance-docs"));
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(getApiUrl(`/api/compliance-docs/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-docs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/compliance-docs/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-docs"] }),
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !form.category || !form.title) {
      setUploadError("Please select a file, category, and title.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("category", form.category);
      fd.append("title", form.title);
      if (form.description) fd.append("description", form.description);
      if (form.expiresAt) fd.append("expiresAt", form.expiresAt);
      const res = await fetch(getApiUrl("/api/compliance-docs"), { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      qc.invalidateQueries({ queryKey: ["compliance-docs"] });
      setForm({ ...emptyForm });
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterCategory === "all" ? docs : docs.filter((d) => d.category === filterCategory);

  const grouped = CATEGORIES.reduce<Record<string, ComplianceDoc[]>>((acc, cat) => {
    const items = filtered.filter((d) => d.category === cat.id);
    if (items.length) acc[cat.id] = items;
    return acc;
  }, {});

  const stats = {
    total: docs.length,
    active: docs.filter((d) => d.isActive).length,
    expiringSoon: docs.filter((d) => {
      if (!d.expiresAt) return false;
      const days = daysUntilExpiry(d.expiresAt);
      return days >= 0 && days <= 30;
    }).length,
    expired: docs.filter((d) => d.expiresAt && daysUntilExpiry(d.expiresAt) < 0).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Compliance Vault</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage legal documents — instantly accessible to foremen on-site
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Docs</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Expiring (30d)</p>
          <p className="text-3xl font-bold text-amber-500">{stats.expiringSoon}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Expired</p>
          <p className="text-3xl font-bold text-red-500">{stats.expired}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Document
          </CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Display Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. General Liability COI 2025"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Policy number, insurer, coverage details…"
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>File (PDF, JPG, PNG)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center gap-2 justify-center text-sm">
                      <File className="h-4 w-4 text-primary" />
                      <span className="truncate max-w-[160px]">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
                      Click to select file
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={uploading || !selectedFile || !form.category || !form.title}
              >
                {uploading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload Document</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading documents…</div>
          )}

          {!isLoading && Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-25" />
              <p className="text-sm">No documents uploaded yet. Use the form to add your first certificate.</p>
            </div>
          )}

          {Object.entries(grouped).map(([catId, catDocs]) => {
            const catMeta = CATEGORIES.find((c) => c.id === catId);
            const Icon = catMeta?.icon ?? File;
            return (
              <div key={catId} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{catMeta?.label ?? catId}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catMeta?.color ?? "bg-gray-100"}`}>
                    {catDocs.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {catDocs.map((doc) => {
                    const expDays = doc.expiresAt ? daysUntilExpiry(doc.expiresAt) : null;
                    const isExpired = expDays !== null && expDays < 0;
                    const isWarn = expDays !== null && expDays >= 0 && expDays <= 30;
                    return (
                      <Card key={doc.id} className={`${!doc.isActive ? "opacity-60" : ""}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{doc.title}</span>
                                {doc.isActive ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">Inactive</Badge>
                                )}
                                {isExpired && (
                                  <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0">
                                    <AlertTriangle className="h-3 w-3 mr-1" />Expired
                                  </Badge>
                                )}
                                {isWarn && (
                                  <Badge className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0">
                                    <Calendar className="h-3 w-3 mr-1" />{expDays}d left
                                  </Badge>
                                )}
                              </div>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {doc.originalName} · Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => window.open(getApiUrl(doc.fileUrl), "_blank")}
                                title="Open document"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => toggleActive.mutate({ id: doc.id, isActive: !doc.isActive })}
                                title={doc.isActive ? "Deactivate" : "Activate"}
                              >
                                {doc.isActive ? (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-green-600" />
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete document?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      "{doc.title}" will be permanently removed from the vault.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90"
                                      onClick={() => deleteMutation.mutate(doc.id)}
                                    >Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

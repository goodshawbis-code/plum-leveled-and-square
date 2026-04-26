import { useState } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Tag,
  Globe,
  Lock,
  Save,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiUrl } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const CATEGORIES = ["Estimating", "Safety", "Admin", "Client Access", "General"] as const;
const ROLES = ["all", "gc", "foreman"] as const;
const ROLE_LABELS: Record<string, string> = { all: "All Users", gc: "GC / Office", foreman: "Foreman (Field)" };
const CATEGORY_COLORS: Record<string, string> = {
  Estimating: "bg-blue-100 text-blue-800",
  Safety: "bg-red-100 text-red-800",
  Admin: "bg-purple-100 text-purple-800",
  "Client Access": "bg-green-100 text-green-800",
  General: "bg-gray-100 text-gray-700",
};

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  roleAccess: string;
  slug: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  title: "",
  content: "## Overview\n\nDescribe this feature here.\n\n## Steps\n\n1. Step one\n2. Step two\n\n## Tips\n\n- Helpful tip",
  category: "General" as string,
  roleAccess: "all" as string,
  slug: "",
  isPublished: false,
};

export default function HelpAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [previewTab, setPreviewTab] = useState<"write" | "preview">("write");

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/help-articles"));
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await fetch(getApiUrl("/api/help-articles"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, slug: body.slug || null }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help-articles"] });
      setCreating(false);
      setForm({ ...emptyForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Partial<typeof emptyForm> }) => {
      const res = await fetch(getApiUrl(`/api/help-articles/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, slug: body.slug || null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help-articles"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/help-articles/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["help-articles"] }),
  });

  const togglePublish = (article: Article) => {
    updateMutation.mutate({ id: article.id, body: { isPublished: !article.isPublished } });
  };

  const startEdit = (article: Article) => {
    setEditing(article);
    setCreating(false);
    setForm({
      title: article.title,
      content: article.content,
      category: article.category,
      roleAccess: article.roleAccess,
      slug: article.slug ?? "",
      isPublished: article.isPublished,
    });
    setPreviewTab("write");
  };

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ ...emptyForm });
    setPreviewTab("write");
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = articles.filter((a) => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || a.category === filterCat;
    return matchSearch && matchCat;
  });

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.isPublished).length,
    drafts: articles.filter((a) => !a.isPublished).length,
  };

  const isFormOpen = creating || !!editing;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Help Center — Admin</h1>
            <p className="text-sm text-muted-foreground">
              Write and manage in-app help articles and contextual tooltips
            </p>
          </div>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Article
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Articles</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="text-3xl font-bold text-green-600">{stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Drafts</p>
            <p className="text-3xl font-bold text-amber-500">{stats.drafts}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`${isFormOpen ? "lg:col-span-2" : "lg:col-span-5"} space-y-3`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search articles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading articles…</div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No articles yet. Create your first help article above.</p>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((article) => (
              <Card
                key={article.id}
                className={`cursor-pointer transition-all ${
                  editing?.id === article.id ? "ring-2 ring-primary" : "hover:shadow-sm"
                }`}
                onClick={() => startEdit(article)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{article.title}</span>
                        {article.isPublished ? (
                          <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0">Live</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">Draft</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.General}`}>
                          {article.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_LABELS[article.roleAccess] ?? article.roleAccess}
                        </span>
                        {article.slug && (
                          <span className="text-xs text-muted-foreground font-mono">#{article.slug}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => togglePublish(article)}
                        title={article.isPublished ? "Unpublish" : "Publish"}
                      >
                        {article.isPublished ? (
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
                            <AlertDialogTitle>Delete article?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{article.title}" will be permanently deleted. Any tooltips using its slug will show "not found".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(article.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {isFormOpen && (
          <div className="lg:col-span-3">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {creating ? "New Article" : `Editing: ${editing?.title}`}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setCreating(false); setEditing(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. How the WA/OR Compliance Checklist Works"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Who can see this?</Label>
                    <Select
                      value={form.roleAccess}
                      onValueChange={(v) => setForm((f) => ({ ...f, roleAccess: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    Slug <span className="text-xs text-muted-foreground font-normal">(optional — used by [?] tooltips)</span>
                  </Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="e.g. wa-or-compliance-checklist"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "write" | "preview")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="write" className="text-xs h-7">Write</TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs h-7">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="write" className="mt-2">
                      <Textarea
                        value={form.content}
                        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                        className="min-h-[240px] font-mono text-sm resize-y"
                        placeholder="Write your article in Markdown…"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports **bold**, _italic_, ## headings, - bullet lists, and `code`.
                      </p>
                    </TabsContent>
                    <TabsContent value="preview" className="mt-2">
                      <div className="min-h-[240px] border rounded-md p-3 bg-muted/30 overflow-y-auto">
                        <div className="prose prose-sm max-w-none prose-headings:text-foreground">
                          <ReactMarkdown>{form.content}</ReactMarkdown>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Publish immediately</span>
                  </label>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    onClick={() => { setCreating(false); setEditing(null); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!form.title || !form.content || createMutation.isPending || updateMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {creating ? "Create Article" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

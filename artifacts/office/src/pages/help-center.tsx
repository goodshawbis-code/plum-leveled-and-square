import { useState } from "react";
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const CATEGORY_COLORS: Record<string, string> = {
  Estimating: "bg-blue-100 text-blue-800",
  Safety: "bg-red-100 text-red-800",
  Admin: "bg-purple-100 text-purple-800",
  "Client Access": "bg-green-100 text-green-800",
  General: "bg-gray-100 text-gray-700",
};

const CATEGORY_ORDER = ["Estimating", "Safety", "Admin", "Client Access", "General"];

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  roleAccess: string;
  slug: string | null;
  isPublished: boolean;
}

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="transition-all hover:shadow-md">
      <button
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1">
              <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm leading-tight">{article.title}</p>
                {article.slug && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">#{article.slug}</p>
                )}
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
          </div>
        </CardHeader>
      </button>
      {expanded && (
        <CardContent className="px-5 pb-5">
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-a:text-primary border-t pt-3">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function HelpCenter() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["help-articles-published"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/help-articles?published=true"));
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filtered = articles.filter((a) => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || a.category === activeCategory;
    return matchSearch && matchCat;
  });

  const categorized = CATEGORY_ORDER.reduce<Record<string, Article[]>>((acc, cat) => {
    const items = filtered.filter((a) => a.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const otherCats = filtered
    .map((a) => a.category)
    .filter((c) => !CATEGORY_ORDER.includes(c));
  const uniqueOther = [...new Set(otherCats)];
  uniqueOther.forEach((cat) => {
    const items = filtered.filter((a) => a.category === cat);
    if (items.length) categorized[cat] = items;
  });

  const allCategories = [...new Set(articles.map((a) => a.category))];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2 py-4">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Everything you need to get the most out of Plumb Level &amp; Squared. Search by keyword or browse by category.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          className="pl-11 h-12 text-base rounded-xl"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading help articles…
        </div>
      )}

      {!isLoading && Object.keys(categorized).length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-25" />
          {search ? (
            <p>No articles match "<strong>{search}</strong>". Try a different search.</p>
          ) : (
            <p>
              No help articles published yet.{" "}
              <a href="/help-admin" className="text-primary underline">
                Add articles in the admin panel.
              </a>
            </p>
          )}
        </div>
      )}

      {Object.entries(categorized).map(([category, catArticles]) => (
        <section key={category} className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-base">{category}</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.General}`}
            >
              {catArticles.length} article{catArticles.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {catArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

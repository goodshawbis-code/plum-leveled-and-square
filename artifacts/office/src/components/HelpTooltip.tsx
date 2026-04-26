import { useState } from "react";
import { HelpCircle, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiUrl } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface HelpArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  roleAccess: string;
}

interface HelpTooltipProps {
  articleSlug: string;
  label?: string;
  className?: string;
}

export function HelpTooltip({ articleSlug, label, className = "" }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (article || notFound) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/help-articles/slug/${articleSlug}`));
      if (res.ok) {
        setArticle(await res.json());
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors ${className}`}
        aria-label={`Help: ${label ?? articleSlug}`}
      >
        <HelpCircle className="h-4 w-4" />
        {label && <span className="text-xs underline decoration-dotted">{label}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  {loading ? "Loading…" : notFound ? "Help" : article?.title ?? "Help"}
                </span>
              </div>
              {!loading && !notFound && article && (
                <Badge variant="outline" className="text-xs">
                  {article.category}
                </Badge>
              )}
              <button
                onClick={() => setOpen(false)}
                className="ml-2 p-1 rounded hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 text-sm">
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading article…
                </div>
              )}
              {notFound && (
                <p className="text-muted-foreground py-4">
                  No help article found for <code className="bg-muted px-1 rounded">{articleSlug}</code>.
                  Ask your admin to create one in the Help Center.
                </p>
              )}
              {article && !loading && (
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-a:text-primary">
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

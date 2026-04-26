import { useState, useRef, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import type { Blueprint } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getApiUrl } from "@/lib/utils";
import {
  Scan,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Layers,
  FileSearch,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface MaterialResult {
  type: string;
  label: string;
  description: string;
  estimatedQuantity: number;
  unit: string;
  unitCostLow: number;
  unitCostHigh: number;
  totalCostLow: number;
  totalCostHigh: number;
  confidence: "high" | "medium" | "low";
}

interface AnalysisResult {
  pageType: string;
  hasMasonryWork: boolean;
  masonryConfidence: string;
  drawingScale: string;
  borderDetected: boolean;
  actualDrawingArea: string;
  materials: MaterialResult[];
  summary: string;
  estimatorNotes: string[];
  grandTotalLow: number;
  grandTotalHigh: number;
  raw?: string;
  parseError?: boolean;
}

interface ScanResponse {
  blueprintId: number;
  blueprintName: string;
  pageNumber: number;
  analysis: AnalysisResult;
}

function buildStorageUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith("http")) return rawUrl;
  if (rawUrl.startsWith("/storage/")) return `/api${rawUrl}`;
  return rawUrl;
}

const MATERIAL_COLORS: Record<string, string> = {
  culture_stone: "bg-amber-100 border-amber-400 text-amber-900",
  cmu_standard: "bg-slate-100 border-slate-400 text-slate-900",
  cmu_splitface: "bg-blue-100 border-blue-400 text-blue-900",
  brick_standard: "bg-red-100 border-red-400 text-red-900",
  brick_splitface: "bg-rose-100 border-rose-400 text-rose-900",
  concrete_footing: "bg-gray-100 border-gray-400 text-gray-900",
  grout_fill: "bg-zinc-100 border-zinc-400 text-zinc-900",
  rebar: "bg-orange-100 border-orange-400 text-orange-900",
  mortar: "bg-stone-100 border-stone-400 text-stone-900",
  other: "bg-purple-100 border-purple-400 text-purple-900",
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function BlueprintAIScanner({ blueprint }: { blueprint: Blueprint }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const isPdf = blueprint.fileName.toLowerCase().endsWith(".pdf") ||
    blueprint.fileUrl.toLowerCase().endsWith(".pdf");

  const loadPdfDoc = useCallback(async () => {
    if (!isPdf || pdfDocRef.current) return pdfDocRef.current;
    const url = buildStorageUrl(blueprint.fileUrl);
    const loadingTask = pdfjs.getDocument(url);
    const doc = await loadingTask.promise;
    pdfDocRef.current = doc;
    setTotalPages(doc.numPages);
    setPdfLoaded(true);
    return doc;
  }, [blueprint.fileUrl, isPdf]);

  const renderPageToBase64 = async (pageNum: number): Promise<string> => {
    if (!isPdf) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = buildStorageUrl(blueprint.fileUrl);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      const c = canvasRef.current!;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    }

    const doc = await loadPdfDoc();
    if (!doc) throw new Error("Could not load PDF");
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const c = canvasRef.current!;
    c.width = viewport.width;
    c.height = viewport.height;
    const ctx = c.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return c.toDataURL("image/png").split(",")[1];
  };

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      if (!pdfLoaded && isPdf) {
        await loadPdfDoc();
      }

      const base64 = await renderPageToBase64(currentPage);

      const res = await fetch(
        `${getApiUrl()}/api/blueprints/${blueprint.id}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageImageBase64: base64,
            mimeType: "image/png",
            pageNumber: currentPage,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? `Server error ${res.status}`);
      }

      const data: ScanResponse = await res.json();
      setScanResult(data);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleLoadPages = async () => {
    if (!isPdf) return;
    try {
      await loadPdfDoc();
    } catch {
      setError("Failed to load PDF for page scanning");
    }
  };

  const analysis = scanResult?.analysis;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scan className="h-4 w-4 text-primary" />
          AI Blueprint Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {isPdf && (
            <div className="flex items-center gap-2">
              {!pdfLoaded ? (
                <Button variant="outline" size="sm" onClick={handleLoadPages}>
                  <FileSearch className="h-4 w-4 mr-1" />
                  Load PDF Pages
                </Button>
              ) : (
                <div className="flex items-center gap-1 border rounded-md px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[70px] text-center">
                    Page {currentPage}{totalPages ? ` / ${totalPages}` : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage(p => Math.min(totalPages ?? p + 1, p + 1))}
                    disabled={!!totalPages && currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleScan}
            disabled={isScanning || (isPdf && !pdfLoaded)}
            className="ml-auto"
            size="sm"
          >
            {isScanning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning…</>
            ) : (
              <><Scan className="h-4 w-4 mr-2" />Scan for Masonry</>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {analysis && !analysis.parseError && (
          <div className="space-y-4">
            {/* Summary banner */}
            <div className={`flex items-start gap-3 p-3 rounded-md border ${
              analysis.hasMasonryWork
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}>
              {analysis.hasMasonryWork ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <Layers className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-medium text-sm">{analysis.summary || "Analysis complete"}</span>
                  <Badge variant="outline" className="text-xs capitalize">{analysis.pageType?.replace(/_/g, " ")}</Badge>
                  {analysis.masonryConfidence && (
                    <Badge className={`text-xs ${CONFIDENCE_BADGE[analysis.masonryConfidence] ?? "bg-gray-100 text-gray-700"}`}>
                      {analysis.masonryConfidence} confidence
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {analysis.drawingScale && analysis.drawingScale !== "unknown" && (
                    <span>Scale: {analysis.drawingScale}</span>
                  )}
                  {analysis.actualDrawingArea && (
                    <span>Drawing area: {analysis.actualDrawingArea}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Materials */}
            {analysis.materials && analysis.materials.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  Detected Materials
                </p>
                <div className="grid gap-2">
                  {analysis.materials.map((mat, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-md p-3 ${MATERIAL_COLORS[mat.type] ?? MATERIAL_COLORS.other}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{mat.label}</span>
                            <Badge className={`text-xs ${CONFIDENCE_BADGE[mat.confidence] ?? "bg-gray-100 text-gray-700"}`}>
                              {mat.confidence}
                            </Badge>
                          </div>
                          <p className="text-xs opacity-75">{mat.description}</p>
                        </div>
                        {mat.estimatedQuantity > 0 && (
                          <div className="text-right shrink-0 space-y-0.5">
                            <p className="text-sm font-bold">
                              {mat.estimatedQuantity.toLocaleString()} {mat.unit}
                            </p>
                            {mat.totalCostLow > 0 && (
                              <p className="text-xs font-medium">
                                {fmt(mat.totalCostLow)} – {fmt(mat.totalCostHigh)}
                              </p>
                            )}
                            {mat.unitCostLow > 0 && (
                              <p className="text-xs opacity-60">
                                @ {fmt(mat.unitCostLow)}–{fmt(mat.unitCostHigh)}/{mat.unit}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grand Total */}
            {(analysis.grandTotalLow > 0 || analysis.grandTotalHigh > 0) && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md border border-primary/20">
                  <span className="font-bold flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Estimated Masonry Cost
                  </span>
                  <span className="font-bold text-primary text-lg">
                    {fmt(analysis.grandTotalLow)} – {fmt(analysis.grandTotalHigh)}
                  </span>
                </div>
              </>
            )}

            {/* Notes */}
            {analysis.estimatorNotes && analysis.estimatorNotes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estimator Notes</p>
                <ul className="space-y-1">
                  {analysis.estimatorNotes.map((note, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!analysis.hasMasonryWork && (
              <p className="text-sm text-muted-foreground italic text-center py-2">
                No masonry work detected on this page. Try another page.
              </p>
            )}
          </div>
        )}

        {analysis?.parseError && (
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <p className="font-medium mb-1">Raw AI response (could not parse as JSON):</p>
            <pre className="whitespace-pre-wrap text-xs">{analysis.raw}</pre>
          </div>
        )}

        {!scanResult && !isScanning && !error && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Scan for Masonry" to have AI analyze this blueprint page for masonry materials, quantities, and estimated costs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

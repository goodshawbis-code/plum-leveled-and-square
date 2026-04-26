import { useState, useRef } from "react";
import { getApiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Layers,
  Calculator,
  FileSearch,
} from "lucide-react";

interface LineItem {
  material: string;
  label: string;
  label_es: string;
  rawQty: number;
  wasteFactor: number;
  qty: number;
  unit: string;
  unitCostLow: number;
  unitCostHigh: number;
  costLow: number;
  costHigh: number;
  locations: string[];
  cmu?: { blocks: number; groutCubicYards: number; mortarBags: number };
  brick?: { bricks: number; mortarBags: number };
  slab?: { thicknessInches: number; areaSF: number; volumeCY: number };
}

interface CalcResult {
  lineItems: LineItem[];
  scale: string | null;
  notes: string[];
  subtotalLow: number;
  subtotalHigh: number;
  markupPct: number;
  markupLow: number;
  markupHigh: number;
  contingencyPct: number;
  contingencyLow: number;
  contingencyHigh: number;
  totalLow: number;
  totalHigh: number;
  safetyTopic: {
    en: string;
    es: string;
    body_en: string;
    body_es: string;
  };
  pagesAnalyzed: number;
  quadrantsAnalyzed: number;
}

interface AnalysisResult {
  success: boolean;
  projectName: string;
  calculation: CalcResult;
  bidPdfBase64: string | null;
  filename: string;
  quadrantResults: Array<{ page: number; quadrant: string; hasMasonryWork: boolean; error?: string }>;
}

const STEPS = [
  { id: 1, icon: FileSearch, label: "Processing PDF", sub: "Splitting into quadrants with OpenCV" },
  { id: 2, icon: Layers, label: "AI Vision Analysis", sub: "GPT-4o scanning each quadrant" },
  { id: 3, icon: Calculator, label: "Calculation Engine", sub: "Applying masonry math & waste factors" },
  { id: 4, icon: FileText, label: "Generating Bid PDF", sub: "Building branded bilingual report" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function BlueprintBid() {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [ownerGc, setOwnerGc] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [markupPct, setMarkupPct] = useState("15");
  const [contingencyPct, setContingencyPct] = useState("5");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuadrants, setShowQuadrants] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = file && projectName.trim() && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setCurrentStep(1);

    const stepTimer = (step: number, delay: number) =>
      setTimeout(() => setCurrentStep(step), delay);

    const t2 = stepTimer(2, 1200);
    const t3 = stepTimer(3, 4000);
    const t4 = stepTimer(4, 8000);

    try {
      const form = new FormData();
      form.append("file", file!);
      form.append("project_name", projectName);
      form.append("owner_gc", ownerGc);
      form.append("address", address);
      form.append("contact", contact);
      form.append("markup_pct", markupPct);
      form.append("contingency_pct", contingencyPct);

      const resp = await fetch(getApiUrl("/api/blueprint-pipeline/process"), {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Server error ${resp.status}`);
      }

      const data: AnalysisResult = await resp.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Pipeline failed. Please try again.");
    } finally {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setLoading(false);
      setCurrentStep(0);
    }
  }

  function downloadPdf() {
    if (!result?.bidPdfBase64) return;
    const bytes = atob(result.bidPdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const calc = result?.calculation;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <FileText className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Blueprint AI Bid Generator</h1>
          <p className="text-sm text-stone-500">
            Upload a blueprint PDF — AI splits it into quadrants, finds masonry walls &amp; slabs, and generates a branded bilingual bid
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const done = !loading && result && s.id <= 4;
          const active = loading && currentStep === s.id;
          return (
            <div
              key={s.id}
              className={`rounded-lg border p-3 text-sm transition-all ${
                active
                  ? "border-orange-400 bg-orange-50"
                  : done
                  ? "border-green-200 bg-green-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {active ? (
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                ) : done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Icon className="w-4 h-4 text-stone-400" />
                )}
                <span className={`font-medium text-xs ${active ? "text-orange-700" : done ? "text-green-700" : "text-stone-600"}`}>
                  {s.label}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-tight">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload Blueprint</CardTitle>
            <CardDescription>PDF only — multi-page supported (max 50 MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                  file ? "border-orange-300 bg-orange-50" : "border-stone-200 hover:border-orange-300"
                }`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? "text-orange-500" : "text-stone-400"}`} />
                {file ? (
                  <p className="text-sm font-medium text-orange-700">{file.name}</p>
                ) : (
                  <p className="text-sm text-stone-500">Click to select PDF</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Project Name *</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Ridgeline Townhomes Phase 2"
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Owner / GC</Label>
                    <Input value={ownerGc} onChange={(e) => setOwnerGc(e.target.value)} placeholder="McCarthy Building Co." className="mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Contact</Label>
                    <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="John Smith" className="mt-1 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Job Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Portland OR" className="mt-1 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Markup %</Label>
                    <Input
                      type="number"
                      value={markupPct}
                      onChange={(e) => setMarkupPct(e.target.value)}
                      min="0" max="100" step="1"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Contingency %</Label>
                    <Input
                      type="number"
                      value={contingencyPct}
                      onChange={(e) => setContingencyPct(e.target.value)}
                      min="0" max="100" step="1"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" /> Analyze &amp; Generate Bid</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileSearch className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p className="text-stone-400 text-sm">Results will appear here after analysis</p>
                <p className="text-stone-300 text-xs mt-1">
                  The pipeline scans each quadrant for scale bars, masonry hatch patterns, linear footage, and slab thickness
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-4 text-orange-500 animate-spin" />
                <p className="font-medium text-stone-700">
                  {STEPS.find((s) => s.id === currentStep)?.label ?? "Processing…"}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  {STEPS.find((s) => s.id === currentStep)?.sub}
                </p>
              </CardContent>
            </Card>
          )}

          {result && calc && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-stone-800">Analysis Complete</span>
                  <Badge variant="outline" className="text-xs">
                    {calc.pagesAnalyzed} page{calc.pagesAnalyzed !== 1 ? "s" : ""} · {calc.quadrantsAnalyzed} quadrants
                  </Badge>
                  {calc.scale && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                      Scale: {calc.scale}
                    </Badge>
                  )}
                </div>
                {result.bidPdfBase64 && (
                  <Button onClick={downloadPdf} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Download className="w-4 h-4 mr-1" /> Download Bid PDF
                  </Button>
                )}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-stone-700">Material Takeoff / Cálculo de Materiales</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {calc.lineItems.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-stone-400">
                      No masonry materials detected. Try a higher-resolution blueprint or re-upload with clearer drawing details.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-800 text-white text-xs">
                            <th className="text-left px-4 py-2">Material</th>
                            <th className="text-right px-3 py-2">Qty</th>
                            <th className="text-center px-3 py-2">Unit</th>
                            <th className="text-center px-3 py-2">Waste</th>
                            <th className="text-right px-3 py-2">Cost Low</th>
                            <th className="text-right px-3 py-2">Cost High</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calc.lineItems.map((item, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                              <td className="px-4 py-2">
                                <div className="font-medium text-stone-800">{item.label}</div>
                                <div className="text-xs text-stone-400">{item.label_es}</div>
                                {item.cmu && (
                                  <div className="text-xs text-stone-400 mt-0.5">
                                    {item.cmu.blocks.toLocaleString()} blocks · {item.cmu.groutCubicYards} CY grout · {item.cmu.mortarBags} bags mortar
                                  </div>
                                )}
                                {item.brick && (
                                  <div className="text-xs text-stone-400 mt-0.5">
                                    {item.brick.bricks.toLocaleString()} bricks · {item.brick.mortarBags} bags mortar
                                  </div>
                                )}
                                {item.slab && (
                                  <div className="text-xs text-stone-400 mt-0.5">
                                    {item.slab.thicknessInches}" thick · {item.slab.volumeCY} CY concrete
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{item.qty.toLocaleString()}</td>
                              <td className="px-3 py-2 text-center text-stone-500">{item.unit}</td>
                              <td className="px-3 py-2 text-center text-stone-500">{(item.wasteFactor * 100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmt(item.costLow)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-orange-700">{fmt(item.costHigh)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-stone-200 bg-stone-50 text-xs text-stone-500">
                            <td colSpan={4} className="px-4 py-1">Subtotal</td>
                            <td className="px-3 py-1 text-right text-green-700">{fmt(calc.subtotalLow)}</td>
                            <td className="px-3 py-1 text-right text-orange-700">{fmt(calc.subtotalHigh)}</td>
                          </tr>
                          <tr className="bg-stone-50 text-xs text-stone-500">
                            <td colSpan={4} className="px-4 py-1">Markup ({calc.markupPct.toFixed(0)}%)</td>
                            <td className="px-3 py-1 text-right">{fmt(calc.markupLow)}</td>
                            <td className="px-3 py-1 text-right">{fmt(calc.markupHigh)}</td>
                          </tr>
                          <tr className="bg-stone-50 text-xs text-stone-500">
                            <td colSpan={4} className="px-4 py-1">Contingency ({calc.contingencyPct.toFixed(0)}%)</td>
                            <td className="px-3 py-1 text-right">{fmt(calc.contingencyLow)}</td>
                            <td className="px-3 py-1 text-right">{fmt(calc.contingencyHigh)}</td>
                          </tr>
                          <tr className="bg-orange-600 text-white font-bold text-sm">
                            <td colSpan={4} className="px-4 py-2">Total Bid Range / Rango Total</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(calc.totalLow)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(calc.totalHigh)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <CardTitle className="text-sm font-semibold text-red-700">
                      ⚠ Safety Topic of the Week / Tema de Seguridad
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-stone-800 mb-1">{calc.safetyTopic.en}</p>
                    <p className="text-stone-600 leading-relaxed">{calc.safetyTopic.body_en}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800 mb-1">{calc.safetyTopic.es}</p>
                    <p className="text-stone-600 leading-relaxed">{calc.safetyTopic.body_es}</p>
                  </div>
                </CardContent>
              </Card>

              {calc.notes && calc.notes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Estimator Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {calc.notes.map((n, i) => (
                      <p key={i} className="text-sm text-stone-600">• {n}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <button
                onClick={() => setShowQuadrants(!showQuadrants)}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600"
              >
                {showQuadrants ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showQuadrants ? "Hide" : "Show"} raw quadrant data ({result.quadrantResults.length} quadrants)
              </button>

              {showQuadrants && (
                <Card>
                  <CardContent className="pt-4 overflow-auto max-h-60">
                    <pre className="text-xs text-stone-500 whitespace-pre-wrap">
                      {JSON.stringify(
                        result.quadrantResults.map((q) => ({
                          p: q.page,
                          q: q.quadrant,
                          masonry: q.hasMasonryWork,
                          ...(q.error ? { error: q.error } : {}),
                        })),
                        null,
                        2,
                      )}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

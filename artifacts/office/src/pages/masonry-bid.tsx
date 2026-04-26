import { useState, useMemo } from "react";
import {
  Hammer,
  Info,
  RefreshCw,
  FileText,
  ChevronDown,
  Building2,
  Home,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  type ProjectType,
  type MaterialType,
  type MasonryBid,
  PROJECT_TYPES,
  PORTLAND_PRICING,
  PROJECT_TYPE_DEFAULT_MATERIALS,
  calculateMasonryBid,
} from "@/lib/masonry-pricing";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function moneyRange(low: number, high: number) {
  return `${money(low)} – ${money(high)}`;
}

const PROJECT_ICONS: Record<ProjectType, React.ReactNode> = {
  residential: <Home className="h-5 w-5" />,
  commercial: <Building2 className="h-5 w-5" />,
  outdoor: <Flame className="h-5 w-5" />,
};

const ALL_MATERIALS = Object.entries(PORTLAND_PRICING).map(([id, rate]) => ({
  id: id as MaterialType,
  ...rate,
}));

export default function MasonryBid() {
  const [projectType, setProjectType] = useState<ProjectType>("residential");
  const [quantities, setQuantities] = useState<Partial<Record<MaterialType, string>>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [bid, setBid] = useState<MasonryBid | null>(null);

  const typeConfig = PROJECT_TYPES.find((t) => t.id === projectType)!;
  const defaultMaterials = PROJECT_TYPE_DEFAULT_MATERIALS[projectType];

  function setQty(matId: MaterialType, val: string) {
    setQuantities((q) => ({ ...q, [matId]: val }));
    setBid(null);
  }

  function handleTypeChange(type: ProjectType) {
    setProjectType(type);
    setQuantities({});
    setBid(null);
  }

  function calculate() {
    const selectedMaterials: Parameters<typeof calculateMasonryBid>[0]["selectedMaterials"] = {};
    for (const [matId, qtyStr] of Object.entries(quantities)) {
      const qty = parseFloat(qtyStr ?? "");
      if (qty > 0) {
        selectedMaterials[matId as MaterialType] = {
          quantity: qty,
          unit: PORTLAND_PRICING[matId as MaterialType].unit,
        };
      }
    }
    const result = calculateMasonryBid({
      projectType,
      selectedMaterials,
    });
    setBid(result);
    setNotesOpen(true);
  }

  function reset() {
    setQuantities({});
    setBid(null);
    setNotesOpen(false);
  }

  const hasAnyQty = Object.values(quantities).some((v) => parseFloat(v ?? "") > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Hammer className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Masonry Competitive Bid</h1>
          <p className="text-muted-foreground text-sm">
            Portland / Beaverton / Hillsboro market rates — residential, commercial, and outdoor living.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {PROJECT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTypeChange(t.id)}
                    className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      projectType === t.id
                        ? "bg-primary/5 border-primary text-primary"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    <span className={projectType === t.id ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"}>
                      {PROJECT_ICONS[t.id]}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-md bg-muted/40 border px-3 py-2 text-xs text-muted-foreground space-y-1">
                <div className="flex gap-3 flex-wrap">
                  <span>Overhead: <strong>{typeConfig.overheadPercent}%</strong></span>
                  <span>Profit: <strong>{typeConfig.profitPercent}%</strong></span>
                  {projectType === "commercial" && (
                    <Badge variant="outline" className="text-xs">Prevailing wage multiplier applied</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Material Quantities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Enter quantities for the materials in this bid. Leave blank to exclude.
              </p>

              {ALL_MATERIALS.map((mat) => {
                const isDefault = defaultMaterials.includes(mat.id);
                const rate = PORTLAND_PRICING[mat.id];
                const adjLow = rate.materialLow + rate.laborLow * typeConfig.laborMultiplier;
                const adjHigh = rate.materialHigh + rate.laborHigh * typeConfig.laborMultiplier;

                return (
                  <div key={mat.id} className={`space-y-1.5 ${!isDefault ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-1.5 justify-between flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-medium">{mat.label}</Label>
                        {isDefault && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">Recommended</Badge>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">{mat.notes}</TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {money(adjLow)} – {money(adjHigh)} / {mat.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={quantities[mat.id] ?? ""}
                          onChange={(e) => setQty(mat.id, e.target.value)}
                          className="pr-24 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          {mat.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Separator />

              <div className="flex gap-3">
                <Button className="flex-1" onClick={calculate} disabled={!hasAnyQty}>
                  <Hammer className="h-4 w-4 mr-2" />
                  Generate Bid
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {!bid && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Hammer className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">
                  Enter quantities and click "Generate Bid" to see your competitive estimate.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Rates reflect current Portland metro market conditions.
                </p>
              </CardContent>
            </Card>
          )}

          {bid && (
            <>
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6 pb-5 text-center space-y-1">
                  <p className="text-xs font-bold tracking-widest uppercase opacity-75">Total Bid Range</p>
                  <p className="text-4xl font-bold tabular-nums">
                    {moneyRange(bid.grandTotalLow, bid.grandTotalHigh)}
                  </p>
                  <p className="text-sm opacity-80">{typeConfig.label}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Line Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bid.lineItems.map((item) => (
                    <div key={item.materialId} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity.toLocaleString()} {item.unit} ×{" "}
                          {moneyRange(item.unitCostLow, item.unitCostHigh)} each
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {moneyRange(item.totalLow, item.totalHigh)}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal (labor + material)</span>
                      <span className="font-medium tabular-nums">{moneyRange(bid.subtotalLow, bid.subtotalHigh)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overhead ({typeConfig.overheadPercent}%)</span>
                      <span className="font-medium tabular-nums">{moneyRange(bid.overheadLow, bid.overheadHigh)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit ({typeConfig.profitPercent}%)</span>
                      <span className="font-medium tabular-nums">{moneyRange(bid.profitLow, bid.profitHigh)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Grand Total</span>
                      <span className="tabular-nums">{moneyRange(bid.grandTotalLow, bid.grandTotalHigh)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 rounded-t-lg transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Bid Notes & Assumptions
                        </CardTitle>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${notesOpen ? "rotate-180" : ""}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {bid.notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="text-primary mt-0.5">•</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                      These estimates are calibrated for the <strong>Portland / Beaverton / Hillsboro metro</strong> market.
                      Rates reflect 2024–2025 conditions and should be validated against current supplier quotes before submitting a formal bid.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  Hammer,
  Info,
  RefreshCw,
  FileText,
  ChevronDown,
  Building2,
  Home,
  Flame,
  ShieldCheck,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Waves,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  type AccessoryItem,
  PROJECT_TYPES,
  PORTLAND_PRICING,
  PROJECT_TYPE_DEFAULT_MATERIALS,
  ASSEMBLY_TRIGGERS,
  WASHOUT_PUMP_FEE,
  WASHOUT_PUMP_THRESHOLD_LF,
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

const OR_WA_COMPLIANCE_ITEMS = [
  {
    id: "seismic_ties",
    label: "Seismic Wall Ties verified",
    description: "Confirm quantity: min. 1 tie per 2.67 SF of wall area (OR/WA seismic zone D). Corrugated metal ties at max. 16\" horizontal, 18\" vertical spacing.",
  },
  {
    id: "anchor_bolts",
    label: "Anchor bolt spacing confirmed",
    description: "Spacing verified at ≤ 6 ft O.C. with ≥ 2 bolts per sill plate per IBC §2308.3.1 as adopted by OR/WA.",
  },
  {
    id: "flashing_protocol",
    label: "Moisture-barrier flashing protocol reviewed",
    description: "Through-wall flashing specified at all base conditions, above windows/doors, and at floor lines per WSDOT and ORS 455 moisture management requirements.",
  },
  {
    id: "seismic_reinforcement",
    label: "Seismic reinforcement spacing verified",
    description: "Vertical rebar at 32\" O.C. max., horizontal joint reinforcement at 16\" O.C. confirmed for Seismic Design Category D (Portland/Beaverton/Hillsboro metro area).",
  },
  {
    id: "permits_verified",
    label: "Masonry permits verified for jurisdiction",
    description: "Confirmed permit requirements with AHJ (Authority Having Jurisdiction) for the specific city/county — Portland BDS, Washington County, or Clark County WA.",
  },
];

interface AccessoryLineItem {
  accessory: AccessoryItem;
  triggerId: string;
  quantity: number;
  included: boolean;
}

export default function MasonryBid() {
  const [projectType, setProjectType] = useState<ProjectType>("residential");
  const [quantities, setQuantities] = useState<Partial<Record<MaterialType, string>>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [bid, setBid] = useState<MasonryBid | null>(null);
  const [complianceChecks, setComplianceChecks] = useState<Record<string, boolean>>({});
  const [accessoryOverrides, setAccessoryOverrides] = useState<Record<string, { included: boolean; quantity: number }>>({});
  const [assembliesOpen, setAssembliesOpen] = useState(true);

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
    setComplianceChecks({});
    setAccessoryOverrides({});
  }

  const triggeredAssemblies = useMemo(() => {
    const lines: AccessoryLineItem[] = [];
    for (const trigger of ASSEMBLY_TRIGGERS) {
      const triggeringQty = trigger.triggeringMaterials.reduce((sum, matId) => {
        return sum + (parseFloat(quantities[matId] ?? "") || 0);
      }, 0);
      if (triggeringQty <= 0) continue;
      for (const acc of trigger.accessories) {
        const key = `${trigger.id}__${acc.id}`;
        const override = accessoryOverrides[key];
        const defaultQty = Math.ceil(triggeringQty * acc.defaultQuantityFactor);
        lines.push({
          accessory: acc,
          triggerId: trigger.id,
          quantity: override?.quantity ?? defaultQty,
          included: override?.included ?? true,
        });
      }
    }

    const footingQty = parseFloat(quantities["concrete_footing"] ?? "") || 0;
    if (footingQty >= WASHOUT_PUMP_THRESHOLD_LF) {
      const key = `washout__washout_pump`;
      const override = accessoryOverrides[key];
      lines.push({
        accessory: WASHOUT_PUMP_FEE,
        triggerId: "washout",
        quantity: override?.quantity ?? 1,
        included: override?.included ?? true,
      });
    }

    return lines;
  }, [quantities, accessoryOverrides]);

  function setAccessoryIncluded(triggerId: string, accessoryId: string, included: boolean) {
    const key = `${triggerId}__${accessoryId}`;
    setAccessoryOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], included, quantity: prev[key]?.quantity ?? 1 },
    }));
    setBid(null);
  }

  function setAccessoryQty(triggerId: string, accessoryId: string, quantity: number) {
    const key = `${triggerId}__${accessoryId}`;
    setAccessoryOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], quantity, included: prev[key]?.included ?? true },
    }));
    setBid(null);
  }

  const hasMasonryOrConcrete = triggeredAssemblies.length > 0;
  const allComplianceChecked = OR_WA_COMPLIANCE_ITEMS.every((item) => complianceChecks[item.id]);
  const hasAnyQty = Object.values(quantities).some((v) => parseFloat(v ?? "") > 0);
  const canGenerateBid = hasAnyQty && (!hasMasonryOrConcrete || allComplianceChecked);

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
    const result = calculateMasonryBid({ projectType, selectedMaterials });

    const accessoryLow = triggeredAssemblies
      .filter((a) => a.included)
      .reduce((s, a) => s + a.quantity * a.accessory.unitCostLow, 0);
    const accessoryHigh = triggeredAssemblies
      .filter((a) => a.included)
      .reduce((s, a) => s + a.quantity * a.accessory.unitCostHigh, 0);

    result.subtotalLow += accessoryLow;
    result.subtotalHigh += accessoryHigh;
    result.overheadLow = result.subtotalLow * (typeConfig.overheadPercent / 100);
    result.overheadHigh = result.subtotalHigh * (typeConfig.overheadPercent / 100);
    result.profitLow = (result.subtotalLow + result.overheadLow) * (typeConfig.profitPercent / 100);
    result.profitHigh = (result.subtotalHigh + result.overheadHigh) * (typeConfig.profitPercent / 100);
    result.grandTotalLow = result.subtotalLow + result.overheadLow + result.profitLow;
    result.grandTotalHigh = result.subtotalHigh + result.overheadHigh + result.profitHigh;

    setBid(result);
    setNotesOpen(true);
  }

  function reset() {
    setQuantities({});
    setBid(null);
    setNotesOpen(false);
    setComplianceChecks({});
    setAccessoryOverrides({});
  }

  const includedAccessoryTotal = {
    low: triggeredAssemblies.filter((a) => a.included).reduce((s, a) => s + a.quantity * a.accessory.unitCostLow, 0),
    high: triggeredAssemblies.filter((a) => a.included).reduce((s, a) => s + a.quantity * a.accessory.unitCostHigh, 0),
  };

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
          {/* Project Type */}
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

          {/* Material Quantities */}
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
                <Button className="flex-1" onClick={calculate} disabled={!canGenerateBid}>
                  <Hammer className="h-4 w-4 mr-2" />
                  Generate Bid
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
              {hasAnyQty && !allComplianceChecked && hasMasonryOrConcrete && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Complete the OR/WA Code Compliance checklist below to unlock bid generation.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Assembly Suggestions */}
          {triggeredAssemblies.length > 0 && (
            <Collapsible open={assembliesOpen} onOpenChange={setAssembliesOpen}>
              <Card className="border-blue-200">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-blue-50/50 rounded-t-lg transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                        <Package className="h-4 w-4" />
                        Smart Assembly Suggestions
                        <Badge className="bg-blue-100 text-blue-800 text-xs">{triggeredAssemblies.filter(a => a.included).length} included</Badge>
                      </CardTitle>
                      <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${assembliesOpen ? "rotate-180" : ""}`} />
                    </div>
                    <p className="text-xs text-blue-600 font-normal text-left pt-0.5">
                      These accessories are commonly required but often missed. Review and include as needed.
                    </p>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {triggeredAssemblies.map((line) => {
                      const key = `${line.triggerId}__${line.accessory.id}`;
                      const isWashout = line.triggerId === "washout";
                      return (
                        <div key={key} className={`border rounded-md p-3 space-y-2 transition-colors ${line.included ? "bg-blue-50/40 border-blue-200" : "bg-muted/30 opacity-60"}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={key}
                              checked={line.included}
                              onCheckedChange={(v) => setAccessoryIncluded(line.triggerId, line.accessory.id, !!v)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                                  {line.accessory.label}
                                </Label>
                                {isWashout && (
                                  <Badge className="text-xs bg-orange-100 text-orange-800">
                                    <Waves className="h-3 w-3 mr-1" />Auto-triggered
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{line.accessory.notes}</p>
                            </div>
                          </div>
                          {line.included && (
                            <div className="ml-7 flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">Qty:</Label>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAccessoryQty(line.triggerId, line.accessory.id, Math.max(1, line.quantity - 1))}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={line.quantity}
                                    onChange={(e) => setAccessoryQty(line.triggerId, line.accessory.id, Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-20 h-7 text-xs text-center"
                                  />
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAccessoryQty(line.triggerId, line.accessory.id, line.quantity + 1)}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-xs text-muted-foreground">{line.accessory.unit}</span>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-blue-800">
                                {moneyRange(line.quantity * line.accessory.unitCostLow, line.quantity * line.accessory.unitCostHigh)}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground cursor-help underline dotted">How calculated</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">{line.accessory.quantityBasis}</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {includedAccessoryTotal.low > 0 && (
                      <div className="flex justify-between items-center pt-1 border-t text-sm font-semibold text-blue-800">
                        <span>Accessories subtotal</span>
                        <span>{moneyRange(includedAccessoryTotal.low, includedAccessoryTotal.high)}</span>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* WA/OR Code Compliance Checklist */}
          {hasMasonryOrConcrete && (
            <Card className={`border-2 ${allComplianceChecked ? "border-green-200" : "border-amber-300"}`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base flex items-center gap-2 ${allComplianceChecked ? "text-green-800" : "text-amber-800"}`}>
                  <ShieldCheck className="h-4 w-4" />
                  Oregon & Washington Code Compliance
                  <HelpTooltip articleSlug="wa-or-compliance-checklist" className="ml-1" />
                  {allComplianceChecked
                    ? <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />All verified</Badge>
                    : <Badge className="bg-amber-100 text-amber-800 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Required before bidding</Badge>
                  }
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Verify each item before finalizing a masonry bid for structures in Oregon or Washington.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {OR_WA_COMPLIANCE_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                      complianceChecks[item.id]
                        ? "bg-green-50 border-green-200"
                        : "bg-background border-input"
                    }`}
                  >
                    <Checkbox
                      id={`compliance-${item.id}`}
                      checked={!!complianceChecks[item.id]}
                      onCheckedChange={(v) => {
                        setComplianceChecks((c) => ({ ...c, [item.id]: !!v }));
                        setBid(null);
                      }}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor={`compliance-${item.id}`} className="text-sm font-medium cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
                {allComplianceChecked && (
                  <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-md p-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    All compliance items verified. This bid is cleared for Oregon and Washington.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Bid Output */}
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Line Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bid.lineItems.map((item) => (
                    <div key={item.materialId} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity.toLocaleString()} {item.unit} × {moneyRange(item.unitCostLow, item.unitCostHigh)} each
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">{moneyRange(item.totalLow, item.totalHigh)}</p>
                      </div>
                    </div>
                  ))}

                  {triggeredAssemblies.filter(a => a.included).length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Package className="h-3 w-3" />Assembly Accessories</p>
                      {triggeredAssemblies.filter(a => a.included).map((line) => (
                        <div key={`${line.triggerId}__${line.accessory.id}`} className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{line.accessory.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {line.quantity.toLocaleString()} {line.accessory.unit} × {moneyRange(line.accessory.unitCostLow, line.accessory.unitCostHigh)} each
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums">{moneyRange(line.quantity * line.accessory.unitCostLow, line.quantity * line.accessory.unitCostHigh)}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal (labor + material + accessories)</span>
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

              {allComplianceChecked && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-800">OR/WA Code Compliance Verified</p>
                        <p className="text-xs text-green-700">All Oregon and Washington code compliance items were confirmed before this bid was generated.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

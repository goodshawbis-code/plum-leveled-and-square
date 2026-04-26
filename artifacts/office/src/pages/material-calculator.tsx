import { useState, useCallback } from "react";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  Calculator,
  Plus,
  Trash2,
  ChevronDown,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  type MaterialCategory,
  type Opening,
  type CalcResult,
  CMU_PRESETS,
  BRICK_PRESETS,
  OREGON_STONE_PRESETS,
  calcCmu,
  calcBrick,
  calcStone,
  calcCustom,
} from "@/lib/masonry-calculator";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function DimInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  tip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  tip?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs font-medium">{label}</Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="pr-10 text-sm"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MaterialCalculator() {
  const [category, setCategory] = useState<MaterialCategory>("cmu");

  const [cmuPresetId, setCmuPresetId] = useState(CMU_PRESETS[0].id);
  const [brickPresetId, setBrickPresetId] = useState(BRICK_PRESETS[0].id);
  const [stonePresetId, setStonePresetId] = useState(OREGON_STONE_PRESETS[0].id);

  const [wallLengthFt, setWallLengthFt] = useState("");
  const [wallHeightFt, setWallHeightFt] = useState("");
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [wythes, setWythes] = useState<"1" | "2">("1");

  const [wastePct, setWastePct] = useState("");

  const [customLengthIn, setCustomLengthIn] = useState("");
  const [customHeightIn, setCustomHeightIn] = useState("");
  const [customJointIn, setCustomJointIn] = useState("0.375");
  const [customWythes, setCustomWythes] = useState<"1" | "2">("1");
  const [customPricePerUnit, setCustomPricePerUnit] = useState("");

  const [stoneCustomMaterialLow, setStoneCustomMaterialLow] = useState("");
  const [stoneCustomMaterialHigh, setStoneCustomMaterialHigh] = useState("");
  const [stoneCustomInstalledLow, setStoneCustomInstalledLow] = useState("");
  const [stoneCustomInstalledHigh, setStoneCustomInstalledHigh] = useState("");

  const [cmuCustomLengthIn, setCmuCustomLengthIn] = useState("16");
  const [cmuCustomHeightIn, setCmuCustomHeightIn] = useState("8");
  const [brickCustomLengthIn, setBrickCustomLengthIn] = useState("8");
  const [brickCustomHeightIn, setBrickCustomHeightIn] = useState("2.667");

  const [result, setResult] = useState<CalcResult | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const cmuPreset = CMU_PRESETS.find((p) => p.id === cmuPresetId)!;
  const brickPreset = BRICK_PRESETS.find((p) => p.id === brickPresetId)!;
  const stonePreset = OREGON_STONE_PRESETS.find((p) => p.id === stonePresetId)!;

  const getDefaultWaste = useCallback(() => {
    if (category === "cmu") return cmuPreset.defaultWastePct;
    if (category === "brick") return brickPreset.defaultWastePct;
    if (category === "stone") return stonePreset.defaultWastePct;
    return 10;
  }, [category, cmuPreset, brickPreset, stonePreset]);

  const addOpening = () =>
    setOpenings((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), label: `Opening ${prev.length + 1}`, widthFt: 0, heightFt: 0 },
    ]);

  const removeOpening = (id: string) =>
    setOpenings((prev) => prev.filter((o) => o.id !== id));

  const updateOpening = (id: string, field: "widthFt" | "heightFt" | "label", value: string | number) =>
    setOpenings((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );

  const effectiveWaste = wastePct !== "" ? parseFloat(wastePct) : getDefaultWaste();

  function calculate() {
    const lft = parseFloat(wallLengthFt) || 0;
    const hft = parseFloat(wallHeightFt) || 0;

    if (category === "cmu") {
      const nomL = cmuPresetId === "cmu_custom" ? parseFloat(cmuCustomLengthIn) || 16 : cmuPreset.nominalLengthIn;
      const nomH = cmuPresetId === "cmu_custom" ? parseFloat(cmuCustomHeightIn) || 8 : cmuPreset.nominalHeightIn;
      setResult(calcCmu({ lengthFt: lft, heightFt: hft, openings, nominalLengthIn: nomL, nominalHeightIn: nomH, wastePct: effectiveWaste }));
    } else if (category === "brick") {
      const nomL = brickPresetId === "brick_custom" ? parseFloat(brickCustomLengthIn) || 8 : brickPreset.nominalLengthIn;
      const nomH = brickPresetId === "brick_custom" ? parseFloat(brickCustomHeightIn) || 2.667 : brickPreset.nominalHeightIn;
      setResult(calcBrick({ lengthFt: lft, heightFt: hft, openings, nominalLengthIn: nomL, nominalHeightIn: nomH, wythes: parseInt(wythes) as 1 | 2, wastePct: effectiveWaste }));
    } else if (category === "stone") {
      const matLow = stonePresetId === "stone_custom" ? parseFloat(stoneCustomMaterialLow) || 0 : stonePreset.materialLowPerSf;
      const matHigh = stonePresetId === "stone_custom" ? parseFloat(stoneCustomMaterialHigh) || 0 : stonePreset.materialHighPerSf;
      const instLow = stonePresetId === "stone_custom" ? parseFloat(stoneCustomInstalledLow) || 0 : stonePreset.installedLowPerSf;
      const instHigh = stonePresetId === "stone_custom" ? parseFloat(stoneCustomInstalledHigh) || 0 : stonePreset.installedHighPerSf;
      setResult(calcStone({ lengthFt: lft, heightFt: hft, openings, wastePct: effectiveWaste, materialLowPerSf: matLow, materialHighPerSf: matHigh, installedLowPerSf: instLow, installedHighPerSf: instHigh }));
    } else {
      setResult(calcCustom({
        lengthFt: lft,
        heightFt: hft,
        openings,
        unitLengthIn: parseFloat(customLengthIn) || 0,
        unitHeightIn: parseFloat(customHeightIn) || 0,
        mortarJointIn: parseFloat(customJointIn) || 0.375,
        wythes: parseInt(customWythes) as 1 | 2,
        wastePct: effectiveWaste,
        pricePerUnit: parseFloat(customPricePerUnit) || 0,
      }));
    }
    setBreakdownOpen(true);
  }

  function reset() {
    setWallLengthFt("");
    setWallHeightFt("");
    setOpenings([]);
    setWastePct("");
    setResult(null);
    setBreakdownOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Material Calculator</h1>
            <HelpTooltip articleSlug="material-calculator" />
          </div>
          <p className="text-muted-foreground text-sm">
            CMU block, brick, and natural stone takeoff — with Oregon regional pricing for natural stone.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── LEFT: Inputs ─────────────────────────────── */}
        <div className="space-y-4">
          {/* Category */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Material Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["cmu", "brick", "stone", "custom"] as MaterialCategory[]).map((cat) => {
                  const labels: Record<MaterialCategory, string> = {
                    cmu: "CMU Block",
                    brick: "Brick",
                    stone: "Natural Stone",
                    custom: "Custom",
                  };
                  return (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setResult(null); }}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${category === cat ? "bg-primary text-primary-foreground border-primary" : "border-input bg-background hover:bg-muted"}`}
                    >
                      {labels[cat]}
                    </button>
                  );
                })}
              </div>

              {/* CMU sub-type */}
              {category === "cmu" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Block Type</Label>
                    <Select value={cmuPresetId} onValueChange={setCmuPresetId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CMU_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {cmuPresetId === "cmu_custom" && (
                    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
                      <DimInput label="Nominal Length" value={cmuCustomLengthIn} onChange={setCmuCustomLengthIn} suffix="in" tip={'Nominal = actual + mortar joint (usually 3/8")'} />
                      <DimInput label="Nominal Height" value={cmuCustomHeightIn} onChange={setCmuCustomHeightIn} suffix="in" tip="Nominal height per course" />
                    </div>
                  )}
                  {cmuPresetId !== "cmu_custom" && (
                    <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Nominal: {cmuPreset.nominalLengthIn}" × {cmuPreset.nominalHeightIn}" &nbsp;|&nbsp;
                      Coverage: {((12 / cmuPreset.nominalLengthIn) * (12 / cmuPreset.nominalHeightIn)).toFixed(3)} blocks/SF
                    </div>
                  )}
                </div>
              )}

              {/* Brick sub-type */}
              {category === "brick" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Brick Type</Label>
                    <Select value={brickPresetId} onValueChange={setBrickPresetId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRICK_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {brickPresetId === "brick_custom" && (
                    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
                      <DimInput label="Nominal Length" value={brickCustomLengthIn} onChange={setBrickCustomLengthIn} suffix="in" tip={'Nominal = actual + 3/8" mortar joint'} />
                      <DimInput label="Nominal Height" value={brickCustomHeightIn} onChange={setBrickCustomHeightIn} suffix="in" />
                    </div>
                  )}
                  {brickPresetId !== "brick_custom" && (
                    <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Nominal: {brickPreset.nominalLengthIn}" × {brickPreset.nominalHeightIn.toFixed(3)}" &nbsp;|&nbsp;
                      ~{((12 / brickPreset.nominalLengthIn) * (12 / brickPreset.nominalHeightIn)).toFixed(2)} bricks/SF (single wythe)
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Wall Construction</Label>
                    <Select value={wythes} onValueChange={(v) => setWythes(v as "1" | "2")}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Single Wythe (4\")</SelectItem>
                        <SelectItem value="2">Double Wythe (8\")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Stone sub-type */}
              {category === "stone" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Stone Type</Label>
                    <Select value={stonePresetId} onValueChange={setStonePresetId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OREGON_STONE_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {stonePresetId !== "stone_custom" && (
                    <div className="rounded-md bg-muted/40 border px-3 py-2 text-xs space-y-1">
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">Material: ${stonePreset.materialLowPerSf}–${stonePreset.materialHighPerSf}/SF</Badge>
                        <Badge variant="outline" className="text-xs">Installed: ${stonePreset.installedLowPerSf}–${stonePreset.installedHighPerSf}/SF</Badge>
                      </div>
                      <p className="text-muted-foreground">{stonePreset.notes}</p>
                    </div>
                  )}
                  {stonePresetId === "stone_custom" && (
                    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
                      <DimInput label="Material Low ($/SF)" value={stoneCustomMaterialLow} onChange={setStoneCustomMaterialLow} suffix="$" />
                      <DimInput label="Material High ($/SF)" value={stoneCustomMaterialHigh} onChange={setStoneCustomMaterialHigh} suffix="$" />
                      <DimInput label="Installed Low ($/SF)" value={stoneCustomInstalledLow} onChange={setStoneCustomInstalledLow} suffix="$" />
                      <DimInput label="Installed High ($/SF)" value={stoneCustomInstalledHigh} onChange={setStoneCustomInstalledHigh} suffix="$" />
                    </div>
                  )}
                </div>
              )}

              {/* Custom */}
              {category === "custom" && (
                <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
                  <DimInput label="Unit Actual Length" value={customLengthIn} onChange={setCustomLengthIn} suffix="in" tip="Actual (not nominal) unit length" />
                  <DimInput label="Unit Actual Height" value={customHeightIn} onChange={setCustomHeightIn} suffix="in" />
                  <DimInput label="Mortar Joint" value={customJointIn} onChange={setCustomJointIn} suffix="in" tip={'Standard is 3/8" (0.375). Use 0 for dry-stack.'} />
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Wythes</Label>
                    <Select value={customWythes} onValueChange={(v) => setCustomWythes(v as "1" | "2")}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Single (1)</SelectItem>
                        <SelectItem value="2">Double (2)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <DimInput label="Price Per Unit ($)" value={customPricePerUnit} onChange={setCustomPricePerUnit} suffix="$" tip="Optional — used to estimate material cost" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wall dimensions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wall Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DimInput label="Wall Length" value={wallLengthFt} onChange={setWallLengthFt} suffix="ft" placeholder="0.0" />
                <DimInput label="Wall Height" value={wallHeightFt} onChange={setWallHeightFt} suffix="ft" placeholder="0.0" />
              </div>

              {/* Openings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Openings (doors / windows)</Label>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addOpening}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Opening
                  </Button>
                </div>
                {openings.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No openings — full wall area will be used.</p>
                )}
                {openings.map((o) => (
                  <div key={o.id} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-end rounded-md border bg-muted/20 p-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="h-8 text-xs"
                        value={o.label}
                        onChange={(e) => updateOpening(o.id, "label", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Width (ft)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-8 text-xs"
                        value={o.widthFt || ""}
                        onChange={(e) => updateOpening(o.id, "widthFt", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height (ft)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-8 text-xs"
                        value={o.heightFt || ""}
                        onChange={(e) => updateOpening(o.id, "heightFt", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive mt-5"
                      onClick={() => removeOpening(o.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Waste override */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-medium">Waste Factor</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">
                      Default: CMU 5%, Brick 10%, Stone 15%. Override here if needed.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={wastePct}
                    onChange={(e) => setWastePct(e.target.value)}
                    placeholder={String(getDefaultWaste())}
                    className="pr-10 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Default for this material: {getDefaultWaste()}%</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={calculate}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>

        {/* ── RIGHT: Results ─────────────────────────────── */}
        <div className="space-y-4">
          {!result && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">
                  Enter wall dimensions and click Calculate to see your takeoff.
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Summary banner */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6 pb-4 text-center space-y-1">
                  <p className="text-xs font-bold tracking-widest uppercase opacity-75">Total Quantity</p>
                  <p className="text-5xl font-bold tabular-nums">{fmt(result.totalQuantity)}</p>
                  <p className="text-sm opacity-80 capitalize">{result.unit} (incl. {result.wastePct}% waste)</p>
                </CardContent>
              </Card>

              {/* Area breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Area Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross wall area</span>
                      <span className="font-medium">{fmt(result.grossAreaSf, 1)} SF</span>
                    </div>
                    {result.openingsAreaSf > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Less openings</span>
                        <span>− {fmt(result.openingsAreaSf, 1)} SF</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Net area</span>
                      <span>{fmt(result.netAreaSf, 1)} SF</span>
                    </div>
                    {result.blocksPerSf !== undefined && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Coverage rate</span>
                        <span>{result.blocksPerSf} {result.unit}/SF</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base quantity</span>
                      <span>{fmt(result.baseQuantity)} {result.unit}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Waste ({result.wastePct}%)</span>
                      <span>+ {fmt(result.wasteQuantity)} {result.unit}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Order quantity</span>
                      <span>{fmt(result.totalQuantity)} {result.unit}</span>
                    </div>
                    {result.courses !== undefined && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Wall courses</span>
                        <span>{fmt(result.courses)} courses</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stone pricing card */}
              {result.category === "stone" && (result.priceLow !== undefined) && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Oregon Pricing Estimate</CardTitle>
                      <Badge variant="secondary" className="text-xs">2024–25 Market Rates</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-md bg-muted/40 border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Material Only</p>
                      <p className="text-2xl font-bold">
                        {money(result.priceLow!)}
                        {result.priceLow !== result.priceHigh && (
                          <span className="text-muted-foreground"> – {money(result.priceHigh!)}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">For {fmt(result.totalQuantity)} SF ordered material</p>
                    </div>
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fully Installed</p>
                      <p className="text-2xl font-bold">
                        {money(result.installedLow!)}
                        {result.installedLow !== result.installedHigh && (
                          <span className="text-muted-foreground"> – {money(result.installedHigh!)}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Based on {fmt(result.netAreaSf, 1)} SF net area — Oregon labor + material
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Prices reflect Oregon / Pacific Northwest market rates. Obtain competitive bids for final estimates.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Custom pricing */}
              {result.category === "custom" && result.priceLow !== undefined && result.priceLow > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Material Cost Estimate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md bg-muted/40 border p-3">
                      <p className="text-2xl font-bold">{money(result.priceLow!)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fmt(result.totalQuantity)} {result.unit} × ${parseFloat(customPricePerUnit).toFixed(2)}/unit
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Calculation breakdown */}
              <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
                <Card>
                  <CardHeader className="pb-0">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between text-sm font-medium py-1">
                        Calculation Breakdown
                        <ChevronDown className={`h-4 w-4 transition-transform ${breakdownOpen ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-3">
                      <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                        {result.breakdown.map((line, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground/40 select-none">{String(i + 1).padStart(2, "0")}</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

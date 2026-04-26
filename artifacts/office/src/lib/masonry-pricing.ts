export type ProjectType = "residential" | "commercial" | "outdoor";
export type MaterialType = "culture_stone" | "cmu_standard" | "cmu_splitface" | "brick_standard" | "brick_splitface" | "concrete_footing" | "grout_fill" | "rebar" | "mortar";

export interface PricingRate {
  materialId: MaterialType;
  label: string;
  unit: string;
  laborLow: number;
  laborHigh: number;
  materialLow: number;
  materialHigh: number;
  installedLow: number;
  installedHigh: number;
  notes: string;
}

export interface ProjectTypeConfig {
  id: ProjectType;
  label: string;
  description: string;
  laborMultiplier: number;
  overheadPercent: number;
  profitPercent: number;
  permitNote: string;
}

export interface BidLineItem {
  materialId: MaterialType;
  label: string;
  quantity: number;
  unit: string;
  unitCostLow: number;
  unitCostHigh: number;
  totalLow: number;
  totalHigh: number;
}

export interface MasonryBid {
  projectType: ProjectType;
  lineItems: BidLineItem[];
  subtotalLow: number;
  subtotalHigh: number;
  overheadLow: number;
  overheadHigh: number;
  profitLow: number;
  profitHigh: number;
  grandTotalLow: number;
  grandTotalHigh: number;
  notes: string[];
}

export const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    id: "residential",
    label: "Residential Development",
    description: "Single-family homes, townhomes, and multi-family residential",
    laborMultiplier: 1.0,
    overheadPercent: 12,
    profitPercent: 15,
    permitNote: "Typical Portland residential permit: $800–$2,500 depending on valuation",
  },
  {
    id: "commercial",
    label: "Small Commercial (≤ 2 Stories)",
    description: "Retail, office, warehouse, and light commercial buildings up to 2 stories",
    laborMultiplier: 1.22,
    overheadPercent: 14,
    profitPercent: 18,
    permitNote: "Commercial permits in Portland/Beaverton typically $2,000–$8,000+",
  },
  {
    id: "outdoor",
    label: "Outdoor Living Enhancement",
    description: "Outdoor kitchens, custom patios, fire pits, retaining walls, and BBQ islands",
    laborMultiplier: 1.08,
    overheadPercent: 10,
    profitPercent: 20,
    permitNote: "Outdoor structures over 200 SF typically require permits; fire features may need separate review",
  },
];

export const PORTLAND_PRICING: Record<MaterialType, PricingRate> = {
  culture_stone: {
    materialId: "culture_stone",
    label: "Culture Stone / Manufactured Stone Veneer",
    unit: "SF",
    laborLow: 6.00,
    laborHigh: 9.00,
    materialLow: 9.00,
    materialHigh: 13.00,
    installedLow: 15.00,
    installedHigh: 22.00,
    notes: "Manufactured stone veneer (Cultured Stone®, ProVia, Eldorado, etc.). $15/SF base installed rate. Includes scratch coat, mortar bed, stone placement, and pointing. Add 15% for corners and transition trim pieces.",
  },
  cmu_standard: {
    materialId: "cmu_standard",
    label: "CMU Block (Standard 8×8×16)",
    unit: "SF of wall",
    laborLow: 9.50,
    laborHigh: 13.00,
    materialLow: 4.50,
    materialHigh: 6.50,
    installedLow: 14.00,
    installedHigh: 19.50,
    notes: "Portland metro standard CMU including mortar, block, and basic reinforcement",
  },
  cmu_splitface: {
    materialId: "cmu_splitface",
    label: "Split-Face CMU Block",
    unit: "SF of wall",
    laborLow: 11.00,
    laborHigh: 15.50,
    materialLow: 7.00,
    materialHigh: 10.00,
    installedLow: 18.00,
    installedHigh: 25.50,
    notes: "Architectural split-face block. Popular for commercial facades in the Beaverton/Hillsboro corridor",
  },
  brick_standard: {
    materialId: "brick_standard",
    label: "Standard Modular Brick",
    unit: "SF of wall",
    laborLow: 13.00,
    laborHigh: 18.00,
    materialLow: 5.50,
    materialHigh: 8.00,
    installedLow: 18.50,
    installedHigh: 26.00,
    notes: "Single-wythe modular brick. Add 60–80% for double-wythe construction",
  },
  brick_splitface: {
    materialId: "brick_splitface",
    label: "Split-Face / Tumbled Brick",
    unit: "SF of wall",
    laborLow: 15.00,
    laborHigh: 22.00,
    materialLow: 9.00,
    materialHigh: 14.00,
    installedLow: 24.00,
    installedHigh: 36.00,
    notes: "Architectural/tumbled brick. High demand in Portland Pearl District and Beaverton residential",
  },
  concrete_footing: {
    materialId: "concrete_footing",
    label: "Concrete Footing (Standard)",
    unit: "Linear Foot",
    laborLow: 18.00,
    laborHigh: 28.00,
    materialLow: 12.00,
    materialHigh: 18.00,
    installedLow: 30.00,
    installedHigh: 46.00,
    notes: "Includes excavation, forming, pour, and rebar per Portland/Hillsboro standard residential code (12\" wide × 12\" deep typical)",
  },
  grout_fill: {
    materialId: "grout_fill",
    label: "Grout Fill (CMU Cells)",
    unit: "SF of wall",
    laborLow: 1.50,
    laborHigh: 2.50,
    materialLow: 2.00,
    materialHigh: 3.00,
    installedLow: 3.50,
    installedHigh: 5.50,
    notes: "Solid grout fill for CMU cores. Commercial and high-seismic zones (Oregon) often require full-cell grouting",
  },
  rebar: {
    materialId: "rebar",
    label: "Rebar (Vertical & Horizontal)",
    unit: "SF of wall",
    laborLow: 1.00,
    laborHigh: 1.75,
    materialLow: 1.25,
    materialHigh: 2.00,
    installedLow: 2.25,
    installedHigh: 3.75,
    notes: "#4 @ 32\" OC vertical, #4 @ 16\" OC horizontal (typical Oregon seismic zone reinforcement)",
  },
  mortar: {
    materialId: "mortar",
    label: "Type S Mortar",
    unit: "SF of wall",
    laborLow: 1.00,
    laborHigh: 1.50,
    materialLow: 0.75,
    materialHigh: 1.25,
    installedLow: 1.75,
    installedHigh: 2.75,
    notes: "Type S mortar recommended for below-grade and exterior applications in the Pacific Northwest climate",
  },
};

export interface AccessoryItem {
  id: string;
  label: string;
  unit: string;
  unitCostLow: number;
  unitCostHigh: number;
  defaultQuantityFactor: number;
  quantityBasis: string;
  notes: string;
}

export interface AssemblyTrigger {
  id: string;
  label: string;
  triggeringMaterials: MaterialType[];
  accessories: AccessoryItem[];
}

export const WASHOUT_PUMP_THRESHOLD_LF = 60;

export const ASSEMBLY_TRIGGERS: AssemblyTrigger[] = [
  {
    id: "concrete_assembly",
    label: "Concrete / Foundation Accessories",
    triggeringMaterials: ["concrete_footing"],
    accessories: [
      {
        id: "rebar_chairs",
        label: "Rebar Chairs (Plastic)",
        unit: "EA",
        unitCostLow: 0.35,
        unitCostHigh: 0.60,
        defaultQuantityFactor: 4,
        quantityBasis: "per LF of footing (approx. 4 chairs/LF)",
        notes: "Maintains rebar clearance per IBC. Typ. 2\" or 3\" height. Required by OR/WA code.",
      },
      {
        id: "tie_wire",
        label: "Tie Wire (16-ga Black Annealed)",
        unit: "LB",
        unitCostLow: 1.80,
        unitCostHigh: 2.50,
        defaultQuantityFactor: 0.10,
        quantityBasis: "per LF of footing (approx. 0.1 lb/LF)",
        notes: "Used to secure rebar intersections. One spool (3.5 lb) typically covers 35 LF of footing.",
      },
      {
        id: "form_release",
        label: "Form Release Oil",
        unit: "GAL",
        unitCostLow: 18,
        unitCostHigh: 28,
        defaultQuantityFactor: 0.05,
        quantityBasis: "per LF of footing (approx. 0.05 gal/LF)",
        notes: "Applied to forms before pour to prevent concrete adhesion. Product: Cresset Chemtool, W-1, or equivalent.",
      },
    ],
  },
  {
    id: "masonry_assembly",
    label: "CMU / Masonry Accessories",
    triggeringMaterials: ["cmu_standard", "cmu_splitface", "brick_standard", "brick_splitface", "culture_stone"],
    accessories: [
      {
        id: "leveling_jacks",
        label: "Scaffolding Leveling Jacks",
        unit: "EA",
        unitCostLow: 42,
        unitCostHigh: 68,
        defaultQuantityFactor: 0.02,
        quantityBasis: "per SF of wall (approx. 1 jack per 50 SF)",
        notes: "Adjustable base jacks for pump-up / frame scaffolding. Required for walls over 8 ft.",
      },
      {
        id: "flashing",
        label: "Through-Wall Flashing (Copper or TPO)",
        unit: "LF",
        unitCostLow: 4.50,
        unitCostHigh: 7.00,
        defaultQuantityFactor: 0.15,
        quantityBasis: "per SF of wall (approx. 0.15 LF/SF for base + ledge runs)",
        notes: "Required at all ledge/base conditions per OR/WA moisture management code. Add 20% for corners.",
      },
      {
        id: "angle_irons",
        label: "Angle Irons / Shelf Angles (A36 Steel)",
        unit: "LF",
        unitCostLow: 12,
        unitCostHigh: 20,
        defaultQuantityFactor: 0.05,
        quantityBasis: "per SF of wall (varies by floor-to-floor height)",
        notes: "Structural shelf angles at floor lines for multi-story masonry veneer. Requires eng. stamp in OR/WA.",
      },
      {
        id: "weep_holes",
        label: "Weep Holes / Open-Head Joints",
        unit: "EA",
        unitCostLow: 2.50,
        unitCostHigh: 4.00,
        defaultQuantityFactor: 0.05,
        quantityBasis: "per SF of wall (approx. 1 weep per 2 ft of base)",
        notes: "Allows moisture to drain from cavity. OR/WA code requires at base of each wythe and above flashings.",
      },
      {
        id: "mortar_netting",
        label: "Mortar Collection Net (Cavity Mortar Guard)",
        unit: "SF",
        unitCostLow: 0.75,
        unitCostHigh: 1.25,
        defaultQuantityFactor: 1.0,
        quantityBasis: "per SF of wall",
        notes: "Prevents mortar droppings from blocking weep holes. Recommended in OR/WA due to high moisture exposure.",
      },
    ],
  },
];

export const WASHOUT_PUMP_FEE: AccessoryItem = {
  id: "washout_pump",
  label: "Concrete Washout / Pump Fee",
  unit: "EA",
  unitCostLow: 450,
  unitCostHigh: 850,
  defaultQuantityFactor: 1,
  quantityBasis: "flat fee per pour event (triggered when footing > 60 LF)",
  notes: "Required for concrete pump truck mobilization + washout compliance. Portland/Beaverton area typical range. Add $150–250 if extended-boom pump required.",
};

export const PROJECT_TYPE_DEFAULT_MATERIALS: Record<ProjectType, MaterialType[]> = {
  residential: ["culture_stone", "cmu_standard", "concrete_footing", "rebar", "grout_fill", "mortar"],
  commercial: ["cmu_splitface", "concrete_footing", "rebar", "grout_fill", "mortar"],
  outdoor: ["culture_stone", "brick_splitface", "concrete_footing", "mortar"],
};

export interface BidInput {
  projectType: ProjectType;
  wallAreaSf?: number;
  footingLf?: number;
  selectedMaterials: Partial<Record<MaterialType, { quantity: number; unit: string }>>;
}

export function calculateMasonryBid(input: BidInput): MasonryBid {
  const typeConfig = PROJECT_TYPES.find((t) => t.id === input.projectType)!;
  const lineItems: BidLineItem[] = [];

  for (const [matId, qty] of Object.entries(input.selectedMaterials)) {
    if (!qty || qty.quantity <= 0) continue;
    const rate = PORTLAND_PRICING[matId as MaterialType];
    if (!rate) continue;

    const laborAdj = typeConfig.laborMultiplier;
    const unitLow = rate.materialLow + rate.laborLow * laborAdj;
    const unitHigh = rate.materialHigh + rate.laborHigh * laborAdj;

    lineItems.push({
      materialId: matId as MaterialType,
      label: rate.label,
      quantity: qty.quantity,
      unit: rate.unit,
      unitCostLow: unitLow,
      unitCostHigh: unitHigh,
      totalLow: unitLow * qty.quantity,
      totalHigh: unitHigh * qty.quantity,
    });
  }

  const subtotalLow = lineItems.reduce((s, l) => s + l.totalLow, 0);
  const subtotalHigh = lineItems.reduce((s, l) => s + l.totalHigh, 0);

  const overheadLow = subtotalLow * (typeConfig.overheadPercent / 100);
  const overheadHigh = subtotalHigh * (typeConfig.overheadPercent / 100);

  const profitLow = (subtotalLow + overheadLow) * (typeConfig.profitPercent / 100);
  const profitHigh = (subtotalHigh + overheadHigh) * (typeConfig.profitPercent / 100);

  const grandTotalLow = subtotalLow + overheadLow + profitLow;
  const grandTotalHigh = subtotalHigh + overheadHigh + profitHigh;

  const notes: string[] = [
    "Rates calibrated for Portland / Beaverton / Hillsboro metro market (2024–2025).",
    typeConfig.permitNote,
    "Prices do not include equipment rental, scaffolding > 14 ft, or soil disposal unless noted.",
    "Add 8–12% for prevailing wage / Davis-Bacon commercial projects.",
  ];

  return {
    projectType: input.projectType,
    lineItems,
    subtotalLow,
    subtotalHigh,
    overheadLow,
    overheadHigh,
    profitLow,
    profitHigh,
    grandTotalLow,
    grandTotalHigh,
    notes,
  };
}

export type MaterialCategory = "cmu" | "brick" | "stone" | "custom";

export interface CmuPreset {
  id: string;
  label: string;
  nominalLengthIn: number;
  nominalHeightIn: number;
  nominalDepthIn: number;
  defaultWastePct: number;
}

export interface BrickPreset {
  id: string;
  label: string;
  nominalLengthIn: number;
  nominalHeightIn: number;
  nominalDepthIn: number;
  defaultWastePct: number;
}

export interface StonePreset {
  id: string;
  label: string;
  materialLowPerSf: number;
  materialHighPerSf: number;
  installedLowPerSf: number;
  installedHighPerSf: number;
  defaultWastePct: number;
  notes: string;
}

export const CMU_PRESETS: CmuPreset[] = [
  {
    id: "cmu8std",
    label: "Standard 8\" CMU",
    nominalLengthIn: 16,
    nominalHeightIn: 8,
    nominalDepthIn: 8,
    defaultWastePct: 5,
  },
  {
    id: "cmu6std",
    label: "6\" CMU",
    nominalLengthIn: 16,
    nominalHeightIn: 8,
    nominalDepthIn: 6,
    defaultWastePct: 5,
  },
  {
    id: "cmu12std",
    label: "12\" CMU",
    nominalLengthIn: 16,
    nominalHeightIn: 8,
    nominalDepthIn: 12,
    defaultWastePct: 5,
  },
  {
    id: "cmu8split",
    label: "Split Face 8\" CMU",
    nominalLengthIn: 16,
    nominalHeightIn: 8,
    nominalDepthIn: 8,
    defaultWastePct: 7,
  },
  {
    id: "cmu8half",
    label: "Half High 8\" CMU",
    nominalLengthIn: 16,
    nominalHeightIn: 4,
    nominalDepthIn: 8,
    defaultWastePct: 7,
  },
  {
    id: "cmu_custom",
    label: "Custom CMU",
    nominalLengthIn: 16,
    nominalHeightIn: 8,
    nominalDepthIn: 8,
    defaultWastePct: 7,
  },
];

export const BRICK_PRESETS: BrickPreset[] = [
  {
    id: "brick_modular",
    label: "Standard Modular (7⅝\" × 2¼\" × 3⅝\")",
    nominalLengthIn: 8,
    nominalHeightIn: 2.667,
    nominalDepthIn: 4,
    defaultWastePct: 10,
  },
  {
    id: "brick_king",
    label: "King Size (~9⅝\" × 2⅝\" × 3⅝\")",
    nominalLengthIn: 10,
    nominalHeightIn: 2.75,
    nominalDepthIn: 4,
    defaultWastePct: 10,
  },
  {
    id: "brick_utility",
    label: "Utility (11⅝\" × 2⅝\" × 3⅝\")",
    nominalLengthIn: 12,
    nominalHeightIn: 2.75,
    nominalDepthIn: 4,
    defaultWastePct: 10,
  },
  {
    id: "brick_queen",
    label: "Queen (9⅝\" × 2¾\" × 3\")",
    nominalLengthIn: 10,
    nominalHeightIn: 3,
    nominalDepthIn: 4,
    defaultWastePct: 10,
  },
  {
    id: "brick_custom",
    label: "Custom Brick",
    nominalLengthIn: 8,
    nominalHeightIn: 2.667,
    nominalDepthIn: 4,
    defaultWastePct: 10,
  },
];

export const OREGON_STONE_PRESETS: StonePreset[] = [
  {
    id: "basalt",
    label: "Basalt (Oregon Native)",
    materialLowPerSf: 8,
    materialHighPerSf: 14,
    installedLowPerSf: 28,
    installedHighPerSf: 42,
    defaultWastePct: 15,
    notes: "Native Oregon volcanic basalt. Excellent durability in PNW climate.",
  },
  {
    id: "columbia_basalt",
    label: "Columbia River Basalt Ledge",
    materialLowPerSf: 9,
    materialHighPerSf: 16,
    installedLowPerSf: 30,
    installedHighPerSf: 46,
    defaultWastePct: 15,
    notes: "Regional ledge-cut basalt. Popular in Portland metro area.",
  },
  {
    id: "fieldstone",
    label: "Fieldstone / River Rock",
    materialLowPerSf: 6,
    materialHighPerSf: 12,
    installedLowPerSf: 32,
    installedHighPerSf: 52,
    defaultWastePct: 20,
    notes: "Oregon fieldstone and river rock. Higher labor cost due to irregular fitting.",
  },
  {
    id: "granite",
    label: "Granite (Regional)",
    materialLowPerSf: 15,
    materialHighPerSf: 25,
    installedLowPerSf: 38,
    installedHighPerSf: 60,
    defaultWastePct: 10,
    notes: "Pacific NW regional granite. Cut/dressed stone pricing.",
  },
  {
    id: "limestone",
    label: "Limestone",
    materialLowPerSf: 10,
    materialHighPerSf: 18,
    installedLowPerSf: 30,
    installedHighPerSf: 50,
    defaultWastePct: 12,
    notes: "Imported/regional limestone. Oregon pricing reflects freight to PNW.",
  },
  {
    id: "sandstone",
    label: "Sandstone",
    materialLowPerSf: 9,
    materialHighPerSf: 15,
    installedLowPerSf: 28,
    installedHighPerSf: 46,
    defaultWastePct: 12,
    notes: "Sandstone veneer and structural. Pacific NW market rate.",
  },
  {
    id: "cultured_stone",
    label: "Cultured / Manufactured Stone",
    materialLowPerSf: 5,
    materialHighPerSf: 9,
    installedLowPerSf: 18,
    installedHighPerSf: 30,
    defaultWastePct: 10,
    notes: "Eldorado Stone, ProVia, or equivalent. Oregon distributor pricing.",
  },
  {
    id: "flagstone",
    label: "Flagstone (Slate / Bluestone)",
    materialLowPerSf: 8,
    materialHighPerSf: 15,
    installedLowPerSf: 26,
    installedHighPerSf: 42,
    defaultWastePct: 15,
    notes: "Flagstone for veneer/patio applications. Oregon market 2024–25.",
  },
  {
    id: "stone_custom",
    label: "Custom / Other Stone",
    materialLowPerSf: 0,
    materialHighPerSf: 0,
    installedLowPerSf: 0,
    installedHighPerSf: 0,
    defaultWastePct: 15,
    notes: "Enter your own price per SF.",
  },
];

export interface Opening {
  id: string;
  label: string;
  widthFt: number;
  heightFt: number;
}

export interface CalcResult {
  grossAreaSf: number;
  openingsAreaSf: number;
  netAreaSf: number;
  baseQuantity: number;
  wasteQuantity: number;
  totalQuantity: number;
  wastePct: number;
  courses?: number;
  blocksPerSf?: number;
  unit: string;
  priceLow?: number;
  priceHigh?: number;
  installedLow?: number;
  installedHigh?: number;
  category: MaterialCategory;
  breakdown: string[];
}

function roundUp(n: number, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.ceil(n * factor) / factor;
}

export function calcCmu(opts: {
  lengthFt: number;
  heightFt: number;
  openings: Opening[];
  nominalLengthIn: number;
  nominalHeightIn: number;
  wastePct: number;
}): CalcResult {
  const { lengthFt, heightFt, openings, nominalLengthIn, nominalHeightIn, wastePct } = opts;

  const grossAreaSf = lengthFt * heightFt;
  const openingsAreaSf = openings.reduce((sum, o) => sum + o.widthFt * o.heightFt, 0);
  const netAreaSf = Math.max(0, grossAreaSf - openingsAreaSf);

  const blocksPerSf = (12 / nominalLengthIn) * (12 / nominalHeightIn);
  const baseQuantity = netAreaSf * blocksPerSf;
  const wasteQuantity = baseQuantity * (wastePct / 100);
  const totalQuantity = Math.ceil(baseQuantity + wasteQuantity);

  const courses = Math.ceil((heightFt * 12) / nominalHeightIn);

  const breakdown = [
    `Gross area: ${grossAreaSf.toFixed(1)} SF`,
    `Openings deducted: ${openingsAreaSf.toFixed(1)} SF`,
    `Net area: ${netAreaSf.toFixed(1)} SF`,
    `Block face: ${nominalLengthIn}"L × ${nominalHeightIn}"H (nominal)`,
    `Coverage rate: ${blocksPerSf.toFixed(3)} blocks/SF`,
    `Base count: ${Math.ceil(baseQuantity)} blocks`,
    `Waste (${wastePct}%): ${Math.ceil(wasteQuantity)} blocks`,
    `Wall courses: ${courses} (@ ${nominalHeightIn}" each)`,
  ];

  return {
    grossAreaSf,
    openingsAreaSf,
    netAreaSf,
    baseQuantity: Math.ceil(baseQuantity),
    wasteQuantity: Math.ceil(wasteQuantity),
    totalQuantity,
    wastePct,
    courses,
    blocksPerSf: roundUp(blocksPerSf, 3),
    unit: "blocks",
    category: "cmu",
    breakdown,
  };
}

export function calcBrick(opts: {
  lengthFt: number;
  heightFt: number;
  openings: Opening[];
  nominalLengthIn: number;
  nominalHeightIn: number;
  wythes: 1 | 2;
  wastePct: number;
}): CalcResult {
  const { lengthFt, heightFt, openings, nominalLengthIn, nominalHeightIn, wythes, wastePct } = opts;

  const grossAreaSf = lengthFt * heightFt;
  const openingsAreaSf = openings.reduce((sum, o) => sum + o.widthFt * o.heightFt, 0);
  const netAreaSf = Math.max(0, grossAreaSf - openingsAreaSf);

  const bricksPerSfSingle = (12 / nominalLengthIn) * (12 / nominalHeightIn);
  const bricksPerSf = bricksPerSfSingle * wythes;

  const baseQuantity = netAreaSf * bricksPerSf;
  const wasteQuantity = baseQuantity * (wastePct / 100);
  const totalQuantity = Math.ceil(baseQuantity + wasteQuantity);

  const courses = Math.ceil((heightFt * 12) / nominalHeightIn);

  const breakdown = [
    `Gross area: ${grossAreaSf.toFixed(1)} SF`,
    `Openings deducted: ${openingsAreaSf.toFixed(1)} SF`,
    `Net area: ${netAreaSf.toFixed(1)} SF`,
    `Brick nominal: ${nominalLengthIn}"L × ${nominalHeightIn}"H`,
    `Coverage: ${bricksPerSfSingle.toFixed(2)} bricks/SF × ${wythes} wythe(s) = ${bricksPerSf.toFixed(2)}/SF`,
    `Base count: ${Math.ceil(baseQuantity)} bricks`,
    `Waste (${wastePct}%): ${Math.ceil(wasteQuantity)} bricks`,
    `Courses: ${courses} (@ ${nominalHeightIn.toFixed(3)}" each)`,
  ];

  return {
    grossAreaSf,
    openingsAreaSf,
    netAreaSf,
    baseQuantity: Math.ceil(baseQuantity),
    wasteQuantity: Math.ceil(wasteQuantity),
    totalQuantity,
    wastePct,
    courses,
    blocksPerSf: roundUp(bricksPerSf, 3),
    unit: "bricks",
    category: "brick",
    breakdown,
  };
}

export function calcStone(opts: {
  lengthFt: number;
  heightFt: number;
  openings: Opening[];
  wastePct: number;
  materialLowPerSf: number;
  materialHighPerSf: number;
  installedLowPerSf: number;
  installedHighPerSf: number;
}): CalcResult {
  const {
    lengthFt, heightFt, openings, wastePct,
    materialLowPerSf, materialHighPerSf,
    installedLowPerSf, installedHighPerSf,
  } = opts;

  const grossAreaSf = lengthFt * heightFt;
  const openingsAreaSf = openings.reduce((sum, o) => sum + o.widthFt * o.heightFt, 0);
  const netAreaSf = Math.max(0, grossAreaSf - openingsAreaSf);

  const baseQuantity = netAreaSf;
  const wasteQuantity = baseQuantity * (wastePct / 100);
  const totalQuantity = Math.ceil(baseQuantity + wasteQuantity);

  const priceLow = totalQuantity * materialLowPerSf;
  const priceHigh = totalQuantity * materialHighPerSf;
  const installedLow = netAreaSf * installedLowPerSf;
  const installedHigh = netAreaSf * installedHighPerSf;

  const breakdown = [
    `Gross area: ${grossAreaSf.toFixed(1)} SF`,
    `Openings deducted: ${openingsAreaSf.toFixed(1)} SF`,
    `Net face area: ${netAreaSf.toFixed(1)} SF`,
    `Waste (${wastePct}%): ${wasteQuantity.toFixed(1)} SF`,
    `Order quantity: ${totalQuantity} SF`,
    `Material cost (Oregon): $${materialLowPerSf}–$${materialHighPerSf}/SF`,
    `Installed cost (Oregon): $${installedLowPerSf}–$${installedHighPerSf}/SF`,
  ];

  return {
    grossAreaSf,
    openingsAreaSf,
    netAreaSf,
    baseQuantity,
    wasteQuantity,
    totalQuantity,
    wastePct,
    unit: "SF",
    priceLow,
    priceHigh,
    installedLow,
    installedHigh,
    category: "stone",
    breakdown,
  };
}

export function calcCustom(opts: {
  lengthFt: number;
  heightFt: number;
  openings: Opening[];
  unitLengthIn: number;
  unitHeightIn: number;
  mortarJointIn: number;
  wythes: 1 | 2;
  wastePct: number;
  pricePerUnit: number;
}): CalcResult {
  const {
    lengthFt, heightFt, openings,
    unitLengthIn, unitHeightIn, mortarJointIn,
    wythes, wastePct, pricePerUnit,
  } = opts;

  const nomL = unitLengthIn + mortarJointIn;
  const nomH = unitHeightIn + mortarJointIn;

  const grossAreaSf = lengthFt * heightFt;
  const openingsAreaSf = openings.reduce((sum, o) => sum + o.widthFt * o.heightFt, 0);
  const netAreaSf = Math.max(0, grossAreaSf - openingsAreaSf);

  const unitsPerSf = ((12 / nomL) * (12 / nomH)) * wythes;
  const baseQuantity = netAreaSf * unitsPerSf;
  const wasteQuantity = baseQuantity * (wastePct / 100);
  const totalQuantity = Math.ceil(baseQuantity + wasteQuantity);

  const courses = Math.ceil((heightFt * 12) / nomH);
  const priceLow = totalQuantity * pricePerUnit;

  const breakdown = [
    `Gross area: ${grossAreaSf.toFixed(1)} SF`,
    `Openings deducted: ${openingsAreaSf.toFixed(1)} SF`,
    `Net area: ${netAreaSf.toFixed(1)} SF`,
    `Unit actual: ${unitLengthIn}"L × ${unitHeightIn}"H`,
    `Mortar joint: ${mortarJointIn}"`,
    `Nominal (incl. joint): ${nomL.toFixed(3)}"L × ${nomH.toFixed(3)}"H`,
    `Coverage: ${unitsPerSf.toFixed(3)} units/SF × ${wythes} wythe(s)`,
    `Base count: ${Math.ceil(baseQuantity)} units`,
    `Waste (${wastePct}%): ${Math.ceil(wasteQuantity)} units`,
    `Courses: ${courses}`,
  ];

  return {
    grossAreaSf,
    openingsAreaSf,
    netAreaSf,
    baseQuantity: Math.ceil(baseQuantity),
    wasteQuantity: Math.ceil(wasteQuantity),
    totalQuantity,
    wastePct,
    courses,
    blocksPerSf: roundUp(unitsPerSf, 3),
    unit: "units",
    priceLow,
    priceHigh: priceLow,
    category: "custom",
    breakdown,
  };
}

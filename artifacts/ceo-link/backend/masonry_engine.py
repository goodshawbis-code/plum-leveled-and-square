"""Neural Masonry Count Engine — Python port of masonry-calculator.ts
Ported from artifacts/office/src/lib/masonry-calculator.ts for the CEO-Link pod."""
import math
from typing import List, Optional
from pydantic import BaseModel

class Opening(BaseModel):
    id: str = ""
    label: str = ""
    widthFt: float = 0
    heightFt: float = 0

class CalcResult(BaseModel):
    grossAreaSf: float
    openingsAreaSf: float
    netAreaSf: float
    baseQuantity: int
    wasteQuantity: int
    totalQuantity: int
    wastePct: float
    courses: Optional[int] = None
    blocksPerSf: Optional[float] = None
    unit: str
    priceLow: Optional[float] = None
    priceHigh: Optional[float] = None
    installedLow: Optional[float] = None
    installedHigh: Optional[float] = None
    category: str
    breakdown: List[str]

CMU_PRESETS = [
    {"id": "cmu8std", "label": 'Standard 8" CMU', "nominalLengthIn": 16, "nominalHeightIn": 8, "nominalDepthIn": 8, "defaultWastePct": 5},
    {"id": "cmu6std", "label": '6" CMU', "nominalLengthIn": 16, "nominalHeightIn": 8, "nominalDepthIn": 6, "defaultWastePct": 5},
    {"id": "cmu12std", "label": '12" CMU', "nominalLengthIn": 16, "nominalHeightIn": 8, "nominalDepthIn": 12, "defaultWastePct": 5},
    {"id": "cmu8split", "label": 'Split Face 8" CMU', "nominalLengthIn": 16, "nominalHeightIn": 8, "nominalDepthIn": 8, "defaultWastePct": 7},
    {"id": "cmu8half", "label": 'Half High 8" CMU', "nominalLengthIn": 16, "nominalHeightIn": 4, "nominalDepthIn": 8, "defaultWastePct": 7},
]

BRICK_PRESETS = [
    {"id": "brick_modular", "label": "Standard Modular", "nominalLengthIn": 8, "nominalHeightIn": 2.667, "nominalDepthIn": 4, "defaultWastePct": 10},
    {"id": "brick_king", "label": "King Size", "nominalLengthIn": 10, "nominalHeightIn": 2.75, "nominalDepthIn": 4, "defaultWastePct": 10},
    {"id": "brick_utility", "label": "Utility", "nominalLengthIn": 12, "nominalHeightIn": 2.75, "nominalDepthIn": 4, "defaultWastePct": 10},
    {"id": "brick_queen", "label": "Queen", "nominalLengthIn": 10, "nominalHeightIn": 3, "nominalDepthIn": 4, "defaultWastePct": 10},
]

STONE_PRESETS = [
    {"id": "basalt", "label": "Basalt (Oregon Native)", "materialLowPerSf": 8, "materialHighPerSf": 14, "installedLowPerSf": 28, "installedHighPerSf": 42, "defaultWastePct": 15},
    {"id": "columbia_basalt", "label": "Columbia River Basalt Ledge", "materialLowPerSf": 9, "materialHighPerSf": 16, "installedLowPerSf": 30, "installedHighPerSf": 46, "defaultWastePct": 15},
    {"id": "fieldstone", "label": "Fieldstone / River Rock", "materialLowPerSf": 6, "materialHighPerSf": 12, "installedLowPerSf": 32, "installedHighPerSf": 52, "defaultWastePct": 20},
    {"id": "granite", "label": "Granite (Regional)", "materialLowPerSf": 15, "materialHighPerSf": 25, "installedLowPerSf": 38, "installedHighPerSf": 60, "defaultWastePct": 10},
    {"id": "cultured_stone", "label": "Cultured / Manufactured Stone", "materialLowPerSf": 5, "materialHighPerSf": 9, "installedLowPerSf": 18, "installedHighPerSf": 30, "defaultWastePct": 10},
]


def calc_cmu(length_ft: float, height_ft: float, openings: List[Opening],
             nominal_length_in: float, nominal_height_in: float, waste_pct: float) -> CalcResult:
    gross = length_ft * height_ft
    openings_area = sum(o.widthFt * o.heightFt for o in openings)
    net = max(0.0, gross - openings_area)
    blocks_per_sf = (12 / nominal_length_in) * (12 / nominal_height_in)
    base_qty = net * blocks_per_sf
    waste_qty = base_qty * (waste_pct / 100)
    total = math.ceil(base_qty + waste_qty)
    courses = math.ceil((height_ft * 12) / nominal_height_in)
    breakdown = [
        f"Gross area: {gross:.1f} SF",
        f"Openings deducted: {openings_area:.1f} SF",
        f"Net area: {net:.1f} SF",
        f'Block face: {nominal_length_in}"L x {nominal_height_in}"H (nominal)',
        f"Coverage rate: {blocks_per_sf:.3f} blocks/SF",
        f"Base count: {math.ceil(base_qty)} blocks",
        f"Waste ({waste_pct}%): {math.ceil(waste_qty)} blocks",
        f"Wall courses: {courses} (@ {nominal_height_in}\" each)",
    ]
    return CalcResult(
        grossAreaSf=gross, openingsAreaSf=openings_area, netAreaSf=net,
        baseQuantity=math.ceil(base_qty), wasteQuantity=math.ceil(waste_qty),
        totalQuantity=total, wastePct=waste_pct, courses=courses,
        blocksPerSf=round(blocks_per_sf, 3), unit="blocks", category="cmu", breakdown=breakdown
    )


def calc_brick(length_ft: float, height_ft: float, openings: List[Opening],
               nominal_length_in: float, nominal_height_in: float, wythes: int, waste_pct: float) -> CalcResult:
    gross = length_ft * height_ft
    openings_area = sum(o.widthFt * o.heightFt for o in openings)
    net = max(0.0, gross - openings_area)
    bricks_single = (12 / nominal_length_in) * (12 / nominal_height_in)
    bricks_per_sf = bricks_single * wythes
    base_qty = net * bricks_per_sf
    waste_qty = base_qty * (waste_pct / 100)
    total = math.ceil(base_qty + waste_qty)
    courses = math.ceil((height_ft * 12) / nominal_height_in)
    breakdown = [
        f"Gross area: {gross:.1f} SF",
        f"Openings deducted: {openings_area:.1f} SF",
        f"Net area: {net:.1f} SF",
        f'Brick nominal: {nominal_length_in}"L x {nominal_height_in}"H',
        f"Coverage: {bricks_single:.2f} bricks/SF x {wythes} wythe(s) = {bricks_per_sf:.2f}/SF",
        f"Base count: {math.ceil(base_qty)} bricks",
        f"Waste ({waste_pct}%): {math.ceil(waste_qty)} bricks",
        f"Courses: {courses} (@ {nominal_height_in:.3f}\" each)",
    ]
    return CalcResult(
        grossAreaSf=gross, openingsAreaSf=openings_area, netAreaSf=net,
        baseQuantity=math.ceil(base_qty), wasteQuantity=math.ceil(waste_qty),
        totalQuantity=total, wastePct=waste_pct, courses=courses,
        blocksPerSf=round(bricks_per_sf, 3), unit="bricks", category="brick", breakdown=breakdown
    )


def calc_stone(length_ft: float, height_ft: float, openings: List[Opening], waste_pct: float,
               material_low: float, material_high: float, installed_low: float, installed_high: float) -> CalcResult:
    gross = length_ft * height_ft
    openings_area = sum(o.widthFt * o.heightFt for o in openings)
    net = max(0.0, gross - openings_area)
    base_qty = net
    waste_qty = base_qty * (waste_pct / 100)
    total = math.ceil(base_qty + waste_qty)
    price_low = total * material_low
    price_high = total * material_high
    inst_low = net * installed_low
    inst_high = net * installed_high
    breakdown = [
        f"Gross area: {gross:.1f} SF",
        f"Openings deducted: {openings_area:.1f} SF",
        f"Net face area: {net:.1f} SF",
        f"Waste ({waste_pct}%): {waste_qty:.1f} SF",
        f"Order quantity: {total} SF",
        f"Material cost (Oregon): ${material_low}-${material_high}/SF",
        f"Installed cost (Oregon): ${installed_low}-${installed_high}/SF",
    ]
    return CalcResult(
        grossAreaSf=gross, openingsAreaSf=openings_area, netAreaSf=net,
        baseQuantity=int(base_qty), wasteQuantity=int(waste_qty),
        totalQuantity=total, wastePct=waste_pct, unit="SF",
        priceLow=price_low, priceHigh=price_high,
        installedLow=inst_low, installedHigh=inst_high,
        category="stone", breakdown=breakdown
    )

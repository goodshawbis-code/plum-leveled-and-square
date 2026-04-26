import base64
import io
import json
import os
import re
from datetime import datetime

import cv2
import fitz  # PyMuPDF
import numpy as np
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

app = FastAPI(title="Blueprint Analysis Pipeline v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL", "https://api.openai.com/v1")
API_KEY = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", "placeholder")
client = OpenAI(base_url=BASE_URL, api_key=API_KEY)

# ─── Brand colors ────────────────────────────────────────────────────────────
BRAND_ORANGE = colors.HexColor("#d97706")
BRAND_DARK   = colors.HexColor("#1c1917")
BRAND_LIGHT  = colors.HexColor("#fef3c7")
BRAND_GRAY   = colors.HexColor("#78716c")
BRAND_RED    = colors.HexColor("#dc2626")
BRAND_GREEN  = colors.HexColor("#16a34a")

# ─── Safety topic library ─────────────────────────────────────────────────────
SAFETY_TOPICS = {
    "general": [
        {
            "en": "Eye & Face Protection",
            "es": "Protección de Ojos y Cara",
            "body_en": "Wear safety glasses or goggles when cutting, chipping, or grinding masonry. Flying debris can cause permanent eye damage. Side shields are required when working near overhead hazards.",
            "body_es": "Use lentes o gafas de seguridad al cortar, picar o esmerilar mampostería. Los escombros voladores pueden causar daños permanentes. Se requieren protectores laterales cerca de peligros en altura.",
        },
        {
            "en": "Heat Illness Prevention",
            "es": "Prevención de Enfermedades por Calor",
            "body_en": "Drink water every 15–20 minutes even if not thirsty. Take shade breaks. Signs of heat exhaustion: heavy sweating, weakness, dizziness. Report symptoms immediately.",
            "body_es": "Beba agua cada 15–20 min aunque no tenga sed. Descanse a la sombra. Señales de agotamiento: sudoración intensa, debilidad, mareo. Reporte los síntomas de inmediato.",
        },
        {
            "en": "Hand & Tool Safety",
            "es": "Seguridad de Manos y Herramientas",
            "body_en": "Wear cut-resistant gloves when handling block, brick, or cut stone. Keep blades sharp — dull tools require more force and slip. Never use a damaged tool; tag it out of service.",
            "body_es": "Use guantes resistentes al corte al manejar bloques o piedra. Mantenga las hojas afiladas. Nunca use una herramienta dañada; etiquétela fuera de servicio.",
        },
    ],
    "multi_story": [
        {
            "en": "Scaffold Safety (OSHA 1926.451)",
            "es": "Seguridad en Andamios (OSHA 1926.451)",
            "body_en": "Inspect scaffolding before every shift. Never overload a platform — verify the load rating. Maintain three points of contact when climbing. All platforms above 10 ft require guardrails and toeboards.",
            "body_es": "Inspeccione los andamios antes de cada turno. Verifique la capacidad de carga. Mantenga tres puntos de contacto al subir. Las plataformas a más de 10 pies requieren barandillas y rodapiés.",
        },
        {
            "en": "Fall Protection (OSHA 1926.502)",
            "es": "Protección Contra Caídas (OSHA 1926.502)",
            "body_en": "Personal fall arrest systems required above 6 feet. Inspect harness and lanyards before each use — look for cuts, fraying, and damaged hardware. 100% tie-off required on all scaffold tiers.",
            "body_es": "Se requieren sistemas de detención de caídas a más de 6 pies. Inspeccione el arnés antes de usarlo. Se requiere sujeción al 100% en todos los niveles del andamio.",
        },
    ],
}

SAFETY_LINE_ITEMS = {
    "scaffold_safety": {
        "label": "Scaffold Safety — OSHA Compliance Setup",
        "label_es": "Seguridad en Andamios — Cumplimiento OSHA",
        "note_en": "Includes OSHA 1926.451 guardrail installation, daily inspection log, and competent person designation.",
        "note_es": "Incluye instalación de barandilla OSHA 1926.451, registro de inspección diaria y designación de persona competente.",
        "costLow": 850, "costHigh": 1400,
    },
    "fall_protection": {
        "label": "Fall Protection Equipment & Training",
        "label_es": "Equipo de Protección Contra Caídas y Capacitación",
        "note_en": "Harnesses, anchor points, self-retracting lanyards, and OSHA 1926.502 training for all crew members.",
        "note_es": "Arneses, puntos de anclaje, cables de retracción automática y capacitación OSHA 1926.502 para toda la cuadrilla.",
        "costLow": 600, "costHigh": 1000,
    },
}

MATERIALS_ES = {
    "Culture Stone / Veneer":  "Piedra Cultivo / Enchape",
    "CMU Block (Standard)":    "Bloque CMU (Estándar)",
    "CMU Block (Split-Face)":  "Bloque CMU (Cara Dividida)",
    "Brick (Standard)":        "Ladrillo (Estándar)",
    "Brick (Split-Face)":      "Ladrillo (Cara Dividida)",
    "Concrete Footing":        "Cimiento de Concreto",
    "Grout Fill":              "Relleno de Lechada",
    "Reinforcing Steel":       "Acero de Refuerzo",
    "Mortar":                  "Mortero",
    "Concrete Slab":           "Losa de Concreto",
    "Other Masonry":           "Otra Mampostería",
    "Scaffold Safety — OSHA Compliance Setup": "Seguridad en Andamios — Cumplimiento OSHA",
    "Fall Protection Equipment & Training":    "Equipo de Protección Contra Caídas y Capacitación",
}

# ─── AI analysis prompt (v2) ──────────────────────────────────────────────────
def build_analysis_prompt(geometry_hints: str, user_scale: str) -> str:
    scale_instruction = (
        f'The user has pre-confirmed the drawing scale as: **{user_scale}**. Use this scale for all measurements.'
        if user_scale
        else "Detect the scale bar in the drawing if visible."
    )
    return f"""You are a licensed masonry estimator and blueprint reader. Analyze this blueprint quadrant with the precision of a 30-year field veteran.

SCALE: {scale_instruction}

OPENCV GEOMETRY HINTS (pre-computed):
{geometry_hints}
Use these hints to cross-check your visual findings.

MATERIAL RECOGNITION GUIDE — standard architectural hatch patterns:
• Brick: parallel diagonal lines (45°) WITH a stippled/dotted texture between them
• CMU (Block): hollow rectangles OR diagonal cross-hatching (X pattern in cells)
• Culture Stone / Veneer: irregular rubble-like outlines or labeled "STONE VENEER"
• Concrete Slab: fine uniform stippling (dots) inside a solid boundary line
• Concrete Footing: labeled "FTG", "CONC FTG" — typically at foundation level
• Wood Studs: empty cavities with a single X or parallel lines with NO hatching — EXCLUDE from masonry totals
• Insulation: wavy lines — EXCLUDE from masonry totals

STEP 1 — SCALE & LEGEND
Find and report the drawing scale (e.g. "1/4\\"=1\\'-0\\""). Note if a symbol legend is present.

STEP 2 — MASONRY WALLS (gross area before deductions)
For each masonry wall segment, identify:
- material: culture_stone | cmu_standard | cmu_splitface | brick_standard | brick_splitface | concrete_footing | other
- bondPattern (brick only): running | stack | diagonal | herringbone | unknown
- linearFeet: length of wall face
- heightFeet: wall height (from drawing or typical assumption: 9 ft if not shown)
- grossAreaSF: linearFeet × heightFeet
- location: brief description (e.g. "north exterior wall")
- confidenceScore: integer 0–100

STEP 3 — OPENINGS (DEDUCTIONS)
Identify all windows and doors within masonry walls. For each:
- openingType: window | door | opening
- widthFeet, heightFeet, areaSF
- wallMaterial: which masonry material this opening is in
- location: brief description
A standard window ≈ 3×4 ft (12 SF); a standard door ≈ 3×7 ft (21 SF).

STEP 4 — CONCRETE SLABS
Identify slab thickness callouts (e.g. "4\\" CONC SLAB", "6\\" SOG").
For each: thicknessInches, areaSquareFeet, location, confidenceScore.

STEP 5 — MULTI-STORY INDICATOR
Does this drawing show walls taller than 15 ft, multiple floor levels, or scaffold/shoring callouts?
Report: isMultiStory (true/false), maxWallHeightFeet (best estimate).

STEP 6 — DIMENSIONS
List any explicit dimension strings visible (e.g. "32\\'-0\\"").

Return ONLY valid JSON — no markdown, no code fences:
{{
  "scale": "1/4\\" = 1\\'-0\\"",
  "hasScaleBar": true,
  "hasMasonryWork": true,
  "walls": [
    {{
      "material": "brick_standard",
      "bondPattern": "running",
      "linearFeet": 32.0,
      "heightFeet": 9.0,
      "grossAreaSF": 288.0,
      "location": "north exterior wall",
      "confidenceScore": 85
    }}
  ],
  "openings": [
    {{
      "openingType": "window",
      "widthFeet": 3.0,
      "heightFeet": 4.0,
      "areaSF": 12.0,
      "wallMaterial": "brick_standard",
      "location": "north wall, 2 windows"
    }}
  ],
  "slabs": [
    {{
      "thicknessInches": 4,
      "areaSquareFeet": 800,
      "location": "main floor slab",
      "confidenceScore": 70
    }}
  ],
  "isMultiStory": false,
  "maxWallHeightFeet": 9.0,
  "dimensionStrings": ["32\\'-0\\"", "24\\'-6\\""],
  "notes": "running bond brick on north and east elevations, 4 windows detected"
}}"""

# ─── Unit costs & constants ───────────────────────────────────────────────────
UNIT_COSTS = {
    "culture_stone":     {"low": 18,   "high": 22,  "unit": "SF", "label": "Culture Stone / Veneer"},
    "cmu_standard":      {"low": 14,   "high": 20,  "unit": "SF", "label": "CMU Block (Standard)"},
    "cmu_splitface":     {"low": 18,   "high": 26,  "unit": "SF", "label": "CMU Block (Split-Face)"},
    "brick_standard":    {"low": 18.5, "high": 26,  "unit": "SF", "label": "Brick (Standard)"},
    "brick_splitface":   {"low": 24,   "high": 36,  "unit": "SF", "label": "Brick (Split-Face)"},
    "concrete_footing":  {"low": 30,   "high": 46,  "unit": "LF", "label": "Concrete Footing"},
    "grout_fill":        {"low": 3.5,  "high": 5.5, "unit": "SF", "label": "Grout Fill"},
    "rebar":             {"low": 2.25, "high": 3.75,"unit": "SF", "label": "Reinforcing Steel"},
    "mortar":            {"low": 1.75, "high": 2.75,"unit": "SF", "label": "Mortar"},
    "concrete":          {"low": 8,    "high": 14,  "unit": "SF", "label": "Concrete Slab"},
    "other":             {"low": 10,   "high": 25,  "unit": "SF", "label": "Other Masonry"},
}

CMU_GROUT_CF_PER_SF   = 0.45
CMU_BLOCKS_PER_SF     = 1.125
BRICK_PER_SF          = 6.75
MORTAR_BAGS_PER_SF_CMU   = 0.125
MORTAR_BAGS_PER_SF_BRICK = 0.2
CONCRETE_PUMP_RESIDUE_CY = 0.5  # flat add-on per concrete pour for pump/spillage

# Bond-pattern waste factors
BRICK_WASTE = {
    "running":      0.05,
    "stack":        0.07,
    "diagonal":     0.10,
    "herringbone":  0.10,
    "unknown":      0.07,
}

BASE_WASTE = {
    "culture_stone":    0.10,
    "cmu_standard":     0.05,
    "cmu_splitface":    0.05,
    "concrete_footing": 0.08,
    "grout_fill":       0.05,
    "rebar":            0.05,
    "mortar":           0.10,
    "concrete":         0.10,
    "other":            0.08,
}

# ─── OpenCV geometric pre-analysis ───────────────────────────────────────────
def opencv_geometric_analysis(img_bgr: np.ndarray) -> dict:
    """Run Hough line detection and contour finding.
    Returns structured geometry hints to pass into the AI prompt."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, threshold1=50, threshold2=150)

    # Hough line detection — find long straight lines (likely walls)
    min_wall_len = int(min(h, w) * 0.08)  # at least 8% of image dimension
    lines = cv2.HoughLinesP(
        edges, rho=1, theta=np.pi / 180,
        threshold=60, minLineLength=min_wall_len, maxLineGap=20
    )
    long_lines = []
    if lines is not None:
        for ln in lines:
            x1, y1, x2, y2 = ln[0]
            length_px = float(np.hypot(x2 - x1, y2 - y1))
            angle = float(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
            long_lines.append({
                "lengthPx": round(length_px, 1),
                "angleDeg": round(angle, 1),
                "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            })
    long_lines.sort(key=lambda l: l["lengthPx"], reverse=True)
    top_lines = long_lines[:12]

    # Contour finding — identify closed regions (slabs, wall areas)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    closed_regions = []
    min_area = (h * w) * 0.005  # at least 0.5% of image
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area:
            x, y, cw, ch = cv2.boundingRect(cnt)
            perimeter = cv2.arcLength(cnt, closed=True)
            compactness = (4 * np.pi * area / (perimeter ** 2)) if perimeter > 0 else 0
            closed_regions.append({
                "areaPx": round(float(area)),
                "boundingBox": [x, y, cw, ch],
                "compactness": round(float(compactness), 3),
            })
    closed_regions.sort(key=lambda r: r["areaPx"], reverse=True)
    top_regions = closed_regions[:8]

    # Classify predominant line orientations
    horizontal = sum(1 for l in long_lines if abs(l["angleDeg"]) < 15 or abs(l["angleDeg"]) > 165)
    vertical   = sum(1 for l in long_lines if 75 < abs(l["angleDeg"]) < 105)
    diagonal   = len(long_lines) - horizontal - vertical

    return {
        "imageSizePx": [w, h],
        "totalLongLines": len(long_lines),
        "horizontalLines": horizontal,
        "verticalLines": vertical,
        "diagonalLines": diagonal,
        "topLines": top_lines,
        "closedRegionsFound": len(closed_regions),
        "topRegions": top_regions,
    }


def geometry_hints_text(geo: dict) -> str:
    lines = geo.get("topLines", [])
    regions = geo.get("topRegions", [])
    h_count = geo.get("horizontalLines", 0)
    v_count = geo.get("verticalLines", 0)
    d_count = geo.get("diagonalLines", 0)
    lines_summary = (
        f"{geo['totalLongLines']} wall-candidate lines detected "
        f"(H:{h_count} V:{v_count} D:{d_count}). "
    )
    if lines:
        longest = lines[0]["lengthPx"]
        lines_summary += f"Longest line: {longest:.0f}px."
    regions_summary = (
        f"{geo['closedRegionsFound']} closed regions found."
    )
    if regions:
        largest_area = regions[0]["areaPx"]
        img_area = geo["imageSizePx"][0] * geo["imageSizePx"][1]
        pct = largest_area / img_area * 100
        regions_summary += f" Largest region covers {pct:.1f}% of quadrant."
    return f"{lines_summary} {regions_summary}"


# ─── PDF → quadrant images ────────────────────────────────────────────────────
def pdf_to_quadrant_images(pdf_bytes: bytes, dpi: int = 200) -> list[dict]:
    quadrant_images = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for page_num in range(len(doc)):
        page = doc[page_num]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        h, w = img_bgr.shape[:2]
        mid_h, mid_w = h // 2, w // 2

        quadrants = [
            ("TL", img_bgr[0:mid_h, 0:mid_w]),
            ("TR", img_bgr[0:mid_h, mid_w:w]),
            ("BL", img_bgr[mid_h:h, 0:mid_w]),
            ("BR", img_bgr[mid_h:h, mid_w:w]),
        ]

        for label, quad in quadrants:
            # Run OpenCV geometry analysis on each quadrant
            geo = opencv_geometric_analysis(quad)
            success, encoded = cv2.imencode(".png", quad)
            if success:
                b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")
                quadrant_images.append({
                    "page": page_num + 1,
                    "quadrant": label,
                    "b64": b64,
                    "width": quad.shape[1],
                    "height": quad.shape[0],
                    "geometry": geo,
                })

    doc.close()
    return quadrant_images


# ─── AI analysis ─────────────────────────────────────────────────────────────
def analyze_quadrant(b64: str, page: int, quadrant: str, geometry: dict, user_scale: str) -> dict:
    hints_text = geometry_hints_text(geometry)
    prompt = build_analysis_prompt(hints_text, user_scale)
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64}",
                                "detail": "high",
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        raw = response.choices[0].message.content or "{}"
        json_match = re.search(r"\{[\s\S]*\}", raw)
        data = json.loads(json_match.group(0) if json_match else raw)
        data["page"] = page
        data["quadrant"] = quadrant
        data["geometryHints"] = hints_text
        return data
    except Exception as e:
        return {
            "page": page,
            "quadrant": quadrant,
            "error": str(e),
            "hasMasonryWork": False,
            "walls": [], "openings": [], "slabs": [],
            "isMultiStory": False,
        }


# ─── Masonry calculation engine v2 ───────────────────────────────────────────
def run_calculation_engine(quadrant_results: list[dict], project_info: dict) -> dict:
    material_totals: dict[str, dict] = {}
    opening_deductions: dict[str, float] = {}  # mat_type → total opening SF
    slab_totals: list[dict] = []
    all_notes: list[str] = []
    scale_found = None
    is_multi_story = False
    max_wall_height = 0.0
    avg_confidence: list[int] = []

    for qr in quadrant_results:
        if qr.get("error"):
            continue
        if qr.get("scale") and not scale_found:
            scale_found = qr["scale"]
        if qr.get("isMultiStory"):
            is_multi_story = True
        if qr.get("maxWallHeightFeet", 0) > max_wall_height:
            max_wall_height = float(qr["maxWallHeightFeet"])
        for note in (qr.get("notes", []) if isinstance(qr.get("notes"), list) else ([qr["notes"]] if qr.get("notes") else [])):
            if note and note not in all_notes:
                all_notes.append(note)

        # ── Openings: accumulate deductions by material ──────────────────────
        for opening in qr.get("openings", []):
            mat = opening.get("wallMaterial", "other")
            sf = float(opening.get("areaSF") or 0)
            if sf > 0:
                opening_deductions[mat] = opening_deductions.get(mat, 0) + sf

        # ── Walls: accumulate gross area + bond pattern ───────────────────────
        for wall in qr.get("walls", []):
            mat = wall.get("material", "other")
            gross_sf = float(wall.get("grossAreaSF") or (
                float(wall.get("areaSquareFeet") or 0)  # backward compat
            ))
            lf = float(wall.get("linearFeet") or 0)
            bond = wall.get("bondPattern", "unknown")
            conf = int(wall.get("confidenceScore") or 70)
            avg_confidence.append(conf)

            if mat not in material_totals:
                material_totals[mat] = {
                    "grossSF": 0.0, "lf": 0.0,
                    "bondPatterns": {}, "locations": [],
                }
            material_totals[mat]["grossSF"] += gross_sf
            material_totals[mat]["lf"] += lf
            bp = material_totals[mat]["bondPatterns"]
            bp[bond] = bp.get(bond, 0) + gross_sf
            loc = wall.get("location", "")
            if loc and loc not in material_totals[mat]["locations"]:
                material_totals[mat]["locations"].append(loc)

        for slab in qr.get("slabs", []):
            slab_totals.append(slab)

    # ── Build line items ───────────────────────────────────────────────────────
    line_items = []
    grand_low = 0.0
    grand_high = 0.0

    for mat, totals in material_totals.items():
        costs = UNIT_COSTS.get(mat, UNIT_COSTS["other"])
        gross_sf = totals["grossSF"]
        lf = totals["lf"]

        # Compute deduction
        deduction_sf = opening_deductions.get(mat, 0.0)
        net_sf = max(0.0, gross_sf - deduction_sf)

        # Bond-pattern waste (brick)
        if mat in ("brick_standard", "brick_splitface"):
            dominant_bond = max(totals["bondPatterns"], key=totals["bondPatterns"].get, default="unknown")
            waste = BRICK_WASTE.get(dominant_bond, BRICK_WASTE["unknown"])
        else:
            waste = BASE_WASTE.get(mat, 0.08)

        if net_sf > 0:
            qty = net_sf * (1 + waste)
            unit = "SF"
        elif lf > 0:
            qty = lf * (1 + waste)
            unit = "LF"
        else:
            continue

        cost_low  = qty * costs["low"]
        cost_high = qty * costs["high"]
        grand_low  += cost_low
        grand_high += cost_high

        item: dict = {
            "material":     mat,
            "label":        costs["label"],
            "label_es":     MATERIALS_ES.get(costs["label"], costs["label"]),
            "grossQty":     round(gross_sf if net_sf > 0 else lf, 1),
            "deductionSF":  round(deduction_sf, 1),
            "netQty":       round(net_sf if net_sf > 0 else lf, 1),
            "wasteFactor":  waste,
            "qty":          round(qty, 1),
            "unit":         unit,
            "unitCostLow":  costs["low"],
            "unitCostHigh": costs["high"],
            "costLow":      round(cost_low, 2),
            "costHigh":     round(cost_high, 2),
            "locations":    totals["locations"],
            "isSafetyItem": False,
        }

        if mat in ("cmu_standard", "cmu_splitface"):
            blocks = round(qty * CMU_BLOCKS_PER_SF)
            grout_cy = round(qty * CMU_GROUT_CF_PER_SF / 27, 2)
            mortar_bags = round(qty * MORTAR_BAGS_PER_SF_CMU)
            item["cmu"] = {"blocks": blocks, "groutCubicYards": grout_cy, "mortarBags": mortar_bags}

        if mat in ("brick_standard", "brick_splitface"):
            bricks = round(qty * BRICK_PER_SF * (1 + waste))
            mortar_bags = round(qty * MORTAR_BAGS_PER_SF_BRICK)
            dominant_bond = max(totals["bondPatterns"], key=totals["bondPatterns"].get, default="unknown")
            item["brick"] = {
                "bricks": bricks,
                "mortarBags": mortar_bags,
                "bondPattern": dominant_bond,
                "wasteReason": f"{dominant_bond} bond → {waste*100:.0f}% waste",
            }

        line_items.append(item)

    # ── Concrete slabs with pump residue ──────────────────────────────────────
    concrete_pour_count = 0
    for slab in slab_totals:
        thickness_in = float(slab.get("thicknessInches") or 4)
        area_sf = float(slab.get("areaSquareFeet") or 0)
        if area_sf > 0:
            concrete_pour_count += 1
            thickness_ft = thickness_in / 12
            vol_cy_raw = area_sf * thickness_ft / 27
            vol_cy_with_waste = vol_cy_raw * 1.10 + CONCRETE_PUMP_RESIDUE_CY
            label = f"Concrete Slab ({thickness_in:.0f}\" thick)"
            cost_low  = vol_cy_with_waste * UNIT_COSTS["concrete"]["low"]  * 27  # back to SF basis
            cost_high = vol_cy_with_waste * UNIT_COSTS["concrete"]["high"] * 27
            # simpler: cost per SF on net area + waste
            cost_low  = area_sf * 1.10 * UNIT_COSTS["concrete"]["low"]
            cost_high = area_sf * 1.10 * UNIT_COSTS["concrete"]["high"]
            grand_low  += cost_low
            grand_high += cost_high
            line_items.append({
                "material":     "concrete",
                "label":        label,
                "label_es":     f"Losa de Concreto ({thickness_in:.0f}\" de espesor)",
                "grossQty":     area_sf,
                "deductionSF":  0.0,
                "netQty":       round(area_sf * 1.10, 1),
                "wasteFactor":  0.10,
                "qty":          round(area_sf * 1.10, 1),
                "unit":         "SF",
                "unitCostLow":  UNIT_COSTS["concrete"]["low"],
                "unitCostHigh": UNIT_COSTS["concrete"]["high"],
                "costLow":      round(cost_low, 2),
                "costHigh":     round(cost_high, 2),
                "slab":         {
                    "thicknessInches": thickness_in,
                    "areaSF":          area_sf,
                    "volumeCY":        round(vol_cy_raw, 2),
                    "volumeCYWithWaste": round(vol_cy_with_waste, 2),
                    "pumpResidueCY":   CONCRETE_PUMP_RESIDUE_CY,
                },
                "locations":    [slab.get("location", "")],
                "isSafetyItem": False,
            })

    # ── Safety compliance line items (multi-story trigger) ────────────────────
    if is_multi_story or max_wall_height > 15:
        for key, si in SAFETY_LINE_ITEMS.items():
            line_items.append({
                "material":     key,
                "label":        si["label"],
                "label_es":     si["label_es"],
                "grossQty":     1,
                "deductionSF":  0,
                "netQty":       1,
                "wasteFactor":  0,
                "qty":          1,
                "unit":         "LS",
                "unitCostLow":  si["costLow"],
                "unitCostHigh": si["costHigh"],
                "costLow":      float(si["costLow"]),
                "costHigh":     float(si["costHigh"]),
                "safetyNote_en": si["note_en"],
                "safetyNote_es": si["note_es"],
                "locations":    [],
                "isSafetyItem": True,
            })
            grand_low  += si["costLow"]
            grand_high += si["costHigh"]

    # ── Financial summary ────────────────────────────────────────────────────
    markup_pct      = float(project_info.get("markup_pct", 15)) / 100
    contingency_pct = float(project_info.get("contingency_pct", 5)) / 100

    subtotal_low  = grand_low
    subtotal_high = grand_high
    markup_low    = subtotal_low  * markup_pct
    markup_high   = subtotal_high * markup_pct
    contingency_low  = (subtotal_low  + markup_low)  * contingency_pct
    contingency_high = (subtotal_high + markup_high) * contingency_pct
    total_low  = subtotal_low  + markup_low  + contingency_low
    total_high = subtotal_high + markup_high + contingency_high

    # ── Safety topic (project-type aware) ────────────────────────────────────
    pool = SAFETY_TOPICS["multi_story"] if is_multi_story else SAFETY_TOPICS["general"]
    week_num = datetime.now().isocalendar()[1]
    safety_topic = pool[week_num % len(pool)]

    avg_conf = round(sum(avg_confidence) / len(avg_confidence)) if avg_confidence else 0

    return {
        "lineItems":         line_items,
        "scale":             scale_found,
        "notes":             all_notes,
        "isMultiStory":      is_multi_story,
        "maxWallHeightFeet": max_wall_height,
        "totalOpeningsSF":   sum(opening_deductions.values()),
        "averageConfidence": avg_conf,
        "subtotalLow":       round(subtotal_low, 2),
        "subtotalHigh":      round(subtotal_high, 2),
        "markupPct":         markup_pct * 100,
        "markupLow":         round(markup_low, 2),
        "markupHigh":        round(markup_high, 2),
        "contingencyPct":    contingency_pct * 100,
        "contingencyLow":    round(contingency_low, 2),
        "contingencyHigh":   round(contingency_high, 2),
        "totalLow":          round(total_low, 2),
        "totalHigh":         round(total_high, 2),
        "safetyTopic":       safety_topic,
        "pagesAnalyzed":     len(set(qr["page"] for qr in quadrant_results)),
        "quadrantsAnalyzed": len(quadrant_results),
    }


# ─── PDF generation ───────────────────────────────────────────────────────────
def generate_bid_pdf(calc: dict, project_info: dict, filename: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        rightMargin=0.6*inch, leftMargin=0.6*inch,
        topMargin=0.6*inch, bottomMargin=0.6*inch,
    )
    styles = getSampleStyleSheet()
    story = []

    def s(name, **kw):
        return ParagraphStyle(name, **kw)

    h1   = s("H1",   fontSize=20, textColor=BRAND_ORANGE, fontName="Helvetica-Bold", spaceAfter=2)
    h2   = s("H2",   fontSize=13, textColor=BRAND_DARK,   fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    h3   = s("H3",   fontSize=11, textColor=BRAND_DARK,   fontName="Helvetica-Bold", spaceAfter=2)
    body = s("Body", fontSize=9,  textColor=BRAND_DARK,   fontName="Helvetica",      spaceAfter=2, leading=13)
    small= s("Sm",   fontSize=8,  textColor=BRAND_GRAY,   fontName="Helvetica",      spaceAfter=2)
    sh   = s("SH",   fontSize=11, textColor=colors.white, fontName="Helvetica-Bold", spaceAfter=3)
    sb   = s("SB",   fontSize=9,  textColor=BRAND_DARK,   fontName="Helvetica",      leading=13)

    now = datetime.now()

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("Plumb Level and Squared", h1))
    story.append(Paragraph("Licensed Masonry Contractor — Portland/Metro Oregon", small))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_ORANGE))
    story.append(Spacer(1, 0.12*inch))

    # ── Project info table ────────────────────────────────────────────────────
    info_rows = [
        ["Project:", project_info.get("project_name","—"), "Bid Date:", now.strftime("%B %d, %Y")],
        ["Owner/GC:", project_info.get("owner_gc","—"),   "Bid #:",     project_info.get("bid_number", f"BID-{now.strftime('%Y%m%d')}")],
        ["Address:", project_info.get("address","—"),      "Valid For:", "30 days"],
        ["Contact:", project_info.get("contact","—"),      "Pages:",     str(calc.get("pagesAnalyzed","—"))],
    ]
    if calc.get("scale"):
        info_rows.append(["Drawing Scale:", calc["scale"], "Avg Confidence:", f"{calc.get('averageConfidence',0)}%"])
    if calc.get("totalOpeningsSF", 0) > 0:
        info_rows.append(["Openings Deducted:", f"{calc['totalOpeningsSF']:.0f} SF", "Multi-Story:", "Yes" if calc.get("isMultiStory") else "No"])

    info_t = Table(info_rows, colWidths=[1.1*inch, 2.5*inch, 1.1*inch, 2.5*inch])
    info_t.setStyle(TableStyle([
        ("FONTNAME",   (0,0),(-1,-1), "Helvetica"),
        ("FONTNAME",   (0,0),(0,-1),  "Helvetica-Bold"),
        ("FONTNAME",   (2,0),(2,-1),  "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 9),
        ("TEXTCOLOR",  (0,0),(-1,-1), BRAND_DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.white, colors.HexColor("#fafaf9")]),
        ("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",  (0,0),(-1,-1),4),
    ]))
    story.append(info_t)
    story.append(Spacer(1, 0.15*inch))

    # ── Material takeoff table ────────────────────────────────────────────────
    story.append(Paragraph("MATERIAL TAKEOFF &amp; BID ESTIMATE / CÁLCULO DE MATERIALES", h2))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_ORANGE))
    story.append(Spacer(1, 0.08*inch))

    def th(text, align=TA_LEFT):
        return Paragraph(f"<b>{text}</b>", s(f"TH{text}", fontSize=8, fontName="Helvetica-Bold",
                                              textColor=colors.white, alignment=align))

    header_row = [
        th("Material / Material"),
        th("Net Qty", TA_CENTER),
        th("Unit",    TA_CENTER),
        th("Waste",   TA_CENTER),
        th("Deduct SF", TA_CENTER),
        th("Low",     TA_RIGHT),
        th("High",    TA_RIGHT),
    ]

    def cp(text, align=TA_LEFT, size=9, color=BRAND_DARK, bold=False):
        fn = "Helvetica-Bold" if bold else "Helvetica"
        return Paragraph(text, s(f"C{text[:6]}", fontSize=size, fontName=fn,
                                 textColor=color, alignment=align, leading=12))

    table_data = [header_row]
    for i, item in enumerate(calc.get("lineItems", [])):
        is_safety = item.get("isSafetyItem", False)
        label_html = (
            f"<b>{item['label']}</b><br/>"
            f"<font size='7' color='#78716c'>{item.get('label_es','')}</font>"
        )

        extra = ""
        if item.get("cmu"):
            c = item["cmu"]
            extra = f"<br/><font size='7' color='#57534e'>{c['blocks']:,} blocks · {c['groutCubicYards']} CY grout · {c['mortarBags']} bags mortar</font>"
        elif item.get("brick"):
            b = item["brick"]
            extra = f"<br/><font size='7' color='#57534e'>{b['bricks']:,} bricks · {b['mortarBags']} bags mortar · {b.get('wasteReason','')}</font>"
        elif item.get("slab"):
            sl = item["slab"]
            extra = (
                f"<br/><font size='7' color='#57534e'>"
                f"{sl['thicknessInches']:.0f}\" slab · {sl['volumeCY']} CY raw · "
                f"{sl['volumeCYWithWaste']} CY w/waste · +{sl['pumpResidueCY']} CY pump residue"
                f"</font>"
            )
        elif is_safety and item.get("safetyNote_en"):
            extra = f"<br/><font size='7' color='#b91c1c'>{item['safetyNote_en']}</font>"

        deduct_text = f"−{item['deductionSF']:.0f}" if item.get("deductionSF", 0) > 0 else "—"
        text_color = BRAND_RED if is_safety else BRAND_DARK

        row = [
            cp(label_html + extra, color=text_color),
            cp(f"{item['qty']:,.1f}", TA_CENTER, color=text_color),
            cp(item["unit"], TA_CENTER, color=text_color),
            cp(f"{item['wasteFactor']*100:.0f}%", TA_CENTER, color=text_color),
            cp(deduct_text, TA_CENTER, color=BRAND_RED if item.get("deductionSF",0)>0 else BRAND_GRAY),
            cp(f"${item['costLow']:,.0f}", TA_RIGHT, color=BRAND_GREEN if not is_safety else BRAND_RED),
            cp(f"${item['costHigh']:,.0f}", TA_RIGHT, color=BRAND_ORANGE if not is_safety else BRAND_RED),
        ]
        table_data.append(row)

    n = len(calc.get("lineItems", []))

    def footer_row(label, low, high, bg=colors.HexColor("#f5f5f4")):
        return [
            cp(f"<b>{label}</b>", bold=True), cp(""), cp(""), cp(""), cp(""),
            cp(f"${low:,.0f}", TA_RIGHT, bold=True),
            cp(f"${high:,.0f}", TA_RIGHT, bold=True),
        ]

    table_data.extend([
        footer_row("Subtotal", calc["subtotalLow"], calc["subtotalHigh"]),
        [cp(f"Markup / Ganancia ({calc['markupPct']:.0f}%)"),
         cp(""),cp(""),cp(""),cp(""),
         cp(f"${calc['markupLow']:,.0f}", TA_RIGHT, color=BRAND_GRAY),
         cp(f"${calc['markupHigh']:,.0f}", TA_RIGHT, color=BRAND_GRAY)],
        [cp(f"Contingency / Contingencia ({calc['contingencyPct']:.0f}%)"),
         cp(""),cp(""),cp(""),cp(""),
         cp(f"${calc['contingencyLow']:,.0f}", TA_RIGHT, color=BRAND_GRAY),
         cp(f"${calc['contingencyHigh']:,.0f}", TA_RIGHT, color=BRAND_GRAY)],
        [Paragraph("<b>TOTAL BID RANGE / RANGO TOTAL</b>",
                   s("TOT", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white)),
         cp(""),cp(""),cp(""),cp(""),
         Paragraph(f"<b>${calc['totalLow']:,.0f}</b>",
                   s("T2", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_RIGHT)),
         Paragraph(f"<b>${calc['totalHigh']:,.0f}</b>",
                   s("T3", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_RIGHT))],
    ])

    mat_t = Table(
        table_data,
        colWidths=[2.4*inch, 0.7*inch, 0.45*inch, 0.55*inch, 0.7*inch, 1.0*inch, 1.0*inch],
    )
    mat_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),   BRAND_DARK),
        ("ROWBACKGROUNDS",(0,1),(-1,n),   [colors.white, colors.HexColor("#fafaf9")]),
        ("BACKGROUND",    (0,n+1),(-1,n+1), colors.HexColor("#f5f5f4")),
        ("BACKGROUND",    (0,n+4),(-1,n+4), BRAND_ORANGE),
        ("LINEABOVE",     (0,n+1),(-1,n+1), 1, BRAND_ORANGE),
        ("LINEABOVE",     (0,n+4),(-1,n+4), 1, BRAND_DARK),
        ("GRID",          (0,0), (-1,n),    0.25, colors.HexColor("#e7e5e4")),
        ("VALIGN",        (0,0), (-1,-1),   "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1),   5),
        ("BOTTOMPADDING", (0,0), (-1,-1),   5),
        ("LEFTPADDING",   (0,0), (-1,-1),   5),
        ("RIGHTPADDING",  (0,0), (-1,-1),   5),
        ("SPAN",          (0,n+1),(4,n+1)),
        ("SPAN",          (0,n+2),(4,n+2)),
        ("SPAN",          (0,n+3),(4,n+3)),
        ("SPAN",          (0,n+4),(4,n+4)),
    ]))
    story.append(mat_t)
    story.append(Spacer(1, 0.2*inch))

    # ── Safety topic ──────────────────────────────────────────────────────────
    topic = calc.get("safetyTopic", SAFETY_TOPICS["general"][0])
    if calc.get("isMultiStory"):
        topic_note = "Multi-story job detected — Scaffold &amp; Fall Protection protocols required"
    else:
        topic_note = "Weekly safety briefing — print and post at job site"

    hdr_row = [[Paragraph(
        f"⚠  SAFETY TOPIC OF THE WEEK — {topic_note.upper()} / TEMA DE SEGURIDAD DE LA SEMANA",
        s("SFH", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white),
    )]]
    hdr_t = Table(hdr_row, colWidths=[7.3*inch])
    hdr_t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BRAND_RED),
        ("LEFTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
    ]))
    story.append(hdr_t)

    body_rows = [[
        Paragraph(f"<b>{topic['en']}</b><br/>{topic['body_en']}", sb),
        Paragraph(f"<b>{topic['es']}</b><br/>{topic['body_es']}", sb),
    ]]
    body_t = Table(body_rows, colWidths=[3.65*inch, 3.65*inch])
    body_t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BRAND_LIGHT),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
        ("LINEAFTER",(0,0),(0,-1),0.5,BRAND_ORANGE),
    ]))
    story.append(body_t)
    story.append(Spacer(1, 0.2*inch))

    # ── Estimator notes ───────────────────────────────────────────────────────
    if calc.get("notes"):
        story.append(Paragraph("Estimator Notes / Notas del Estimador", h3))
        for note in calc["notes"]:
            story.append(Paragraph(f"• {note}", body))
        story.append(Spacer(1, 0.1*inch))

    # ── Terms & signature ────────────────────────────────────────────────────
    story.append(Paragraph("TERMS &amp; ACCEPTANCE / TÉRMINOS Y ACEPTACIÓN", h2))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_ORANGE))
    story.append(Spacer(1, 0.06*inch))
    terms_en = (
        "This bid is based on AI-assisted blueprint analysis with OpenCV geometric pre-processing and GPT-4o vision. "
        "Quantities reflect net area after window/door deductions, with bond-pattern waste factors and concrete pump residue allowances. "
        "Results should be reviewed by a licensed estimator before contract execution. Valid 30 days. Portland/Metro Oregon rates."
    )
    terms_es = (
        "Esta licitación se basa en análisis asistido por IA con preprocesamiento geométrico OpenCV y visión GPT-4o. "
        "Las cantidades reflejan el área neta después de deducir ventanas y puertas, con factores de desperdicio según el patrón de aparejo. "
        "Debe revisarse con un estimador con licencia antes de firmar. Válida 30 días. Tarifas del mercado Portland/Metro Oregon."
    )
    terms_rows = [[Paragraph(terms_en, small), Paragraph(terms_es, small)]]
    terms_t = Table(terms_rows, colWidths=[3.65*inch, 3.65*inch])
    terms_t.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LINEAFTER",(0,0),(0,-1),0.5,colors.HexColor("#e7e5e4")),
        ("LEFTPADDING",(1,0),(1,-1),8),
    ]))
    story.append(terms_t)
    story.append(Spacer(1, 0.25*inch))

    sig_rows = [
        ["Authorized Signature / Firma Autorizada:", "_"*36, "Date / Fecha:", "_"*16],
        ["Accepted By / Aceptado Por:",              "_"*36, "Date / Fecha:", "_"*16],
    ]
    sig_t = Table(sig_rows, colWidths=[1.9*inch, 2.8*inch, 1.0*inch, 1.6*inch])
    sig_t.setStyle(TableStyle([
        ("FONTNAME",(0,0),(0,-1),"Helvetica-Bold"),
        ("FONTNAME",(2,0),(2,-1),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),10),
        ("BOTTOMPADDING",(0,0),(-1,-1),2),
    ]))
    story.append(sig_t)

    def page_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawString(0.6*inch, 0.35*inch,
            f"Plumb Level and Squared  •  Blueprint AI Bid v2  •  {filename}  •  {now.strftime('%Y-%m-%d %H:%M')}")
        canvas.drawRightString(7.9*inch, 0.35*inch, f"Page {doc.page}")
        canvas.setStrokeColor(BRAND_ORANGE)
        canvas.setLineWidth(1.5)
        canvas.line(0.6*inch, 0.45*inch, 7.9*inch, 0.45*inch)
        canvas.restoreState()

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    return buf.getvalue()


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "blueprint-pipeline", "version": "2.0"}


@app.post("/analyze")
async def analyze_blueprint(
    file:            UploadFile = File(...),
    project_name:    str   = Form("Untitled Project"),
    owner_gc:        str   = Form(""),
    address:         str   = Form(""),
    contact:         str   = Form(""),
    bid_number:      str   = Form(""),
    markup_pct:      float = Form(15.0),
    contingency_pct: float = Form(5.0),
    dpi:             int   = Form(200),
    user_scale:      str   = Form(""),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF too large (max 50MB)")

    try:
        quadrant_images = pdf_to_quadrant_images(pdf_bytes, dpi=dpi)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process PDF: {e}")

    quadrant_results = []
    for qi in quadrant_images:
        result = analyze_quadrant(
            qi["b64"], qi["page"], qi["quadrant"],
            qi.get("geometry", {}), user_scale.strip(),
        )
        quadrant_results.append(result)

    project_info = {
        "project_name":    project_name,
        "owner_gc":        owner_gc,
        "address":         address,
        "contact":         contact,
        "bid_number":      bid_number,
        "markup_pct":      markup_pct,
        "contingency_pct": contingency_pct,
    }

    calc = run_calculation_engine(quadrant_results, project_info)

    try:
        pdf_out  = generate_bid_pdf(calc, project_info, file.filename or "blueprint.pdf")
        pdf_b64  = base64.b64encode(pdf_out).decode("utf-8")
    except Exception as e:
        pdf_b64 = None
        calc["pdfError"] = str(e)

    return {
        "success":         True,
        "projectName":     project_name,
        "quadrantResults": quadrant_results,
        "calculation":     calc,
        "bidPdfBase64":    pdf_b64,
        "filename":        f"Bid_{project_name.replace(' ','_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT_BLUEPRINT", 8099))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

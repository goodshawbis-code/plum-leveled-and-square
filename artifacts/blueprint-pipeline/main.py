import base64
import io
import json
import math
import os
import re
import tempfile
from datetime import datetime
from typing import Optional
import traceback

import cv2
import fitz  # PyMuPDF
import numpy as np
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from PIL import Image
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

app = FastAPI(title="Blueprint Analysis Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL", "https://api.openai.com/v1")
API_KEY = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", "placeholder")
client = OpenAI(base_url=BASE_URL, api_key=API_KEY)

BRAND_ORANGE = colors.HexColor("#d97706")
BRAND_DARK = colors.HexColor("#1c1917")
BRAND_LIGHT = colors.HexColor("#fef3c7")
BRAND_GRAY = colors.HexColor("#78716c")
BRAND_RED = colors.HexColor("#dc2626")

SAFETY_TOPICS = [
    {
        "en": "Fall Protection",
        "es": "Protección Contra Caídas",
        "body_en": "Always wear a properly fitted harness when working at heights above 6 feet. Inspect all fall protection equipment before each use. Never bypass anchor points or tie-off requirements.",
        "body_es": "Siempre use un arnés bien ajustado cuando trabaje a alturas superiores a 6 pies. Inspeccione todo el equipo de protección contra caídas antes de cada uso. Nunca omita los puntos de anclaje ni los requisitos de sujeción.",
    },
    {
        "en": "Eye & Face Protection",
        "es": "Protección de Ojos y Cara",
        "body_en": "Wear safety glasses or goggles when cutting, chipping, or grinding masonry. Flying debris can cause permanent eye damage. Side shields are required when working near overhead hazards.",
        "body_es": "Use lentes o gafas de seguridad al cortar, picar o esmerilar mampostería. Los escombros voladores pueden causar daños oculares permanentes. Se requieren protectores laterales cuando se trabaja cerca de peligros en altura.",
    },
    {
        "en": "Scaffold Safety",
        "es": "Seguridad en Andamios",
        "body_en": "Inspect scaffolding before every shift. Never overload a platform — check the load capacity rating. Maintain three points of contact when climbing. Keep platforms clear of debris and trip hazards.",
        "body_es": "Inspeccione los andamios antes de cada turno. Nunca sobrecargue una plataforma — verifique la capacidad de carga. Mantenga tres puntos de contacto al subir. Mantenga las plataformas libres de escombros y peligros de tropiezo.",
    },
    {
        "en": "Heat Illness Prevention",
        "es": "Prevención de Enfermedades por Calor",
        "body_en": "Drink water every 15–20 minutes, even if you are not thirsty. Take rest breaks in the shade. Know the signs of heat exhaustion: heavy sweating, weakness, dizziness. Report symptoms immediately.",
        "body_es": "Beba agua cada 15–20 minutos, incluso si no tiene sed. Tome descansos a la sombra. Conozca los signos del agotamiento por calor: sudoración intensa, debilidad, mareo. Reporte los síntomas de inmediato.",
    },
    {
        "en": "Hand & Tool Safety",
        "es": "Seguridad de Manos y Herramientas",
        "body_en": "Wear cut-resistant gloves when handling block, brick, or cut stone. Keep blades and chisels sharp — dull tools require more force and slip more easily. Never use a damaged tool; tag it and remove it from service.",
        "body_es": "Use guantes resistentes a cortes al manejar bloques, ladrillos o piedra cortada. Mantenga las cuchillas y cinceles afilados — las herramientas sin filo requieren más fuerza y se deslizan más fácilmente. Nunca use una herramienta dañada; etiquétela y retírela del servicio.",
    },
]

MATERIALS_ES = {
    "Culture Stone / Veneer": "Piedra Cultivo / Enchape",
    "CMU Block (Standard)": "Bloque CMU (Estándar)",
    "CMU Block (Split-Face)": "Bloque CMU (Cara Dividida)",
    "Brick (Standard)": "Ladrillo (Estándar)",
    "Brick (Split-Face)": "Ladrillo (Cara Dividida)",
    "Concrete Footing": "Cimiento de Concreto",
    "Grout Fill": "Relleno de Lechada",
    "Reinforcing Steel": "Acero de Refuerzo",
    "Mortar": "Mortero",
    "Concrete Slab": "Losa de Concreto",
    "Other Masonry": "Otra Mampostería",
}

ANALYSIS_PROMPT = """You are a licensed masonry estimator reviewing a blueprint quadrant.

STEP 1 — SCALE & LEGEND: Find the scale bar and measurement key. Report the drawing scale (e.g. 1/4"=1'-0"). If no scale bar is visible in this quadrant, report 'not found'.

STEP 2 — MASONRY WALLS: Identify all walls with masonry hatch patterns (brick coursing, CMU grid, stone texture, concrete stipple). For each wall, record:
  - Material type (culture_stone, cmu_standard, cmu_splitface, brick_standard, brick_splitface, concrete, other)
  - Linear footage along the wall face (estimate from scale if available)
  - Wall height if shown in section/elevation
  - Location description on the drawing

STEP 3 — SLAB THICKNESS: Identify any concrete slab thickness callouts (e.g. "4\" CONC SLAB", "6\" SOG"). Record each one with its location.

STEP 4 — DIMENSIONS: List any explicit dimension strings you can read (e.g. "12'-6\"", "32'-0\"").

Return ONLY valid JSON — no markdown, no code fences:
{
  "scale": "1/4\" = 1'-0\"",
  "hasScaleBar": true,
  "hasMasonryWork": true,
  "walls": [
    {
      "material": "culture_stone",
      "label": "Culture Stone Veneer",
      "linearFeet": 24.5,
      "heightFeet": 9.0,
      "areaSquareFeet": 220.5,
      "location": "north exterior wall",
      "confidence": "high"
    }
  ],
  "slabs": [
    {
      "thicknessInches": 4,
      "areaSquareFeet": 800,
      "location": "main floor slab",
      "confidence": "medium"
    }
  ],
  "dimensionStrings": ["32'-0\"", "24'-6\""],
  "notes": "scale bar found in lower-right corner"
}"""

WASTE_FACTORS = {
    "culture_stone": 0.10,
    "cmu_standard": 0.05,
    "cmu_splitface": 0.05,
    "brick_standard": 0.07,
    "brick_splitface": 0.07,
    "concrete_footing": 0.08,
    "grout_fill": 0.05,
    "rebar": 0.05,
    "mortar": 0.10,
    "concrete": 0.10,
    "other": 0.08,
}

UNIT_COSTS = {
    "culture_stone": {"low": 18, "high": 22, "unit": "SF", "label": "Culture Stone / Veneer"},
    "cmu_standard": {"low": 14, "high": 20, "unit": "SF", "label": "CMU Block (Standard)"},
    "cmu_splitface": {"low": 18, "high": 26, "unit": "SF", "label": "CMU Block (Split-Face)"},
    "brick_standard": {"low": 18.5, "high": 26, "unit": "SF", "label": "Brick (Standard)"},
    "brick_splitface": {"low": 24, "high": 36, "unit": "SF", "label": "Brick (Split-Face)"},
    "concrete_footing": {"low": 30, "high": 46, "unit": "LF", "label": "Concrete Footing"},
    "grout_fill": {"low": 3.5, "high": 5.5, "unit": "SF", "label": "Grout Fill"},
    "rebar": {"low": 2.25, "high": 3.75, "unit": "SF", "label": "Reinforcing Steel"},
    "mortar": {"low": 1.75, "high": 2.75, "unit": "SF", "label": "Mortar"},
    "concrete": {"low": 8, "high": 14, "unit": "SF", "label": "Concrete Slab"},
    "other": {"low": 10, "high": 25, "unit": "SF", "label": "Other Masonry"},
}

CMU_GROUT_CF_PER_SF = 0.45
CMU_BLOCKS_PER_SF = 1.125
BRICK_PER_SF = 6.75
MORTAR_BAGS_PER_SF_CMU = 0.125
MORTAR_BAGS_PER_SF_BRICK = 0.2


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
            success, encoded = cv2.imencode(".png", quad)
            if success:
                b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")
                quadrant_images.append({
                    "page": page_num + 1,
                    "quadrant": label,
                    "b64": b64,
                    "width": quad.shape[1],
                    "height": quad.shape[0],
                })

    doc.close()
    return quadrant_images


def analyze_quadrant(b64: str, page: int, quadrant: str) -> dict:
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1500,
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
                        {"type": "text", "text": ANALYSIS_PROMPT},
                    ],
                }
            ],
        )
        raw = response.choices[0].message.content or "{}"
        json_match = re.search(r"\{[\s\S]*\}", raw)
        data = json.loads(json_match.group(0) if json_match else raw)
        data["page"] = page
        data["quadrant"] = quadrant
        return data
    except Exception as e:
        return {"page": page, "quadrant": quadrant, "error": str(e), "hasMasonryWork": False, "walls": [], "slabs": []}


def run_calculation_engine(quadrant_results: list[dict], project_info: dict) -> dict:
    material_totals: dict[str, dict] = {}
    slab_totals: list[dict] = []
    all_notes: list[str] = []
    scale_found = None

    for qr in quadrant_results:
        if qr.get("error"):
            continue
        if qr.get("scale") and not scale_found:
            scale_found = qr["scale"]
        for note in qr.get("notes", []) if isinstance(qr.get("notes"), list) else ([qr["notes"]] if qr.get("notes") else []):
            if note not in all_notes:
                all_notes.append(note)

        for wall in qr.get("walls", []):
            mat = wall.get("material", "other")
            sf = float(wall.get("areaSquareFeet") or 0)
            lf = float(wall.get("linearFeet") or 0)
            if mat not in material_totals:
                material_totals[mat] = {"sf": 0.0, "lf": 0.0, "locations": []}
            material_totals[mat]["sf"] += sf
            material_totals[mat]["lf"] += lf
            loc = wall.get("location", "")
            if loc and loc not in material_totals[mat]["locations"]:
                material_totals[mat]["locations"].append(loc)

        for slab in qr.get("slabs", []):
            slab_totals.append(slab)

    line_items = []
    grand_low = 0.0
    grand_high = 0.0

    for mat, totals in material_totals.items():
        costs = UNIT_COSTS.get(mat, UNIT_COSTS["other"])
        waste = WASTE_FACTORS.get(mat, 0.08)
        raw_sf = totals["sf"]
        raw_lf = totals["lf"]

        if raw_sf > 0:
            qty_with_waste = raw_sf * (1 + waste)
            unit = "SF"
            qty = qty_with_waste
        elif raw_lf > 0:
            qty_with_waste = raw_lf * (1 + waste)
            unit = "LF"
            qty = qty_with_waste
        else:
            continue

        cost_low = qty * costs["low"]
        cost_high = qty * costs["high"]
        grand_low += cost_low
        grand_high += cost_high

        item = {
            "material": mat,
            "label": costs["label"],
            "label_es": MATERIALS_ES.get(costs["label"], costs["label"]),
            "rawQty": raw_sf if raw_sf > 0 else raw_lf,
            "wasteFactor": waste,
            "qty": round(qty, 1),
            "unit": unit,
            "unitCostLow": costs["low"],
            "unitCostHigh": costs["high"],
            "costLow": round(cost_low, 2),
            "costHigh": round(cost_high, 2),
            "locations": totals["locations"],
        }

        if mat in ("cmu_standard", "cmu_splitface"):
            blocks = round(qty * CMU_BLOCKS_PER_SF)
            grout_cf = round(qty * CMU_GROUT_CF_PER_SF, 1)
            grout_cy = round(grout_cf / 27, 2)
            mortar_bags = round(qty * MORTAR_BAGS_PER_SF_CMU)
            item["cmu"] = {
                "blocks": blocks,
                "groutCubicFeet": grout_cf,
                "groutCubicYards": grout_cy,
                "mortarBags": mortar_bags,
            }
        elif mat in ("brick_standard", "brick_splitface"):
            bricks = round(qty * BRICK_PER_SF * (1 + waste))
            mortar_bags = round(qty * MORTAR_BAGS_PER_SF_BRICK)
            item["brick"] = {"bricks": bricks, "mortarBags": mortar_bags}

        line_items.append(item)

    for slab in slab_totals:
        thickness_in = float(slab.get("thicknessInches") or 4)
        area_sf = float(slab.get("areaSquareFeet") or 0)
        if area_sf > 0:
            thickness_ft = thickness_in / 12
            vol_cf = area_sf * thickness_ft
            vol_cy = vol_cf / 27 * 1.10
            label = f"Concrete Slab ({thickness_in:.0f}\" thick)"
            line_items.append({
                "material": "concrete",
                "label": label,
                "label_es": f"Losa de Concreto ({thickness_in:.0f}\" de espesor)",
                "rawQty": area_sf,
                "wasteFactor": 0.10,
                "qty": round(area_sf * 1.10, 1),
                "unit": "SF",
                "unitCostLow": UNIT_COSTS["concrete"]["low"],
                "unitCostHigh": UNIT_COSTS["concrete"]["high"],
                "costLow": round(area_sf * 1.10 * UNIT_COSTS["concrete"]["low"], 2),
                "costHigh": round(area_sf * 1.10 * UNIT_COSTS["concrete"]["high"], 2),
                "slab": {
                    "thicknessInches": thickness_in,
                    "areaSF": area_sf,
                    "volumeCY": round(vol_cy, 2),
                },
                "locations": [slab.get("location", "")],
            })
            cost_low = area_sf * 1.10 * UNIT_COSTS["concrete"]["low"]
            cost_high = area_sf * 1.10 * UNIT_COSTS["concrete"]["high"]
            grand_low += cost_low
            grand_high += cost_high

    markup_pct = float(project_info.get("markup_pct", 15)) / 100
    contingency_pct = float(project_info.get("contingency_pct", 5)) / 100

    subtotal_low = grand_low
    subtotal_high = grand_high
    markup_low = subtotal_low * markup_pct
    markup_high = subtotal_high * markup_pct
    contingency_low = (subtotal_low + markup_low) * contingency_pct
    contingency_high = (subtotal_high + markup_high) * contingency_pct
    total_low = subtotal_low + markup_low + contingency_low
    total_high = subtotal_high + markup_high + contingency_high

    week_num = datetime.now().isocalendar()[1]
    safety_topic = SAFETY_TOPICS[week_num % len(SAFETY_TOPICS)]

    return {
        "lineItems": line_items,
        "scale": scale_found,
        "notes": all_notes,
        "subtotalLow": round(subtotal_low, 2),
        "subtotalHigh": round(subtotal_high, 2),
        "markupPct": markup_pct * 100,
        "markupLow": round(markup_low, 2),
        "markupHigh": round(markup_high, 2),
        "contingencyPct": contingency_pct * 100,
        "contingencyLow": round(contingency_low, 2),
        "contingencyHigh": round(contingency_high, 2),
        "totalLow": round(total_low, 2),
        "totalHigh": round(total_high, 2),
        "safetyTopic": safety_topic,
        "pagesAnalyzed": len(set(qr["page"] for qr in quadrant_results)),
        "quadrantsAnalyzed": len(quadrant_results),
    }


def generate_bid_pdf(
    calc: dict,
    project_info: dict,
    filename: str,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    story = []

    def style(name, **kwargs):
        return ParagraphStyle(name, **kwargs)

    h1 = style("H1", fontSize=20, textColor=BRAND_ORANGE, fontName="Helvetica-Bold", spaceAfter=2)
    h2 = style("H2", fontSize=13, textColor=BRAND_DARK, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    h3 = style("H3", fontSize=11, textColor=BRAND_DARK, fontName="Helvetica-Bold", spaceAfter=2)
    body = style("Body", fontSize=9, textColor=BRAND_DARK, fontName="Helvetica", spaceAfter=2, leading=13)
    small = style("Small", fontSize=8, textColor=BRAND_GRAY, fontName="Helvetica", spaceAfter=2)
    center = style("Center", fontSize=9, alignment=TA_CENTER, fontName="Helvetica")
    right = style("Right", fontSize=9, alignment=TA_RIGHT, fontName="Helvetica")
    safety_head = style("SafetyHead", fontSize=11, textColor=colors.white, fontName="Helvetica-Bold", spaceAfter=3)
    safety_body = style("SafetyBody", fontSize=9, textColor=BRAND_DARK, fontName="Helvetica", leading=13)

    story.append(Paragraph("Plumb Level and Squared", h1))
    story.append(Paragraph("Licensed Masonry Contractor — Portland/Metro Oregon", small))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_ORANGE))
    story.append(Spacer(1, 0.12 * inch))

    now = datetime.now()
    info_data = [
        ["Project:", project_info.get("project_name", "—"), "Bid Date:", now.strftime("%B %d, %Y")],
        ["Owner/GC:", project_info.get("owner_gc", "—"), "Bid #:", project_info.get("bid_number", f"BID-{now.strftime('%Y%m%d')}")],
        ["Address:", project_info.get("address", "—"), "Valid For:", "30 days"],
        ["Contact:", project_info.get("contact", "—"), "Pages Analyzed:", str(calc.get("pagesAnalyzed", "—"))],
    ]
    if calc.get("scale"):
        info_data.append(["Drawing Scale:", calc["scale"], "AI Quadrants:", str(calc.get("quadrantsAnalyzed", "—"))])

    info_table = Table(info_data, colWidths=[1.1 * inch, 2.5 * inch, 1.1 * inch, 2.5 * inch])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), BRAND_DARK),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#fafaf9")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("MATERIAL TAKEOFF &amp; BID ESTIMATE / CÁLCULO DE MATERIALES", h2))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_ORANGE))
    story.append(Spacer(1, 0.08 * inch))

    table_data = [[
        Paragraph("<b>Material / Material</b>", style("TH", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_LEFT)),
        Paragraph("<b>Qty / Cant.</b>", style("TH2", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER)),
        Paragraph("<b>Unit</b>", style("TH3", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER)),
        Paragraph("<b>Waste / Desperdicio</b>", style("TH4", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER)),
        Paragraph("<b>Cost Low / Costo Bajo</b>", style("TH5", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_RIGHT)),
        Paragraph("<b>Cost High / Costo Alto</b>", style("TH6", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_RIGHT)),
    ]]

    row_styles = []
    for i, item in enumerate(calc.get("lineItems", [])):
        label_text = f"{item['label']}<br/><font size='7' color='#78716c'>{item.get('label_es','')}</font>"
        extra = ""
        if item.get("cmu"):
            c = item["cmu"]
            extra = f"<br/><font size='7' color='#57534e'>{c['blocks']} blocks • {c['groutCY']} CY grout • {c['mortarBags']} bags mortar</font>" if "groutCY" in c else f"<br/><font size='7' color='#57534e'>{c['blocks']} blocks • {c['groutCubicYards']} CY grout • {c['mortarBags']} bags mortar</font>"
        elif item.get("brick"):
            b = item["brick"]
            extra = f"<br/><font size='7' color='#57534e'>{b['bricks']:,} bricks • {b['mortarBags']} bags mortar</font>"
        elif item.get("slab"):
            s = item["slab"]
            extra = f"<br/><font size='7' color='#57534e'>{s['thicknessInches']:.0f}\" slab • {s['volumeCY']:.2f} CY concrete</font>"

        row = [
            Paragraph(label_text + extra, style(f"CL{i}", fontSize=9, fontName="Helvetica", textColor=BRAND_DARK, leading=12)),
            Paragraph(f"{item['qty']:,.1f}", style(f"CQ{i}", fontSize=9, fontName="Helvetica", textColor=BRAND_DARK, alignment=TA_CENTER)),
            Paragraph(item["unit"], style(f"CU{i}", fontSize=9, fontName="Helvetica", textColor=BRAND_DARK, alignment=TA_CENTER)),
            Paragraph(f"{item['wasteFactor']*100:.0f}%", style(f"CW{i}", fontSize=9, fontName="Helvetica", textColor=BRAND_DARK, alignment=TA_CENTER)),
            Paragraph(f"${item['costLow']:,.0f}", style(f"CCL{i}", fontSize=9, fontName="Helvetica", textColor=BRAND_DARK, alignment=TA_RIGHT)),
            Paragraph(f"${item['costHigh']:,.0f}", style(f"CCH{i}", fontSize=9, fontName="Helvetica", textColor=BRAND_DARK, alignment=TA_RIGHT)),
        ]
        table_data.append(row)
        if i % 2 == 0:
            row_styles.append(("BACKGROUND", (0, i + 1), (-1, i + 1), colors.white))
        else:
            row_styles.append(("BACKGROUND", (0, i + 1), (-1, i + 1), colors.HexColor("#fafaf9")))

    subtotal_row = [
        Paragraph("<b>Subtotal</b>", style("SUB", fontSize=9, fontName="Helvetica-Bold", textColor=BRAND_DARK)),
        "", "", "",
        Paragraph(f"<b>${calc['subtotalLow']:,.0f}</b>", style("SUB2", fontSize=9, fontName="Helvetica-Bold", textColor=BRAND_DARK, alignment=TA_RIGHT)),
        Paragraph(f"<b>${calc['subtotalHigh']:,.0f}</b>", style("SUB3", fontSize=9, fontName="Helvetica-Bold", textColor=BRAND_DARK, alignment=TA_RIGHT)),
    ]
    markup_row = [
        Paragraph(f"Markup / Ganancia ({calc['markupPct']:.0f}%)", body),
        "", "", "",
        Paragraph(f"${calc['markupLow']:,.0f}", style("MR", fontSize=9, alignment=TA_RIGHT, fontName="Helvetica", textColor=BRAND_GRAY)),
        Paragraph(f"${calc['markupHigh']:,.0f}", style("MR2", fontSize=9, alignment=TA_RIGHT, fontName="Helvetica", textColor=BRAND_GRAY)),
    ]
    contingency_row = [
        Paragraph(f"Contingency / Contingencia ({calc['contingencyPct']:.0f}%)", body),
        "", "", "",
        Paragraph(f"${calc['contingencyLow']:,.0f}", style("CR", fontSize=9, alignment=TA_RIGHT, fontName="Helvetica", textColor=BRAND_GRAY)),
        Paragraph(f"${calc['contingencyHigh']:,.0f}", style("CR2", fontSize=9, alignment=TA_RIGHT, fontName="Helvetica", textColor=BRAND_GRAY)),
    ]
    total_row = [
        Paragraph("<b>TOTAL BID RANGE / RANGO TOTAL DE LICITACIÓN</b>", style("TOT", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white)),
        "", "", "",
        Paragraph(f"<b>${calc['totalLow']:,.0f}</b>", style("TOT2", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_RIGHT)),
        Paragraph(f"<b>${calc['totalHigh']:,.0f}</b>", style("TOT3", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_RIGHT)),
    ]

    n = len(calc.get("lineItems", []))
    table_data += [subtotal_row, markup_row, contingency_row, total_row]

    mat_table = Table(
        table_data,
        colWidths=[2.6 * inch, 0.75 * inch, 0.5 * inch, 0.9 * inch, 1.1 * inch, 1.1 * inch],
    )
    mat_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, n), [colors.white, colors.HexColor("#fafaf9")]),
        ("BACKGROUND", (0, n + 1), (-1, n + 1), colors.HexColor("#f5f5f4")),
        ("BACKGROUND", (0, n + 2), (-1, n + 2), colors.white),
        ("BACKGROUND", (0, n + 3), (-1, n + 3), colors.white),
        ("BACKGROUND", (0, n + 4), (-1, n + 4), BRAND_ORANGE),
        ("LINEABOVE", (0, n + 1), (-1, n + 1), 1, BRAND_ORANGE),
        ("LINEABOVE", (0, n + 4), (-1, n + 4), 1, BRAND_DARK),
        ("GRID", (0, 0), (-1, n), 0.25, colors.HexColor("#e7e5e4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("SPAN", (0, n + 1), (3, n + 1)),
        ("SPAN", (0, n + 2), (3, n + 2)),
        ("SPAN", (0, n + 3), (3, n + 3)),
        ("SPAN", (0, n + 4), (3, n + 4)),
    ]))
    story.append(mat_table)
    story.append(Spacer(1, 0.2 * inch))

    topic = calc.get("safetyTopic", SAFETY_TOPICS[0])
    safety_data = [[
        Paragraph(f"⚠  SAFETY TOPIC OF THE WEEK / TEMA DE SEGURIDAD DE LA SEMANA", safety_head),
    ]]
    safety_table_outer = Table(safety_data, colWidths=[7.3 * inch])
    safety_table_outer.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_RED),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(safety_table_outer)

    safety_body_data = [[
        Paragraph(f"<b>{topic['en']}</b><br/>{topic['body_en']}", safety_body),
        Paragraph(f"<b>{topic['es']}</b><br/>{topic['body_es']}", safety_body),
    ]]
    safety_body_table = Table(safety_body_data, colWidths=[3.65 * inch, 3.65 * inch])
    safety_body_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, BRAND_ORANGE),
    ]))
    story.append(safety_body_table)
    story.append(Spacer(1, 0.2 * inch))

    if calc.get("notes"):
        story.append(Paragraph("Estimator Notes / Notas del Estimador", h3))
        for note in calc["notes"]:
            story.append(Paragraph(f"• {note}", body))
        story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph("TERMS &amp; ACCEPTANCE / TÉRMINOS Y ACEPTACIÓN", h2))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_ORANGE))
    story.append(Spacer(1, 0.06 * inch))
    terms_en = (
        "This bid is based on AI-assisted blueprint analysis and should be reviewed by a licensed estimator before contract execution. "
        "Quantities are estimates derived from digital plan review. Final pricing subject to field verification, material availability, and current market conditions. "
        "Valid for 30 days from bid date. Portland/Metro Oregon market rates applied."
    )
    terms_es = (
        "Esta licitación se basa en análisis de planos asistido por IA y debe ser revisada por un estimador con licencia antes de la ejecución del contrato. "
        "Las cantidades son estimaciones derivadas de la revisión digital de planos. El precio final está sujeto a verificación en campo, disponibilidad de materiales y condiciones actuales del mercado. "
        "Válida por 30 días a partir de la fecha de la licitación. Se aplicaron tarifas del mercado de Portland/Metro Oregon."
    )
    terms_data = [[Paragraph(terms_en, small), Paragraph(terms_es, small)]]
    terms_table = Table(terms_data, colWidths=[3.65 * inch, 3.65 * inch])
    terms_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, colors.HexColor("#e7e5e4")),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
    ]))
    story.append(terms_table)
    story.append(Spacer(1, 0.25 * inch))

    sig_data = [
        ["Authorized Signature / Firma Autorizada:", "_" * 38, "Date / Fecha:", "_" * 18],
        ["Accepted By / Aceptado Por:", "_" * 38, "Date / Fecha:", "_" * 18],
    ]
    sig_table = Table(sig_data, colWidths=[1.9 * inch, 2.8 * inch, 1.0 * inch, 1.6 * inch])
    sig_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(sig_table)

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawString(0.6 * inch, 0.35 * inch, f"Plumb Level and Squared  •  Blueprint AI Bid  •  {filename}  •  Generated {now.strftime('%Y-%m-%d %H:%M')}")
        canvas.drawRightString(7.9 * inch, 0.35 * inch, f"Page {doc.page}")
        canvas.setStrokeColor(BRAND_ORANGE)
        canvas.setLineWidth(1.5)
        canvas.line(0.6 * inch, 0.45 * inch, 7.9 * inch, 0.45 * inch)
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "blueprint-pipeline"}


@app.post("/analyze")
async def analyze_blueprint(
    file: UploadFile = File(...),
    project_name: str = Form("Untitled Project"),
    owner_gc: str = Form(""),
    address: str = Form(""),
    contact: str = Form(""),
    bid_number: str = Form(""),
    markup_pct: float = Form(15.0),
    contingency_pct: float = Form(5.0),
    dpi: int = Form(200),
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
        result = analyze_quadrant(qi["b64"], qi["page"], qi["quadrant"])
        quadrant_results.append(result)

    project_info = {
        "project_name": project_name,
        "owner_gc": owner_gc,
        "address": address,
        "contact": contact,
        "bid_number": bid_number,
        "markup_pct": markup_pct,
        "contingency_pct": contingency_pct,
    }

    calc = run_calculation_engine(quadrant_results, project_info)

    try:
        pdf_bytes_out = generate_bid_pdf(calc, project_info, file.filename or "blueprint.pdf")
        pdf_b64 = base64.b64encode(pdf_bytes_out).decode("utf-8")
    except Exception as e:
        pdf_b64 = None
        calc["pdfError"] = str(e)

    return {
        "success": True,
        "projectName": project_name,
        "quadrantResults": quadrant_results,
        "calculation": calc,
        "bidPdfBase64": pdf_b64,
        "filename": f"Bid_{project_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT_BLUEPRINT", 8090))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

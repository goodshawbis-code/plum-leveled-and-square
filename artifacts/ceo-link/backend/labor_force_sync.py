"""Labor Force Sync Hooks — ported from artifacts/api-server/src/routes/segments.ts
Provides segment CRUD, crew tracking, and field-update synchronization for the CEO-Link pod."""
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid


class Segment(BaseModel):
    id: str
    blueprintId: str
    label: str
    materialType: str
    lengthFt: float
    heightFt: float
    status: str
    fieldNotes: Optional[str] = None
    completedAt: Optional[str] = None
    createdAt: str
    assignedCrew: Optional[str] = None


class CrewMember(BaseModel):
    id: str
    name: str
    role: str
    status: str


class CreateSegmentBody(BaseModel):
    label: str
    materialType: str
    lengthFt: float
    heightFt: float


class UpdateSegmentBody(BaseModel):
    label: Optional[str] = None
    materialType: Optional[str] = None
    lengthFt: Optional[float] = None
    heightFt: Optional[float] = None
    status: Optional[str] = None
    assignedCrew: Optional[str] = None


class UpdateFieldBody(BaseModel):
    fieldNotes: Optional[str] = None
    completedAt: Optional[str] = None


_segments: List[Segment] = [
    Segment(id="s1", blueprintId="bp1", label="North Wall Section A", materialType="cmu",
            lengthFt=42, heightFt=12, status="completed",
            fieldNotes="Clean install, no obstructions",
            completedAt="2025-06-15T14:30:00Z", createdAt="2025-06-10T08:00:00Z", assignedCrew="c1"),
    Segment(id="s2", blueprintId="bp1", label="North Wall Section B", materialType="cmu",
            lengthFt=38, heightFt=12, status="in_progress",
            fieldNotes="Rebar placement started",
            completedAt=None, createdAt="2025-06-10T08:00:00Z", assignedCrew="c2"),
    Segment(id="s3", blueprintId="bp1", label="East Facade Veneer", materialType="brick",
            lengthFt=65, heightFt=28, status="pending",
            fieldNotes=None, completedAt=None, createdAt="2025-06-12T09:00:00Z", assignedCrew=None),
    Segment(id="s4", blueprintId="bp1", label="Retaining Wall South", materialType="stone",
            lengthFt=80, heightFt=6, status="pending",
            fieldNotes=None, completedAt=None, createdAt="2025-06-13T10:00:00Z", assignedCrew=None),
    Segment(id="s5", blueprintId="bp1", label="Interior Partition C", materialType="cmu",
            lengthFt=24, heightFt=10, status="in_progress",
            fieldNotes="Electrical conduit conflicts at 6ft",
            completedAt=None, createdAt="2025-06-14T07:30:00Z", assignedCrew="c3"),
]

_crew: List[CrewMember] = [
    CrewMember(id="c1", name="Marcus Johnson", role="foreman", status="active"),
    CrewMember(id="c2", name="Dwayne Carter", role="journeyman", status="active"),
    CrewMember(id="c3", name="Tyler Reed", role="journeyman", status="active"),
    CrewMember(id="c4", name="Jason Hill", role="apprentice", status="idle"),
    CrewMember(id="c5", name="Brian Torres", role="apprentice", status="off_site"),
]


def list_segments(blueprint_id: str) -> List[Segment]:
    return [s for s in _segments if s.blueprintId == blueprint_id]


def create_segment(blueprint_id: str, body: CreateSegmentBody) -> Segment:
    seg = Segment(
        id=f"s{uuid.uuid4().hex[:8]}",
        blueprintId=blueprint_id,
        label=body.label,
        materialType=body.materialType,
        lengthFt=body.lengthFt,
        heightFt=body.heightFt,
        status="pending",
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    _segments.append(seg)
    return seg


def get_segment(segment_id: str) -> Optional[Segment]:
    return next((s for s in _segments if s.id == segment_id), None)


def update_segment(segment_id: str, body: UpdateSegmentBody) -> Optional[Segment]:
    for i, s in enumerate(_segments):
        if s.id == segment_id:
            data = s.model_dump()
            updates = body.model_dump(exclude_none=True)
            data.update(updates)
            _segments[i] = Segment(**data)
            return _segments[i]
    return None


def update_segment_field(segment_id: str, body: UpdateFieldBody) -> Optional[Segment]:
    for i, s in enumerate(_segments):
        if s.id == segment_id:
            data = s.model_dump()
            if body.fieldNotes is not None:
                data["fieldNotes"] = body.fieldNotes
            if body.completedAt is not None:
                data["completedAt"] = body.completedAt
                data["status"] = "completed"
            _segments[i] = Segment(**data)
            return _segments[i]
    return None


def delete_segment(segment_id: str) -> bool:
    global _segments
    before = len(_segments)
    _segments = [s for s in _segments if s.id != segment_id]
    return len(_segments) < before


def list_crew() -> List[CrewMember]:
    return list(_crew)

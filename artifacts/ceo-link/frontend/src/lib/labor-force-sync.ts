/**
 * Labor Force Sync — Client-side state hooks
 * Ported from artifacts/api-server/src/routes/segments.ts
 * Multi-target: iPhone, iPad, Watch
 */

export interface Segment {
  id: string;
  blueprintId: string;
  label: string;
  materialType: string;
  lengthFt: number;
  heightFt: number;
  status: "pending" | "in_progress" | "completed";
  fieldNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  assignedCrew: string | null;
}

export interface CrewMember {
  id: string;
  name: string;
  role: "foreman" | "journeyman" | "apprentice";
  status: "active" | "idle" | "off_site";
}

export interface SyncEvent {
  id: string;
  type: "segment_started" | "segment_completed" | "crew_assigned" | "photo_uploaded" | "note_added";
  segmentId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const SEGMENTS: Segment[] = [
  { id: "s1", blueprintId: "bp1", label: "North Wall Section A", materialType: "cmu", lengthFt: 42, heightFt: 12, status: "completed", fieldNotes: "Clean install, no obstructions", completedAt: "2025-06-15T14:30:00Z", createdAt: "2025-06-10T08:00:00Z", assignedCrew: "c1" },
  { id: "s2", blueprintId: "bp1", label: "North Wall Section B", materialType: "cmu", lengthFt: 38, heightFt: 12, status: "in_progress", fieldNotes: "Rebar placement started", completedAt: null, createdAt: "2025-06-10T08:00:00Z", assignedCrew: "c2" },
  { id: "s3", blueprintId: "bp1", label: "East Facade Veneer", materialType: "brick", lengthFt: 65, heightFt: 28, status: "pending", fieldNotes: null, completedAt: null, createdAt: "2025-06-12T09:00:00Z", assignedCrew: null },
  { id: "s4", blueprintId: "bp1", label: "Retaining Wall South", materialType: "stone", lengthFt: 80, heightFt: 6, status: "pending", fieldNotes: null, completedAt: null, createdAt: "2025-06-13T10:00:00Z", assignedCrew: null },
  { id: "s5", blueprintId: "bp1", label: "Interior Partition C", materialType: "cmu", lengthFt: 24, heightFt: 10, status: "in_progress", fieldNotes: "Electrical conduit conflicts at 6ft", completedAt: null, createdAt: "2025-06-14T07:30:00Z", assignedCrew: "c3" },
];

const CREW: CrewMember[] = [
  { id: "c1", name: "Marcus Johnson", role: "foreman", status: "active" },
  { id: "c2", name: "Dwayne Carter", role: "journeyman", status: "active" },
  { id: "c3", name: "Tyler Reed", role: "journeyman", status: "active" },
  { id: "c4", name: "Jason Hill", role: "apprentice", status: "idle" },
  { id: "c5", name: "Brian Torres", role: "apprentice", status: "off_site" },
];

const EVENTS: SyncEvent[] = [
  { id: "e1", type: "segment_completed", segmentId: "s1", timestamp: "2025-06-15T14:30:00Z", payload: { duration_hours: 18 } },
  { id: "e2", type: "crew_assigned", segmentId: "s2", timestamp: "2025-06-14T08:00:00Z", payload: { crewId: "c2" } },
  { id: "e3", type: "segment_started", segmentId: "s5", timestamp: "2025-06-14T07:30:00Z", payload: {} },
  { id: "e4", type: "note_added", segmentId: "s5", timestamp: "2025-06-14T11:00:00Z", payload: { note: "Electrical conduit conflicts at 6ft" } },
];

export function getSegments(): Segment[] { return [...SEGMENTS]; }
export function getCrewMembers(): CrewMember[] { return [...CREW]; }
export function getSyncEvents(): SyncEvent[] { return [...EVENTS]; }
export function getSegmentById(id: string): Segment | undefined { return SEGMENTS.find(s => s.id === id); }
export function getActiveCrewCount(): number { return CREW.filter(c => c.status === "active").length; }
export function getCompletionRate(): number {
  const total = SEGMENTS.length;
  const done = SEGMENTS.filter(s => s.status === "completed").length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
export function getPendingSegments(): Segment[] { return SEGMENTS.filter(s => s.status === "pending"); }
export function getInProgressSegments(): Segment[] { return SEGMENTS.filter(s => s.status === "in_progress"); }

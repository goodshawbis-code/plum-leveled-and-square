/**
 * Construction Control Center — iPad Split-Panel Layout
 * 320px sidebar with Labor Force Segments
 * Main panel: KPI strip + detail/sync feed
 * Preserves Solid Gold/Navy palette
 */
import { useState } from 'react'
import Header from '../components/Header'
import { getSegments, getCrewMembers, getSyncEvents, getCompletionRate, getActiveCrewCount, type Segment, type SyncEvent } from '../lib/labor-force-sync'

export default function ControlCenter() {
  const segments = getSegments()
  const crew = getCrewMembers()
  const events = getSyncEvents()
  const completionRate = getCompletionRate()
  const activeCrew = getActiveCrewCount()
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div className="ipad-layout" style={{ display: 'flex', flex: 1 }}>
        {/* 320px Sidebar */}
        <aside className="sidebar" style={{
          width: 320, minWidth: 320,
          borderRight: '1px solid var(--border)',
          background: 'var(--navy-light)',
          overflowY: 'auto', padding: '16px',
        }}>
          <h3 style={{ color: '#D4A84B', fontSize: 14, marginBottom: 12, letterSpacing: '0.5px' }}>
            LABOR FORCE SEGMENTS
          </h3>
          {segments.map(seg => (
            <div key={seg.id} onClick={() => setSelectedSegment(seg)} style={{
              padding: '14px 16px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
              background: selectedSegment?.id === seg.id ? 'rgba(212,168,75,0.1)' : 'transparent',
              border: selectedSegment?.id === seg.id ? '1px solid #D4A84B' : '1px solid #2A2F35',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{seg.label}</span>
                <StatusBadge status={seg.status} />
              </div>
              <div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 4 }}>
                {seg.materialType.toUpperCase()} • {seg.lengthFt}′ × {seg.heightFt}′
              </div>
            </div>
          ))}
        </aside>
        {/* Main Content Panel */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <KpiCard label="Completion" value={`${completionRate}%`} accent="#4CAF50" />
            <KpiCard label="Active Crew" value={`${activeCrew}/${crew.length}`} accent="#D4A84B" />
            <KpiCard label="Segments" value={`${segments.length}`} accent="#D4A84B" />
            <KpiCard label="AI Engine" value="ONLINE" accent="#4CAF50" />
          </div>
          {selectedSegment ? (
            <SegmentDetail segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
          ) : (
            <div>
              <h2 style={{ color: '#D4A84B', marginBottom: 16 }}>Live Sync Feed</h2>
              <div className="card">{events.map(ev => <EventRow key={ev.id} event={ev} />)}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { completed: '#4CAF50', in_progress: '#FF9800', pending: '#A0A0A0' }
  return <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: colors[status], background: `${colors[status]}20`, padding: '3px 8px', borderRadius: 4 }}>{status.replace('_', ' ')}</span>
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 800, color: accent }}>{value}</div><div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 4 }}>{label}</div></div>
}

function SegmentDetail({ segment, onClose }: { segment: Segment; onClose: () => void }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div><h2 style={{ color: '#D4A84B', fontSize: 20 }}>{segment.label}</h2></div>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #D4A84B', color: '#D4A84B', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', minHeight: 32 }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div><div style={{ fontSize: 11, color: '#A0A0A0' }}>Material</div><div style={{ fontSize: 15, fontWeight: 600 }}>{segment.materialType.toUpperCase()}</div></div>
        <div><div style={{ fontSize: 11, color: '#A0A0A0' }}>Dimensions</div><div style={{ fontSize: 15, fontWeight: 600 }}>{segment.lengthFt}′ × {segment.heightFt}′</div></div>
        <div><div style={{ fontSize: 11, color: '#A0A0A0' }}>Status</div><div style={{ fontSize: 15, fontWeight: 600 }}>{segment.status.replace('_', ' ')}</div></div>
        <div><div style={{ fontSize: 11, color: '#A0A0A0' }}>Area</div><div style={{ fontSize: 15, fontWeight: 600 }}>{segment.lengthFt * segment.heightFt} SF</div></div>
      </div>
      {segment.fieldNotes && <div style={{ marginTop: 16, padding: 12, background: '#14181B', borderRadius: 8 }}><div style={{ fontSize: 11, color: '#D4A84B', marginBottom: 4 }}>FIELD NOTES</div><div style={{ fontSize: 14 }}>{segment.fieldNotes}</div></div>}
    </div>
  )
}

function EventRow({ event }: { event: SyncEvent }) {
  const icons: Record<string, string> = { segment_completed: '✅', segment_started: '🏗️', crew_assigned: '👷', photo_uploaded: '📸', note_added: '📝' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #2A2F35' }}>
      <span style={{ fontSize: 20 }}>{icons[event.type] || '📋'}</span>
      <div><div style={{ fontSize: 14, fontWeight: 500 }}>{event.type.replace(/_/g, ' ').toUpperCase()}</div><div style={{ fontSize: 12, color: '#A0A0A0' }}>Segment {event.segmentId} • {new Date(event.timestamp).toLocaleString()}</div></div>
    </div>
  )
}

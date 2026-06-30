/**
 * Foreman Watch — Apple Watch companion layout
 * 3 screens: Overview (ring gauge), Crew (status cards), Progress (bar chart)
 * Constrained to 500px max-width for watch-style presentation
 */
import { useState } from 'react'
import Header from '../components/Header'
import { getSegments, getCrewMembers, getInProgressSegments, getPendingSegments, getCompletionRate, type Segment } from '../lib/labor-force-sync'

type WatchScreen = "overview" | "crew" | "progress"

export default function ForemanWatch() {
  const [screen, setScreen] = useState<WatchScreen>("overview")

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, padding: '24px', maxWidth: 500, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 4, background: '#1C2127', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {(["overview", "crew", "progress"] as WatchScreen[]).map(s => (
            <button key={s} onClick={() => setScreen(s)} style={{
              flex: 1, background: screen === s ? '#D4A84B' : 'transparent',
              color: screen === s ? '#14181B' : '#A0A0A0',
              border: 'none', padding: '10px', fontSize: 13, fontWeight: 600,
              borderRadius: 10, textTransform: 'capitalize', cursor: 'pointer',
            }}>{s}</button>
          ))}
        </div>
        {screen === "overview" && <OverviewScreen />}
        {screen === "crew" && <CrewScreen />}
        {screen === "progress" && <ProgressScreen />}
      </div>
    </div>
  )
}

function OverviewScreen() {
  const inProgress = getInProgressSegments()
  const pending = getPendingSegments()
  const rate = getCompletionRate()
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: '#D4A84B', letterSpacing: '1px', marginBottom: 8 }}>FOREMAN WATCH</div>
        <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="42" stroke="#2A2F35" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="42" stroke="#D4A84B" strokeWidth="8" fill="none" strokeDasharray={`${rate * 2.64} 264`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#D4A84B' }}>{rate}%</div>
            <div style={{ fontSize: 10, color: '#A0A0A0' }}>COMPLETE</div>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#D4A84B', marginBottom: 8, fontWeight: 600 }}>🏗️ IN PROGRESS ({inProgress.length})</div>
        {inProgress.map(s => <WatchRow key={s.id} segment={s} />)}
      </div>
      <div className="card">
        <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 8, fontWeight: 600 }}>⏳ PENDING ({pending.length})</div>
        {pending.map(s => <WatchRow key={s.id} segment={s} />)}
      </div>
    </div>
  )
}

function CrewScreen() {
  const crew = getCrewMembers()
  const statusColors: Record<string, string> = { active: '#4CAF50', idle: '#FF9800', off_site: '#A0A0A0' }
  return (
    <div>
      <h3 style={{ color: '#D4A84B', fontSize: 14, marginBottom: 16 }}>LABOR FORCE STATUS</h3>
      {crew.map(member => (
        <div key={member.id} className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${statusColors[member.status]}30`, border: `2px solid ${statusColors[member.status]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👷</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</div><div style={{ fontSize: 12, color: '#A0A0A0' }}>{member.role}</div></div>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: statusColors[member.status], background: `${statusColors[member.status]}20`, padding: '4px 8px', borderRadius: 4 }}>{member.status.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressScreen() {
  const segments = getSegments()
  const total = segments.length
  const completed = segments.filter(s => s.status === "completed").length
  const inProg = segments.filter(s => s.status === "in_progress").length
  const pending = segments.filter(s => s.status === "pending").length
  return (
    <div>
      <h3 style={{ color: '#D4A84B', fontSize: 14, marginBottom: 16 }}>PROJECT PROGRESS</h3>
      <div className="card" style={{ marginBottom: 16 }}>
        <ProgressBar label="Completed" count={completed} total={total} color="#4CAF50" />
        <ProgressBar label="In Progress" count={inProg} total={total} color="#FF9800" />
        <ProgressBar label="Pending" count={pending} total={total} color="#A0A0A0" />
      </div>
    </div>
  )
}

function WatchRow({ segment }: { segment: Segment }) {
  return <div style={{ padding: '10px 0', borderBottom: '1px solid #2A2F35' }}><div style={{ fontSize: 14, fontWeight: 500 }}>{segment.label}</div><div style={{ fontSize: 12, color: '#A0A0A0' }}>{segment.materialType.toUpperCase()} • {segment.lengthFt * segment.heightFt} SF</div></div>
}

function ProgressBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 13 }}>{label}</span><span style={{ fontSize: 13, color }}>{count}/{total}</span></div>
      <div style={{ height: 6, background: '#14181B', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} /></div>
    </div>
  )
}

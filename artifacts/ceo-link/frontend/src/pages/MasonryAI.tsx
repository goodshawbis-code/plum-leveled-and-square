/**
 * Neural Masonry Count — AI Takeoff Page
 * iPhone-optimized: single-column, large touch targets (44px min)
 * Full CMU/Brick/Stone calculator with Oregon regional pricing
 */
import { useState } from 'react'
import Header from '../components/Header'
import { CMU_PRESETS, BRICK_PRESETS, STONE_PRESETS, calcCmu, calcBrick, calcStone, type CalcResult, type MaterialCategory, type Opening } from '../lib/masonry-calculator'

export default function MasonryAI() {
  const [category, setCategory] = useState<MaterialCategory>("cmu")
  const [lengthFt, setLengthFt] = useState("40")
  const [heightFt, setHeightFt] = useState("10")
  const [wastePct, setWastePct] = useState("5")
  const [presetId, setPresetId] = useState("cmu8std")
  const [wythes, setWythes] = useState<1 | 2>(1)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [result, setResult] = useState<CalcResult | null>(null)

  const runCalculation = () => {
    const l = parseFloat(lengthFt) || 0
    const h = parseFloat(heightFt) || 0
    const w = parseFloat(wastePct) || 5
    if (category === "cmu") {
      const preset = CMU_PRESETS.find(p => p.id === presetId) || CMU_PRESETS[0]
      setResult(calcCmu({ lengthFt: l, heightFt: h, openings, nominalLengthIn: preset.nominalLengthIn, nominalHeightIn: preset.nominalHeightIn, wastePct: w }))
    } else if (category === "brick") {
      const preset = BRICK_PRESETS.find(p => p.id === presetId) || BRICK_PRESETS[0]
      setResult(calcBrick({ lengthFt: l, heightFt: h, openings, nominalLengthIn: preset.nominalLengthIn, nominalHeightIn: preset.nominalHeightIn, wythes, wastePct: w }))
    } else if (category === "stone") {
      const preset = STONE_PRESETS.find(p => p.id === presetId) || STONE_PRESETS[0]
      setResult(calcStone({ lengthFt: l, heightFt: h, openings, wastePct: w, materialLowPerSf: preset.materialLowPerSf, materialHighPerSf: preset.materialHighPerSf, installedLowPerSf: preset.installedLowPerSf, installedHighPerSf: preset.installedHighPerSf }))
    }
  }

  const addOpening = () => setOpenings([...openings, { id: `o${Date.now()}`, label: `Opening ${openings.length + 1}`, widthFt: 3, heightFt: 7 }])
  const removeOpening = (id: string) => setOpenings(openings.filter(o => o.id !== id))

  const getPresets = () => {
    if (category === "cmu") return CMU_PRESETS.map(p => ({ id: p.id, label: p.label }))
    if (category === "brick") return BRICK_PRESETS.map(p => ({ id: p.id, label: p.label }))
    return STONE_PRESETS.map(p => ({ id: p.id, label: p.label }))
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, padding: '24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #D4A84B, #B8922F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧠</div>
          <div><h1 style={{ fontSize: 22, color: '#D4A84B', margin: 0 }}>Neural Masonry Count</h1><p style={{ fontSize: 12, color: '#A0A0A0', margin: 0 }}>AI-Powered Material Takeoff Engine</p></div>
        </div>

        {/* Material Type */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#D4A84B', fontSize: 14, marginBottom: 16 }}>MATERIAL TYPE</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(["cmu", "brick", "stone"] as MaterialCategory[]).map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); setPresetId(cat === "cmu" ? "cmu8std" : cat === "brick" ? "brick_modular" : "basalt"); setResult(null) }} style={{ background: category === cat ? '#D4A84B' : '#14181B', color: category === cat ? '#14181B' : '#EAEAEA', border: `1px solid ${category === cat ? '#D4A84B' : '#2A2F35'}`, padding: '10px 20px', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', borderRadius: 8, cursor: 'pointer', minHeight: 44 }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#D4A84B', fontSize: 14, marginBottom: 16 }}>WALL DIMENSIONS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div><label style={{ fontSize: 12, color: '#A0A0A0', display: 'block', marginBottom: 4 }}>Length (ft)</label><input type="number" value={lengthFt} onChange={e => setLengthFt(e.target.value)} style={{ background: '#1C2127', border: '1px solid #2A2F35', color: '#EAEAEA', padding: '12px', borderRadius: 8, width: '100%', fontSize: 15 }} /></div>
            <div><label style={{ fontSize: 12, color: '#A0A0A0', display: 'block', marginBottom: 4 }}>Height (ft)</label><input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} style={{ background: '#1C2127', border: '1px solid #2A2F35', color: '#EAEAEA', padding: '12px', borderRadius: 8, width: '100%', fontSize: 15 }} /></div>
            <div><label style={{ fontSize: 12, color: '#A0A0A0', display: 'block', marginBottom: 4 }}>Waste %</label><input type="number" value={wastePct} onChange={e => setWastePct(e.target.value)} style={{ background: '#1C2127', border: '1px solid #2A2F35', color: '#EAEAEA', padding: '12px', borderRadius: 8, width: '100%', fontSize: 15 }} /></div>
          </div>
          <div><label style={{ fontSize: 12, color: '#A0A0A0', display: 'block', marginBottom: 4 }}>Preset</label><select value={presetId} onChange={e => setPresetId(e.target.value)} style={{ background: '#1C2127', border: '1px solid #2A2F35', color: '#EAEAEA', padding: '12px', borderRadius: 8, width: '100%', fontSize: 15 }}>{getPresets().map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        </div>

        {/* Run Button */}
        <button onClick={runCalculation} style={{ width: '100%', background: '#D4A84B', color: '#14181B', padding: '16px', fontSize: 16, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 24, minHeight: 52 }}>⚡ RUN NEURAL MASONRY COUNT</button>

        {/* Result */}
        {result && (
          <div className="card" style={{ border: '1px solid #D4A84B' }}>
            <h3 style={{ color: '#D4A84B', fontSize: 14, marginBottom: 16 }}>📊 AI TAKEOFF RESULT</h3>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#D4A84B' }}>{result.totalQuantity.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#A0A0A0' }}>{result.unit} total (incl. {result.wastePct}% waste)</div>
            </div>
            <div style={{ background: '#14181B', borderRadius: 8, padding: 12 }}>
              {result.breakdown.map((line, i) => <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: i < result.breakdown.length - 1 ? '1px solid #2A2F35' : 'none' }}>{line}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

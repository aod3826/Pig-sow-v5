import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { cyclesApi, sowsApi, boarsApi, pensApi, supabase } from '../lib/supabase'

export default function RecordEvent() {
  const { sowId, cycleId } = useParams()
  const [searchParams]     = useSearchParams()
  const step               = searchParams.get('step') || 'mating'
  const navigate           = useNavigate()
  const { worker, farmId } = useAuth()

  const [sow,    setSow]    = useState(null)
  const [cycle,  setCycle]  = useState(null)
  const [boars,  setBoars]  = useState([])
  const [pens,   setPens]   = useState([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    Promise.all([
      sowsApi.get(sowId),
      cycleId !== 'new' ? cyclesApi.getActive(sowId) : Promise.resolve({ data: null }),
      boarsApi.list(farmId),
      pensApi.list(farmId),
    ]).then(([s, c, b, p]) => {
      setSow(s.data)
      setCycle(c.data)
      setBoars(b.data || [])
      setPens(p.data || [])
    })
  }, [sowId, cycleId, farmId])

  const STEPS = {
    mating:     <MatingForm     sow={sow} boars={boars} worker={worker} farmId={farmId} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    heat_check: <HeatCheckForm  cycle={cycle} worker={worker} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    ultrasound: <UltrasoundForm cycle={cycle} worker={worker} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    nutrition:  <NutritionForm  cycle={cycle} worker={worker} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    pen_move:   <PenMoveForm    cycle={cycle} pens={pens} worker={worker} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    farrowing:  <FarrowingForm  cycle={cycle} worker={worker} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    weaning:    <WeaningForm    cycle={cycle} worker={worker} onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
    rebreeding: <MatingForm     sow={sow} boars={boars} worker={worker} farmId={farmId} isRebred onDone={done} onError={setError} saving={saving} setSaving={setSaving} />,
  }

  function done() { navigate(`/sows/${sowId}`) }

  const STEP_LABELS = {
    mating: 'บันทึกการผสมพันธุ์', heat_check: 'บันทึกผลตรวจสัด',
    ultrasound: 'บันทึก Ultrasound', nutrition: 'บันทึกบำรุงอาหาร',
    pen_move: 'ย้ายเข้าคอกคลอด', farrowing: 'บันทึกการคลอด',
    weaning: 'บันทึกการหย่านม', rebreeding: 'บันทึกผสมรอบใหม่',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-farm-800 to-farm-600 px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl">‹</button>
          <div>
            <h1 className="text-white text-lg font-bold">{STEP_LABELS[step] || 'บันทึกข้อมูล'}</h1>
            {sow && <p className="text-farm-200 text-sm">{sow.sow_code}{sow.name ? ` · ${sow.name}` : ''}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}
        {STEPS[step] || <p className="text-gray-500 text-center py-10">ไม่พบขั้นตอนนี้</p>}
      </div>
    </div>
  )
}

// ─── MATING FORM ────────────────────────────────────────────────
function MatingForm({ sow, boars, worker, farmId, isRebred, onDone, onError, saving, setSaving }) {
  const [matingDate, setMatingDate] = useState(new Date().toISOString().slice(0, 10))
  const [boarId,     setBoarId]     = useState('')
  const [method,     setMethod]     = useState('natural')
  const [note,       setNote]       = useState('')

  async function save() {
    if (!sow) return
    setSaving(true)
    onError('')
    // Get next cycle number
    const { data: existing } = await cyclesApi.listBySow(sow.id)
    const nextNum = (existing?.length || 0) + 1

    const { error } = await cyclesApi.create({
      sow_id: sow.id, farm_id: farmId, cycle_number: nextNum,
      mating_date: matingDate, boar_id: boarId || null,
      mating_method: method, mated_by: worker.id,
    })
    if (error) { onError(error.message); setSaving(false); return }
    onDone()
  }

  return (
    <FormCard>
      <DateField label="วันที่ผสมพันธุ์" value={matingDate} onChange={setMatingDate} required />
      <SelectField label="พ่อพันธุ์" value={boarId} onChange={setBoarId}
        options={[{ value: '', label: '— ไม่ระบุ —' }, ...boars.map(b => ({ value: b.id, label: b.boar_code }))]} />
      <SelectField label="วิธีผสม" value={method} onChange={setMethod}
        options={[{ value: 'natural', label: 'ผสมธรรมชาติ' }, { value: 'ai', label: 'ผสมเทียม (AI)' }]} />
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label={isRebred ? 'บันทึกผสมรอบใหม่' : 'บันทึกการผสม'} onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── HEAT CHECK FORM ────────────────────────────────────────────
function HeatCheckForm({ cycle, worker, onDone, onError, saving, setSaving }) {
  const [result, setResult] = useState('')
  const [note,   setNote]   = useState('')

  async function save() {
    if (!result) { onError('กรุณาเลือกผลการตรวจ'); return }
    setSaving(true); onError('')
    const { error } = await cyclesApi.recordHeatCheck(cycle.id, result, note, worker.id)
    if (error) { onError(error.message); setSaving(false); return }
    // If returned heat → mark cycle failed
    if (result === 'returned') {
      await cyclesApi.markFailed(cycle.id, 'returned_heat')
    }
    onDone()
  }

  return (
    <FormCard>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">ผลการตรวจสัด D21</p>
        <div className="space-y-2">
          <OptionBtn label="✅ ไม่พบการกลับสัด (ตั้งท้อง)" active={result === 'no_return'}
            onClick={() => setResult('no_return')} color="green" />
          <OptionBtn label="❌ กลับสัด / ไม่ติด" active={result === 'returned'}
            onClick={() => setResult('returned')} color="red" />
        </div>
      </div>
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label="บันทึกผลตรวจสัด" onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── ULTRASOUND FORM ─────────────────────────────────────────────
function UltrasoundForm({ cycle, worker, onDone, onError, saving, setSaving }) {
  const [result,      setResult]      = useState('')
  const [embryoCount, setEmbryoCount] = useState('')
  const [note,        setNote]        = useState('')

  async function save() {
    if (!result) { onError('กรุณาเลือกผลการตรวจ'); return }
    setSaving(true); onError('')
    const { error } = await cyclesApi.recordUltrasound(cycle.id, result, embryoCount ? parseInt(embryoCount) : null, note, worker.id)
    if (error) { onError(error.message); setSaving(false); return }
    if (result === 'negative') await cyclesApi.markFailed(cycle.id, 'abortion')
    onDone()
  }

  return (
    <FormCard>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">ผล Ultrasound D30</p>
        <div className="space-y-2">
          <OptionBtn label="✅ ยืนยันตั้งท้อง" active={result === 'confirmed'} onClick={() => setResult('confirmed')} color="green" />
          <OptionBtn label="❌ ไม่ท้อง / แท้ง" active={result === 'negative'}  onClick={() => setResult('negative')}  color="red" />
        </div>
      </div>
      {result === 'confirmed' && (
        <NumberField label="จำนวนตัวอ่อน (ถ้าทราบ)" value={embryoCount} onChange={setEmbryoCount} placeholder="เช่น 12" />
      )}
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label="บันทึกผล Ultrasound" onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── NUTRITION FORM ───────────────────────────────────────────────
function NutritionForm({ cycle, worker, onDone, onError, saving, setSaving }) {
  const [note, setNote] = useState('')
  async function save() {
    setSaving(true); onError('')
    const { error } = await supabase.from('breeding_cycles').update({
      nutrition_started_date: new Date().toISOString().slice(0, 10),
      nutrition_noted_by: worker.id,
      updated_at: new Date().toISOString(),
    }).eq('id', cycle.id)
    if (error) { onError(error.message); setSaving(false); return }
    onDone()
  }
  return (
    <FormCard>
      <div className="bg-farm-50 border border-farm-200 rounded-xl p-4 text-sm text-farm-800">
        <p className="font-bold mb-1">📌 เพิ่มปริมาณอาหารระยะท้าย</p>
        <p>กด "บันทึก" เพื่อยืนยันว่าเริ่มให้อาหารเพิ่มแล้วในวันนี้</p>
      </div>
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label="✅ บันทึกเริ่มบำรุงอาหาร" onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── PEN MOVE FORM ────────────────────────────────────────────────
function PenMoveForm({ cycle, pens, worker, onDone, onError, saving, setSaving }) {
  const farrowPens = pens.filter(p => p.pen_type === 'farrowing')
  const [penId, setPenId] = useState('')
  const [note,  setNote]  = useState('')

  async function save() {
    setSaving(true); onError('')
    const { error } = await supabase.from('breeding_cycles').update({
      farrowing_pen_id: penId || null,
      moved_to_farrowing_date: new Date().toISOString().slice(0, 10),
      moved_by: worker.id,
      updated_at: new Date().toISOString(),
    }).eq('id', cycle.id)
    if (error) { onError(error.message); setSaving(false); return }
    // Update sow pen
    if (penId) {
      await supabase.from('sows').update({ pen_id: penId, current_status: 'farrowing_ready', updated_at: new Date().toISOString() }).eq('id', cycle.sow_id)
    }
    onDone()
  }

  return (
    <FormCard>
      <SelectField label="คอกคลอดที่ย้ายเข้า" value={penId} onChange={setPenId}
        options={[{ value: '', label: '— ไม่ระบุ —' }, ...farrowPens.map(p => ({ value: p.id, label: `คอก ${p.pen_code}` }))]} />
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label="🏠 บันทึกการย้ายคอก" onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── FARROWING FORM ───────────────────────────────────────────────
function FarrowingForm({ cycle, worker, onDone, onError, saving, setSaving }) {
  const [bornAlive,  setBornAlive]  = useState('')
  const [bornDead,   setBornDead]   = useState('0')
  const [mummified,  setMummified]  = useState('0')
  const [ease,       setEase]       = useState('easy')
  const [note,       setNote]       = useState('')

  async function save() {
    if (!bornAlive) { onError('กรุณากรอกจำนวนลูกที่คลอดรอด'); return }
    setSaving(true); onError('')
    const { error } = await cyclesApi.recordFarrowing(cycle.id, {
      bornAlive: parseInt(bornAlive), bornDead: parseInt(bornDead) || 0,
      mummified: parseInt(mummified) || 0, ease, note,
    }, worker.id)
    if (error) { onError(error.message); setSaving(false); return }
    onDone()
  }

  return (
    <FormCard>
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="🟢 รอดชีวิต" value={bornAlive} onChange={setBornAlive} placeholder="0" required />
        <NumberField label="🔴 ตายแรกคลอด" value={bornDead} onChange={setBornDead} placeholder="0" />
        <NumberField label="⬛ มัมมี่" value={mummified} onChange={setMummified} placeholder="0" />
      </div>
      <SelectField label="ความยากในการคลอด" value={ease} onChange={setEase}
        options={[
          { value: 'easy', label: '😊 ปกติ' },
          { value: 'assisted', label: '🤝 ช่วยเล็กน้อย' },
          { value: 'difficult', label: '😰 ยาก/ช่วยมาก' },
          { value: 'caesarean', label: '🏥 ผ่าตัดคลอด' },
        ]}
      />
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label="🐽 บันทึกการคลอด" onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── WEANING FORM ─────────────────────────────────────────────────
function WeaningForm({ cycle, worker, onDone, onError, saving, setSaving }) {
  const [weanedCount, setWeanedCount] = useState(cycle?.born_alive || '')
  const [avgWeight,   setAvgWeight]   = useState('')
  const [note,        setNote]        = useState('')

  async function save() {
    if (!weanedCount) { onError('กรุณากรอกจำนวนลูกที่หย่านม'); return }
    setSaving(true); onError('')
    const { error } = await cyclesApi.recordWeaning(cycle.id, parseInt(weanedCount), avgWeight ? parseFloat(avgWeight) : null, note, worker.id)
    if (error) { onError(error.message); setSaving(false); return }
    onDone()
  }

  return (
    <FormCard>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
        คลอดมา {cycle?.born_alive || 0} ตัว
      </div>
      <NumberField label="จำนวนลูกที่หย่านม" value={weanedCount} onChange={setWeanedCount} placeholder="0" required />
      <NumberField label="น้ำหนักเฉลี่ย (กก.)" value={avgWeight} onChange={setAvgWeight} placeholder="เช่น 6.5" step="0.1" />
      <TextArea label="หมายเหตุ" value={note} onChange={setNote} />
      <SaveBtn label="🍼 บันทึกการหย่านม" onClick={save} saving={saving} />
    </FormCard>
  )
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────
const input = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-100 bg-white transition'

function FormCard({ children }) {
  return <div className="space-y-4">{children}</div>
}

function DateField({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}{required && ' *'}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className={input} required={required} />
    </div>
  )
}

function NumberField({ label, value, onChange, placeholder, required, step }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}{required && ' *'}</label>
      <input type="number" min="0" step={step || '1'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className={input} required={required} />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={input}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        rows={3} placeholder="ไม่บังคับ..." className={`${input} resize-none`} />
    </div>
  )
}

function OptionBtn({ label, active, onClick, color }) {
  const colors = {
    green: active ? 'bg-farm-700 text-white border-farm-700' : 'bg-white text-gray-700 border-gray-200',
    red:   active ? 'bg-red-600 text-white border-red-600'   : 'bg-white text-gray-700 border-gray-200',
  }
  return (
    <button type="button" onClick={onClick}
      className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-semibold text-left transition ${colors[color] || colors.green}`}>
      {label}
    </button>
  )
}

function SaveBtn({ label, onClick, saving }) {
  return (
    <button type="button" onClick={onClick} disabled={saving}
      className="w-full bg-farm-700 hover:bg-farm-800 text-white font-bold py-4 rounded-xl transition disabled:opacity-60 mt-2">
      {saving ? 'กำลังบันทึก...' : label}
    </button>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sowsApi, pensApi } from '../lib/supabase'

export default function AddSow() {
  const { id }     = useParams() // present when editing
  const navigate   = useNavigate()
  const { farmId, worker } = useAuth()
  const isEdit = !!id

  const [pens,     setPens]    = useState([])
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState('')
  const [form, setForm] = useState({
    sow_code: '', name: '', breed: '', birth_date: '',
    ear_tag: '', pen_id: '', note: '',
  })

  useEffect(() => {
    pensApi.list(farmId).then(({ data }) => setPens(data || []))
    if (isEdit) {
      sowsApi.get(id).then(({ data }) => {
        if (data) setForm({
          sow_code:   data.sow_code || '',
          name:       data.name || '',
          breed:      data.breed || '',
          birth_date: data.birth_date || '',
          ear_tag:    data.ear_tag || '',
          pen_id:     data.pen_id || '',
          note:       data.note || '',
        })
      })
    }
  }, [farmId, id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.sow_code.trim()) { setError('กรุณากรอกรหัสแม่หมู'); return }
    setSaving(true)
    const payload = {
      farm_id:    farmId,
      sow_code:   form.sow_code.trim().toUpperCase(),
      name:       form.name.trim() || null,
      breed:      form.breed.trim() || null,
      birth_date: form.birth_date || null,
      ear_tag:    form.ear_tag.trim() || null,
      pen_id:     form.pen_id || null,
      note:       form.note.trim() || null,
      registered_by: worker.id,
    }
    const { data, error: err } = isEdit
      ? await sowsApi.update(id, payload)
      : await sowsApi.create(payload)

    if (err) {
      setError(err.code === '23505' ? 'รหัสแม่หมูซ้ำกับที่มีอยู่แล้ว' : err.message)
      setSaving(false)
      return
    }
    navigate(isEdit ? `/sows/${id}` : `/sows/${data.id}`)
  }

  async function handleDelete() {
    if (!confirm('ยืนยันการคัดทิ้งแม่หมูตัวนี้?')) return
    await sowsApi.update(id, { current_status: 'culled', is_active: false })
    navigate('/sows')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-farm-800 to-farm-600 px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl">
            ‹
          </button>
          <h1 className="text-white text-xl font-bold">
            {isEdit ? 'แก้ไขข้อมูลแม่หมู' : 'เพิ่มแม่หมูใหม่'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4">

        <Field label="รหัสแม่หมู *" hint="เช่น A001, B002">
          <input
            value={form.sow_code}
            onChange={e => set('sow_code', e.target.value.toUpperCase())}
            placeholder="A001"
            className={input}
            required
          />
        </Field>

        <Field label="ชื่อเล่น / ป้ายกำกับ">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ไม่บังคับ" className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="สายพันธุ์">
            <select value={form.breed} onChange={e => set('breed', e.target.value)} className={input}>
              <option value="">— เลือก —</option>
              {['Large White','Landrace','Duroc','Yorkshire','PIC','F1','ลูกผสม','อื่นๆ'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="วันเกิด">
            <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={input} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="หมายเลขป้ายหู">
            <input value={form.ear_tag} onChange={e => set('ear_tag', e.target.value)} placeholder="เช่น 1234" className={input} />
          </Field>
          <Field label="คอก">
            <select value={form.pen_id} onChange={e => set('pen_id', e.target.value)} className={input}>
              <option value="">— เลือก —</option>
              {pens.map(p => (
                <option key={p.id} value={p.id}>{p.pen_code} ({PEN_TYPE[p.pen_type] || p.pen_type})</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="หมายเหตุ">
          <textarea value={form.note} onChange={e => set('note', e.target.value)}
            rows={3} placeholder="ข้อมูลเพิ่มเติม..." className={`${input} resize-none`} />
        </Field>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <button type="submit" disabled={saving} className="w-full bg-farm-700 hover:bg-farm-800 text-white font-bold py-4 rounded-xl transition disabled:opacity-60">
          {saving ? 'กำลังบันทึก...' : isEdit ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มแม่หมู'}
        </button>

        {isEdit && (
          <button type="button" onClick={handleDelete} className="w-full border border-red-300 text-red-500 font-semibold py-3 rounded-xl">
            🗑 คัดทิ้งแม่หมูตัวนี้
          </button>
        )}

      </form>
    </div>
  )
}

const input = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-100 bg-white transition'

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}
        {hint && <span className="font-normal text-gray-400 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

const PEN_TYPE = {
  mating: 'ผสมพันธุ์', gestation: 'ตั้งท้อง', farrowing: 'คลอด', nursery: 'เลี้ยงลูก', boar: 'พ่อพันธุ์',
}

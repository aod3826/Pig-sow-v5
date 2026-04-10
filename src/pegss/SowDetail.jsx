import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { sowsApi, cyclesApi, eventsApi, alertsApi } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/StatusBadge'
import MilestoneTimeline from '../components/MilestoneTimeline'

const fmt = d => d ? format(parseISO(d), 'd MMM yyyy', { locale: th }) : '—'

export default function SowDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { farmId } = useAuth()
  const [sow,     setSow]     = useState(null)
  const [cycle,   setCycle]   = useState(null)
  const [history, setHistory] = useState([])
  const [events,  setEvents]  = useState([])
  const [alerts,  setAlerts]  = useState([])
  const [tab,     setTab]     = useState('timeline') // timeline | history | health
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [s, c, h, a] = await Promise.all([
      sowsApi.get(id),
      cyclesApi.getActive(id),
      cyclesApi.listBySow(id),
      alertsApi.today(farmId),
    ])
    setSow(s.data)
    setCycle(c.data)
    setHistory(h.data || [])
    setAlerts((a.data || []).filter(x => x.sow_id === id))
    if (c.data) {
      const ev = await eventsApi.listByCycle(c.data.id)
      setEvents(ev.data || [])
    }
    setLoading(false)
  }

  if (loading) return <LoadingScreen />
  if (!sow)    return <NotFound onBack={() => navigate('/sows')} />

  const urgentAlerts = alerts.filter(a => a.priority === 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-farm-800 to-farm-600 px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white active:opacity-70">
            ‹
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-white text-xl font-bold">{sow.sow_code}</h1>
              {sow.name && <span className="text-farm-200 text-sm">· {sow.name}</span>}
            </div>
          </div>
          <button
            onClick={() => navigate(`/sows/${id}/edit`)}
            className="text-white/80 text-xs bg-white/20 px-3 py-1.5 rounded-lg"
          >
            แก้ไข
          </button>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={sow.current_status} size="lg" />
          {sow.pens?.pen_code && (
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
              คอก {sow.pens.pen_code}
            </span>
          )}
          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
            ครอกที่ {sow.parity}
          </span>
        </div>
      </div>

      {/* Alert banner */}
      {urgentAlerts.length > 0 && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-red-700 text-sm font-bold">🚨 ต้องดำเนินการด่วน!</p>
          {urgentAlerts.map(a => (
            <p key={a.id} className="text-red-600 text-xs mt-0.5">{a.message_text}</p>
          ))}
        </div>
      )}

      {/* Info cards */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <InfoCard label="วันผสมพันธุ์"   value={fmt(cycle?.mating_date)} />
        <InfoCard label="วันคาดคลอด"     value={fmt(cycle?.due_farrowing_date)} highlight={!!cycle?.due_farrowing_date} />
        <InfoCard label="ลูกรอดสะสม"     value={sow.total_born_alive ? `${sow.total_born_alive} ตัว` : '—'} />
        <InfoCard label="รวมทั้งหมด"      value={`${sow.total_litters || 0} ครอก`} />
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-5 bg-gray-100 rounded-xl p-1 gap-1">
        {[
          { key: 'timeline', label: '📅 Timeline' },
          { key: 'history',  label: '📜 ประวัติ' },
          { key: 'events',   label: '📝 บันทึก' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.key ? 'bg-white shadow text-farm-700' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'timeline' && (
          cycle
            ? <MilestoneTimeline cycle={cycle} sowId={id} />
            : <EmptyCycle onMate={() => navigate(`/sows/${id}/record/new?step=mating`)} />
        )}

        {tab === 'history' && (
          <HistoryTab history={history} />
        )}

        {tab === 'events' && (
          <EventsTab events={events} />
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3.5 ${highlight ? 'bg-farm-50 border border-farm-200' : 'bg-white border border-gray-100'}`}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-farm-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}

function EmptyCycle({ onMate }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🐷</div>
      <p className="text-gray-600 font-semibold">ยังไม่มีรอบการผสม</p>
      <button
        onClick={onMate}
        className="mt-4 bg-farm-700 text-white font-bold px-6 py-3 rounded-xl"
      >
        + บันทึกการผสมพันธุ์
      </button>
    </div>
  )
}

function HistoryTab({ history }) {
  if (!history.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีประวัติ</div>
  )
  return (
    <div className="space-y-3">
      {history.map((c, i) => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-800 text-sm">ครอกที่ {c.cycle_number}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              c.status === 'completed' ? 'bg-farm-100 text-farm-700' :
              c.status === 'failed'    ? 'bg-red-100 text-red-600'   : 'bg-amber-100 text-amber-700'
            }`}>
              {c.status === 'completed' ? 'สำเร็จ' : c.status === 'failed' ? 'ล้มเหลว' : 'กำลังดำเนินการ'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>ผสม: {fmt(c.mating_date)}</span>
            {c.actual_farrowing_date && <span>คลอด: {fmt(c.actual_farrowing_date)}</span>}
            {c.born_alive !== null && c.born_alive !== undefined && <span>รอด: {c.born_alive} ตัว</span>}
            {c.weaned_count > 0 && <span>หย่านม: {c.weaned_count} ตัว</span>}
            {c.failure_reason && <span className="col-span-2 text-red-500">สาเหตุ: {c.failure_reason}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function EventsTab({ events }) {
  if (!events.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีบันทึก</div>
  )
  const eventIcon = {
    mating: '💉', heat_check: '🔍', ultrasound: '🔬',
    farrowing: '🐽', weaning: '🍼', pen_move: '🏠',
    nutrition_start: '🌾', note: '📝', health_event: '💊',
  }
  return (
    <div className="space-y-2">
      {events.map(e => (
        <div key={e.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-2">
            <span>{eventIcon[e.event_type] || '📋'}</span>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold text-gray-800 capitalize">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                <span className="text-xs text-gray-400">{fmt(e.event_date)}</span>
              </div>
              {e.result && <p className="text-xs text-gray-600 mt-0.5">{e.result}</p>}
              {e.note && <p className="text-xs text-gray-400 mt-0.5 italic">{e.note}</p>}
              {e.workers?.nickname && <p className="text-xs text-gray-300 mt-0.5">โดย {e.workers.nickname}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const EVENT_LABELS = {
  mating: 'ผสมพันธุ์', heat_check: 'ตรวจสัด', ultrasound: 'อัลตราซาวด์',
  nutrition_start: 'เริ่มบำรุงอาหาร', pen_move: 'ย้ายคอก', farrowing: 'คลอด',
  nursing_start: 'เริ่มเลี้ยงลูก', weaning: 'หย่านม', status_change: 'เปลี่ยนสถานะ',
  note: 'บันทึก', health_event: 'เหตุการณ์สุขภาพ', failure: 'รอบล้มเหลว',
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-farm-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  )
}

function NotFound({ onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">ไม่พบข้อมูลแม่หมู</p>
        <button onClick={onBack} className="text-farm-700 font-semibold">← กลับ</button>
      </div>
    </div>
  )
}

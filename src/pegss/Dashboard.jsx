import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { kpiApi, alertsApi, cyclesApi } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { worker, farmId, signOut } = useAuth()
  const navigate = useNavigate()
  const [kpi,      setKpi]      = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!farmId) return
    Promise.all([
      kpiApi.get(farmId),
      alertsApi.today(farmId),
      cyclesApi.listActive(farmId),
    ]).then(([k, a, c]) => {
      setKpi(k.data)
      setAlerts((a.data || []).filter(x => x.days_overdue >= 0).slice(0, 5))
      // upcoming farrowings in next 14 days
      setUpcoming((c.data || []).filter(x => x.days_to_farrow >= 0 && x.days_to_farrow <= 14).slice(0, 5))
      setLoading(false)
    })
  }, [farmId])

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: th })

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-farm-800 via-farm-700 to-farm-600 px-5 pt-12 pb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-farm-200 text-xs">{today}</p>
            <h1 className="text-white text-xl font-bold mt-0.5">
              {worker?.farms?.name || 'ฟาร์มแม่หมู'}
            </h1>
            <p className="text-farm-200 text-sm">สวัสดี, {worker?.nickname || worker?.full_name} 👋</p>
          </div>
          <button onClick={signOut} className="text-farm-300 text-xs py-1 px-2 rounded-lg bg-farm-900/30 active:opacity-70">
            ออก
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {[
            { num: kpi?.active_sows     ?? '—', label: 'ทั้งหมด' },
            { num: kpi?.pregnant_count  ?? '—', label: 'ตั้งท้อง' },
            { num: kpi?.near_farrowing  ?? '—', label: 'ใกล้คลอด' },
            { num: kpi?.nursing_count   ?? '—', label: 'เลี้ยงลูก' },
          ].map((s, i) => (
            <div key={i} className="bg-white/15 rounded-xl p-2.5 text-center">
              <div className="text-white text-xl font-bold">{s.num}</div>
              <div className="text-farm-200 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Urgent Alerts */}
        {alerts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800 text-sm">🔔 ต้องดำเนินการ</h2>
              <button onClick={() => navigate('/alerts')} className="text-xs text-farm-700 font-semibold">ดูทั้งหมด →</button>
            </div>
            <div className="space-y-2">
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onClick={() => navigate(`/sows/${alert.sow_id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming farrowings */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 text-sm mb-3">🐽 คลอดใน 14 วันนี้</h2>
            <div className="space-y-2">
              {upcoming.map(c => (
                <div
                  key={c.cycle_id}
                  onClick={() => navigate(`/sows/${c.sow_id}`)}
                  className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-gray-800 text-sm">{c.sow_code}</span>
                    {c.sow_name && <span className="text-gray-400 text-xs ml-1">· {c.sow_name}</span>}
                    <div className="text-xs text-gray-500 mt-0.5">
                      คอก {c.pen_code || '—'} · ครอกที่ {c.cycle_number}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${c.days_to_farrow <= 3 ? 'text-red-500' : 'text-amber-600'}`}>
                    {c.days_to_farrow === 0 ? '🚨 วันนี้!' : `${c.days_to_farrow} วัน`}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && alerts.length === 0 && upcoming.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-gray-600 font-semibold">ไม่มีงานค้างวันนี้</p>
            <p className="text-gray-400 text-sm mt-1">ระบบทำงานปกติ</p>
          </div>
        )}

        {/* Quick actions */}
        <section>
          <h2 className="font-bold text-gray-800 text-sm mb-3">⚡ ทางลัด</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickCard icon="➕" label="เพิ่มแม่หมูใหม่" color="bg-farm-50 border-farm-200"  onClick={() => navigate('/sows/add')} />
            <QuickCard icon="📋" label="รายชื่อแม่หมู"   color="bg-blue-50 border-blue-200"  onClick={() => navigate('/sows')} />
            <QuickCard icon="⚠️" label="การแจ้งเตือน"  color="bg-amber-50 border-amber-200" onClick={() => navigate('/alerts')} />
            <QuickCard icon="🔍" label="ค้นหา"         color="bg-purple-50 border-purple-200" onClick={() => navigate('/sows')} />
          </div>
        </section>

      </div>
    </div>
  )
}

function AlertCard({ alert, onClick }) {
  const isUrgent = alert.priority === 1
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 flex items-start gap-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer ${
        isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <span className="text-xl shrink-0">{isUrgent ? '🚨' : '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800 text-sm">{alert.sow_code}</span>
          <StatusBadge status={alert.current_status} />
        </div>
        <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
          {alert.message_text}
        </p>
        {alert.days_overdue > 0 && (
          <p className="text-xs text-red-500 font-semibold">เกินกำหนด {alert.days_overdue} วัน</p>
        )}
      </div>
    </div>
  )
}

function QuickCard({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${color} border rounded-xl p-4 text-left active:scale-[0.97] transition-transform w-full`}
    >
      <div className="text-2xl mb-1.5">{icon}</div>
      <div className="text-sm font-semibold text-gray-700">{label}</div>
    </button>
  )
}

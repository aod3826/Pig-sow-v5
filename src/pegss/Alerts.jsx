import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { alertsApi } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const ALERT_ICON = {
  heat_check_due:      '🔍',
  ultrasound_due:      '🔬',
  nutrition_start_due: '🌾',
  farrowing_move_due:  '🏠',
  farrowing_due:       '🐽',
  weaning_due:         '🍼',
  rebreeding_due:      '💉',
  overdue:             '🚨',
}

const STEP_KEY = {
  heat_check_due:      'heat_check',
  ultrasound_due:      'ultrasound',
  nutrition_start_due: 'nutrition',
  farrowing_move_due:  'pen_move',
  farrowing_due:       'farrowing',
  weaning_due:         'weaning',
  rebreeding_due:      'rebreeding',
}

export default function Alerts() {
  const { farmId, worker } = useAuth()
  const navigate  = useNavigate()
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all') // all | urgent | today | upcoming

  useEffect(() => { load() }, [farmId])

  async function load() {
    if (!farmId) return
    setLoading(true)
    const { data } = await alertsApi.today(farmId)
    setAlerts(data || [])
    setLoading(false)
  }

  async function handleAck(alertId) {
    await alertsApi.acknowledge(alertId, worker.id)
    setAlerts(a => a.map(x => x.id === alertId ? { ...x, alert_status: 'acknowledged' } : x))
  }

  const filtered = alerts.filter(a => {
    if (filter === 'urgent') return a.priority === 1
    if (filter === 'today')  return a.days_overdue === 0
    if (filter === 'overdue') return a.days_overdue > 0
    return true
  })

  const counts = {
    all:     alerts.length,
    urgent:  alerts.filter(a => a.priority === 1).length,
    today:   alerts.filter(a => a.days_overdue === 0).length,
    overdue: alerts.filter(a => a.days_overdue > 0).length,
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-farm-800 to-farm-600 px-5 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold mb-4">🔔 การแจ้งเตือน</h1>
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all',     label: `ทั้งหมด (${counts.all})` },
            { key: 'urgent',  label: `🚨 ด่วน (${counts.urgent})` },
            { key: 'overdue', label: `⚠️ เกินกำหนด (${counts.overdue})` },
            { key: 'today',   label: `📅 วันนี้ (${counts.today})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                filter === f.key ? 'bg-white text-farm-700' : 'bg-white/20 text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-farm-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-gray-600 font-semibold">ไม่มีการแจ้งเตือน</p>
            <p className="text-gray-400 text-sm mt-1">ทุกอย่างเรียบร้อยดี</p>
          </div>
        ) : (
          filtered.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAction={() => navigate(`/sows/${alert.sow_id}/record/${alert.cycle_id}?step=${STEP_KEY[alert.alert_type] || 'mating'}`)}
              onView={()   => navigate(`/sows/${alert.sow_id}`)}
              onAck={()    => handleAck(alert.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function AlertItem({ alert, onAction, onView, onAck }) {
  const isUrgent   = alert.priority === 1
  const isOverdue  = alert.days_overdue > 0
  const isAcked    = alert.alert_status === 'acknowledged'

  const borderCls = isUrgent  ? 'border-red-200'    :
                    isOverdue ? 'border-amber-300'   : 'border-gray-100'
  const bgCls     = isUrgent  ? 'bg-red-50'         :
                    isOverdue ? 'bg-amber-50'        : 'bg-white'

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${bgCls} ${borderCls} ${isAcked ? 'opacity-60' : ''}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">{ALERT_ICON[alert.alert_type] || '🔔'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800 text-sm">{alert.sow_code}</span>
              <StatusBadge status={alert.current_status} />
              {isUrgent && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">ด่วน!</span>}
            </div>
            <p className={`text-sm font-medium mt-0.5 ${isUrgent ? 'text-red-700' : isOverdue ? 'text-amber-800' : 'text-gray-700'}`}>
              {alert.message_text}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>
                {isOverdue
                  ? `เกินกำหนด ${alert.days_overdue} วัน`
                  : `กำหนด ${format(parseISO(alert.due_date), 'd MMM', { locale: th })}`
                }
              </span>
              {alert.pen_code && <span>คอก {alert.pen_code}</span>}
              <span>ครอกที่ {alert.cycle_number}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isAcked && (
        <div className="flex border-t border-gray-100">
          <button onClick={onView} className="flex-1 py-2.5 text-xs font-semibold text-gray-500 active:bg-gray-50">
            ดูรายละเอียด
          </button>
          <div className="w-px bg-gray-100" />
          <button onClick={onAck} className="flex-1 py-2.5 text-xs font-semibold text-gray-400 active:bg-gray-50">
            รับทราบ
          </button>
          <div className="w-px bg-gray-100" />
          <button onClick={onAction}
            className={`flex-1 py-2.5 text-xs font-bold active:opacity-80 ${
              isUrgent ? 'text-red-600' : 'text-farm-700'
            }`}>
            บันทึก →
          </button>
        </div>
      )}
      {isAcked && (
        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
          ✓ รับทราบแล้ว
        </div>
      )}
    </div>
  )
}

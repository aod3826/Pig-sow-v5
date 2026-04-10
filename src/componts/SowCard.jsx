import { useNavigate } from 'react-router-dom'
import { differenceInDays, format } from 'date-fns'
import { th } from 'date-fns/locale'
import StatusBadge from './StatusBadge'

export default function SowCard({ sow, cycle, alerts = [] }) {
  const navigate = useNavigate()
  const urgentAlert  = alerts.find(a => a.priority === 1)
  const anyAlert     = alerts[0]
  const hasAlert     = alerts.length > 0

  const daysSinceMating = cycle?.mating_date
    ? differenceInDays(new Date(), new Date(cycle.mating_date))
    : null

  const daysToFarrow = cycle?.due_farrowing_date
    ? differenceInDays(new Date(cycle.due_farrowing_date), new Date())
    : null

  const progress = daysSinceMating !== null
    ? Math.min(100, Math.round((daysSinceMating / 114) * 100))
    : null

  return (
    <div
      onClick={() => navigate(`/sows/${sow.id}`)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
    >
      {/* Alert bar */}
      {hasAlert && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${urgentAlert ? 'bg-red-400' : 'bg-amber-400'}`} />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-base">{sow.sow_code}</span>
            {sow.name && <span className="text-gray-400 text-sm">· {sow.name}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={sow.current_status} />
            {sow.pens?.pen_code && (
              <span className="text-xs text-gray-400">คอก {sow.pens.pen_code}</span>
            )}
            {sow.parity > 0 && (
              <span className="text-xs text-gray-400">ครอกที่ {sow.parity}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-300 text-lg shrink-0">
          {hasAlert && (
            <span className="text-base">{urgentAlert ? '🚨' : '⚠️'}</span>
          )}
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      {/* Alert message */}
      {anyAlert && (
        <div className={`mt-2 text-xs rounded-lg px-3 py-1.5 font-medium ${
          urgentAlert ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          🔔 {anyAlert.message_text || ALERT_LABELS[anyAlert.alert_type]}
        </div>
      )}

      {/* Progress bar (for pregnant sows) */}
      {progress !== null && ['pregnant','late_gestation','farrowing_ready','heat_check','mated'].includes(sow.current_status) && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>วันที่ {daysSinceMating} / 114</span>
            {daysToFarrow !== null && (
              <span>{daysToFarrow >= 0 ? `คลอดอีก ${daysToFarrow} วัน` : `เกินกำหนด ${Math.abs(daysToFarrow)} วัน`}</span>
            )}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                daysToFarrow !== null && daysToFarrow <= 7 ? 'bg-red-400' :
                daysToFarrow !== null && daysToFarrow <= 14 ? 'bg-amber-400' : 'bg-farm-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Nursing: show days since birth */}
      {sow.current_status === 'nursing' && cycle?.actual_farrowing_date && (
        <div className="mt-2 text-xs text-pink-600 font-medium">
          🐽 ลูก {differenceInDays(new Date(), new Date(cycle.actual_farrowing_date))} วัน
          {cycle.born_alive ? ` · ${cycle.born_alive} ตัว` : ''}
        </div>
      )}
    </div>
  )
}

const ALERT_LABELS = {
  heat_check_due:      'ตรวจสัด D21',
  ultrasound_due:      'ทำอัลตราซาวด์ D30',
  nutrition_start_due: 'เพิ่มอาหาร D85',
  farrowing_move_due:  'ย้ายเข้าคอกคลอด D108',
  farrowing_due:       'วันกำหนดคลอด!',
  weaning_due:         'หย่านม +21 วัน',
  rebreeding_due:      'ผสมรอบใหม่ +5 วัน',
}

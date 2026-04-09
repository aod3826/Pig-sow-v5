import { differenceInDays, format, parseISO, addDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

const fmtDate = (d) => d ? format(parseISO(d), 'd MMM yy', { locale: th }) : '—'
const today = () => new Date().toISOString().slice(0, 10)

function daysDiff(dateStr) {
  if (!dateStr) return null
  return differenceInDays(parseISO(dateStr), new Date())
}

export default function MilestoneTimeline({ cycle, sowId }) {
  const navigate = useNavigate()
  if (!cycle) return null

  const steps = buildSteps(cycle)

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <Step key={step.key} step={step} isLast={i === steps.length - 1}
          onAction={() => navigate(`/sows/${sowId}/record/${cycle.id}?step=${step.key}`)} />
      ))}
    </div>
  )
}

function Step({ step, isLast, onAction }) {
  const { done, active, future, skipped } = stepState(step)

  const dotColor = done    ? 'bg-farm-500'
                 : active  ? 'bg-amber-400'
                 : skipped ? 'bg-red-400'
                 : 'bg-gray-200'

  const cardBorder = active ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white'

  return (
    <div className="flex gap-3">
      {/* Left rail */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 ${dotColor}`}>
          {done ? '✓' : skipped ? '✗' : active ? '●' : '○'}
        </div>
        {!isLast && <div className={`w-0.5 flex-1 mt-1 min-h-[20px] ${done ? 'bg-farm-300' : 'bg-gray-200'}`} />}
      </div>

      {/* Content */}
      <div className={`flex-1 mb-3 rounded-xl border p-3 ${cardBorder}`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-semibold text-gray-800">{step.title}</span>
            <span className="text-xs text-gray-400 ml-2">{step.dayLabel}</span>
          </div>
          {step.dueDate && (
            <DateChip dueDate={step.dueDate} done={done} />
          )}
        </div>

        <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>

        {/* Result display */}
        {step.result && (
          <div className={`mt-1.5 text-xs font-medium px-2 py-0.5 rounded-md inline-block ${
            step.resultOk ? 'bg-farm-100 text-farm-700' : 'bg-red-100 text-red-600'
          }`}>
            {step.result}
          </div>
        )}

        {/* Action button */}
        {active && (
          <button
            onClick={onAction}
            className="mt-2 w-full bg-farm-600 hover:bg-farm-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {step.actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function DateChip({ dueDate, done }) {
  const diff = daysDiff(dueDate)
  if (done) return <span className="text-xs text-farm-600 font-medium">✓</span>
  if (diff === null) return null
  const label = diff === 0 ? 'วันนี้!' : diff < 0 ? `เกิน ${Math.abs(diff)}วัน` : `อีก ${diff}วัน`
  const cls   = diff <= 0 ? 'text-red-500 font-bold' : diff <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-400'
  return <span className={`text-xs ${cls}`}>{label}</span>
}

function stepState(step) {
  return {
    done:    step.status === 'done',
    active:  step.status === 'active',
    skipped: step.status === 'skipped',
    future:  step.status === 'future',
  }
}

function buildSteps(c) {
  const todayStr = today()
  const steps = []

  // D0 Mating
  steps.push({
    key: 'mating', title: 'ผสมพันธุ์', dayLabel: 'D0',
    desc: `วันผสม: ${fmtDate(c.mating_date)}`,
    dueDate: c.mating_date,
    status: 'done',
    result: null, resultOk: true,
    actionLabel: null,
  })

  // D21 Heat check
  const hcDone = !!c.heat_check_result
  steps.push({
    key: 'heat_check', title: 'ตรวจสัด', dayLabel: 'D21',
    desc: 'ตรวจว่าแม่หมูกลับสัดหรือไม่',
    dueDate: c.due_heat_check_date,
    status: hcDone ? (c.heat_check_result === 'returned' ? 'skipped' : 'done')
                   : c.due_heat_check_date <= todayStr ? 'active' : 'future',
    result: c.heat_check_result === 'no_return' ? 'ไม่พบการกลับสัด'
          : c.heat_check_result === 'returned'  ? 'กลับสัด / ไม่ติด'
          : null,
    resultOk: c.heat_check_result === 'no_return',
    actionLabel: 'บันทึกผลตรวจสัด',
  })

  if (c.heat_check_result === 'returned') return steps // cycle failed

  // D30 Ultrasound
  const usDone = !!c.ultrasound_result
  steps.push({
    key: 'ultrasound', title: 'อัลตราซาวด์', dayLabel: 'D30',
    desc: 'ทำ Ultrasound ตรวจยืนยันการตั้งท้อง',
    dueDate: c.due_ultrasound_date,
    status: usDone ? (c.ultrasound_result === 'negative' ? 'skipped' : 'done')
                   : c.due_ultrasound_date <= todayStr ? 'active' : 'future',
    result: c.ultrasound_result === 'confirmed' ? `ยืนยันตั้งท้อง${c.embryo_count ? ` (${c.embryo_count} ตัวอ่อน)` : ''}`
          : c.ultrasound_result === 'negative'  ? 'ไม่ท้อง / แท้ง'
          : null,
    resultOk: c.ultrasound_result === 'confirmed',
    actionLabel: 'บันทึกผล Ultrasound',
  })

  if (c.ultrasound_result === 'negative') return steps

  // D85 Nutrition
  const nutDone = !!c.nutrition_started_date
  steps.push({
    key: 'nutrition', title: 'บำรุงอาหาร', dayLabel: 'D85',
    desc: 'เพิ่มปริมาณอาหารระยะท้าย',
    dueDate: c.due_nutrition_date,
    status: nutDone ? 'done' : c.due_nutrition_date <= todayStr ? 'active' : 'future',
    result: nutDone ? `เริ่มเมื่อ ${fmtDate(c.nutrition_started_date)}` : null,
    resultOk: true,
    actionLabel: 'บันทึกเริ่มบำรุง',
  })

  // D108 Move to farrowing pen
  const moveDone = !!c.moved_to_farrowing_date
  steps.push({
    key: 'pen_move', title: 'ย้ายคอกคลอด', dayLabel: 'D108',
    desc: 'ย้ายแม่หมูเข้าคอกคลอดเพื่อความสะอาด',
    dueDate: c.due_farrowing_move,
    status: moveDone ? 'done' : c.due_farrowing_move <= todayStr ? 'active' : 'future',
    result: moveDone ? `ย้ายเมื่อ ${fmtDate(c.moved_to_farrowing_date)}` : null,
    resultOk: true,
    actionLabel: 'บันทึกการย้าย',
  })

  // D114 Farrowing
  const farrowDone = !!c.actual_farrowing_date
  steps.push({
    key: 'farrowing', title: 'วันคลอด', dayLabel: 'D114',
    desc: 'บันทึกผลการคลอดจริง',
    dueDate: c.due_farrowing_date,
    status: farrowDone ? 'done' : c.due_farrowing_date <= todayStr ? 'active' : 'future',
    result: farrowDone
      ? `คลอด ${c.born_alive} ตัว (ตาย ${c.born_dead||0} / มัมมี่ ${c.mummified||0})`
      : null,
    resultOk: true,
    actionLabel: 'บันทึกการคลอด 🐽',
  })

  if (!farrowDone) return steps

  // Nursing / Weaning (+21)
  const weanDone = !!c.actual_weaning_date
  steps.push({
    key: 'weaning', title: 'หย่านม', dayLabel: '+21 วัน',
    desc: 'ลูกหมูอายุ 21 วัน พร้อมหย่านม',
    dueDate: c.due_weaning_date,
    status: weanDone ? 'done' : c.due_weaning_date <= todayStr ? 'active' : 'future',
    result: weanDone ? `หย่านม ${c.weaned_count} ตัว` : null,
    resultOk: true,
    actionLabel: 'บันทึกการหย่านม',
  })

  // Rebreeding (+5)
  if (weanDone) {
    steps.push({
      key: 'rebreeding', title: 'ผสมรอบใหม่', dayLabel: '+5 วัน',
      desc: 'แม่หมูพร้อมสำหรับการผสมรอบใหม่',
      dueDate: c.due_rebreeding_date,
      status: c.due_rebreeding_date <= todayStr ? 'active' : 'future',
      result: null, resultOk: true,
      actionLabel: 'บันทึกการผสมรอบใหม่',
    })
  }

  return steps
}
